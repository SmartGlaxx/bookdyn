// suggest-canvas — Socratic AI helper for the Story Canvas (Module 1).
// The ONLY supported mode is `guiding_questions`: returns 3 short questions
// referencing the user's title, genre, and existing bullets. Never returns
// story/plot/title/prose content. Hard server-side cap: 3 requests per book.
// verify_jwt = false; auth headers validated in code; ownership enforced.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = [
  "https://authoryti.com",
  "https://authoryti.lovable.app",
  "https://app.authoryti.com",
  "https://bookdyn.lovable.app",
  "https://id-preview--50948d4c-97c6-4338-a33a-59e9cf03b7c0.lovable.app",
  "http://localhost:5173",
];

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow =
    ALLOWED_ORIGINS.includes(origin) || /\.lovable\.(app|dev|project)/.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

type Category = "plot" | "character" | "world";

interface GuidingBody {
  mode: "guiding_questions";
  bookId?: string;
  category: Category;
  context?: {
    title?: string;
    genre?: string;
    tone?: string;
    historicalEra?: string;
    bullets?: string[];
    chapterTitles?: string[];
    chapterPlot?: string;
    scenes?: string[];
    focusChapterTitle?: string;
  };
}

interface NameBody {
  mode: "name_suggestions";
  kind: "character" | "location";
  title?: string;
  genre?: string;
  // character fields
  gender?: string;
  age?: string;
  nationality?: string;
  personality?: string;
  convey?: string;
  // location fields
  region?: string;
  climate?: string;
  culture?: string;
  size?: string;
  vibe?: string;
}

type Body = GuidingBody | NameBody;

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  const auth = req.headers.get("authorization");
  const apikey = req.headers.get("apikey");
  if (!auth || !apikey) return json({ error: "Missing auth" }, 401, headers);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, headers);
  }

  if (body?.mode !== "guiding_questions" && body?.mode !== "name_suggestions") {
    return json({ error: "Unsupported mode" }, 400, headers);
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "AI gateway unavailable" }, 503, headers);

  // ===== name_suggestions: not capped, no DB writes =====
  if (body.mode === "name_suggestions") {
    if (body.kind !== "character" && body.kind !== "location") {
      return json({ error: "Invalid kind" }, 400, headers);
    }
    const prompt =
      body.kind === "character"
        ? [
            `You are a naming assistant. Suggest 12 distinctive ${body.nationality || "culturally appropriate"} character names.`,
            `Book: ${body.title || "(untitled)"} (${body.genre || "unspecified genre"}).`,
            body.gender ? `Gender: ${body.gender}.` : "",
            body.age ? `Age: ${body.age}.` : "",
            body.personality ? `Personality: ${body.personality}.` : "",
            body.convey ? `Name should convey: ${body.convey}.` : "",
            `Mix common and uncommon. Return ONLY JSON: {"names":["Name1","Name2", ...]} — full names only, no commentary.`,
          ].filter(Boolean).join("\n")
        : [
            `You are a naming assistant. Suggest 12 evocative place / city / town names.`,
            `Book: ${body.title || "(untitled)"} (${body.genre || "unspecified genre"}).`,
            body.region ? `Region: ${body.region}.` : "",
            body.climate ? `Climate: ${body.climate}.` : "",
            body.culture ? `Culture: ${body.culture}.` : "",
            body.size ? `Size: ${body.size}.` : "",
            body.vibe ? `Vibe: ${body.vibe}.` : "",
            `Mix grounded and inventive. Return ONLY JSON: {"names":["Name1", ...]} — place names only.`,
          ].filter(Boolean).join("\n");
    try {
      const text = await callGateway(key, prompt);
      const names = parseStringArray(text, "names")
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && n.length < 60)
        .slice(0, 12);
      if (!names.length) throw new Error("AI did not return names");
      return json({ names }, 200, headers);
    } catch (err) {
      console.error("name_suggestions error", err);
      return json({ error: err instanceof Error ? err.message : "AI request failed" }, 500, headers);
    }
  }

  // ===== guiding_questions (existing) =====
  if (!body.category || !["plot", "character", "world"].includes(body.category)) {
    return json({ error: "Invalid category" }, 400, headers);
  }

  // Server-side cap: re-read books.canvas.aiAssistUsed under the caller's auth
  // (RLS ensures they own the book). Skip when bookId is missing (wizard pre-create).
  const SUPA_URL = Deno.env.get("SUPABASE_URL");
  const SUPA_ANON = Deno.env.get("SUPABASE_ANON_KEY");
  const userClient = SUPA_URL && SUPA_ANON
    ? createClient(SUPA_URL, SUPA_ANON, { global: { headers: { Authorization: auth } } })
    : null;

  let usedFromDb: number | null = null;
  if (body.bookId && userClient) {
    const { data, error } = await userClient
      .from("books")
      .select("canvas")
      .eq("id", body.bookId)
      .maybeSingle();
    if (error) return json({ error: "Forbidden or not found" }, 403, headers);
    const canvas = (data?.canvas ?? {}) as { aiAssistUsed?: number };
    usedFromDb = typeof canvas.aiAssistUsed === "number" ? canvas.aiAssistUsed : 0;
    if (usedFromDb >= 3) {
      return json(
        { error: "AI guidance limit reached (3/3 used for this book).", remaining: 0 },
        429,
        headers,
      );
    }
  }

  const ctx = body.context ?? {};
  const bullets = (ctx.bullets ?? []).slice(0, 12);
  const categoryLabel =
    body.category === "plot" ? "plot direction"
    : body.category === "character" ? "character arc"
    : "worldbuilding";
  const wantsPhrases = body.category === "character" || body.category === "world";
  const phraseHint =
    body.category === "character"
      ? `Also propose 4–8 short 2–3 word arc labels (e.g. "Hidden guilt", "Rising courage", "Broken loyalty"). Labels only — no sentences, no full character names.`
      : `Also propose 4–8 short 2–3 word world-element labels (e.g. "Desert outpost", "Sacred grove", "Salt market"). Labels only — no sentences.`;

  const prompt = [
    `You are a Socratic writing coach helping an author plan their book. You do NOT propose plot, characters, prose, titles, or any story content. You ONLY ask short, open-ended questions that spark the author's own thinking.`,
    ``,
    `Book Title: ${ctx.title || "(untitled)"}`,
    `Genre: ${ctx.genre || "(unspecified)"}`,
    ctx.tone ? `Tone: ${ctx.tone}` : "",
    ctx.historicalEra ? `Setting / Era: ${ctx.historicalEra}` : "",
    ctx.focusChapterTitle ? `Chapter in focus: ${ctx.focusChapterTitle}` : "",
    bullets.length
      ? `\nAuthor's existing story bullets:\n${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`
      : "",
    ctx.chapterTitles?.length
      ? `\nChapter titles so far:\n${ctx.chapterTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "",
    ctx.chapterPlot ? `\nChapter plot draft: ${ctx.chapterPlot}` : "",
    ctx.scenes?.length ? `\nScene titles: ${ctx.scenes.join(" \u00b7 ")}` : "",
    ``,
    `Generate EXACTLY 3 short, open-ended ${categoryLabel} questions. Each question MUST reference the title, genre, or one of the author's bullets/titles by name or number. Each question is one sentence, under 25 words. No preamble, no answers, no story content.`,
    wantsPhrases ? `\n${phraseHint}` : "",
    ``,
    wantsPhrases
      ? `Return ONLY valid JSON: {"questions":["...","...","..."],"phrases":["...","..."]}`
      : `Return ONLY valid JSON: {"questions":["...","...","..."]}`,
  ].filter(Boolean).join("\n");

  try {
    const text = await callGateway(key, prompt);
    const questions = parseStringArray(text, "questions")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (questions.length < 1) throw new Error("AI did not return questions");
    const phrases = wantsPhrases
      ? parseStringArray(text, "phrases")
          .map((p) => p.trim())
          .filter((p) => p.length > 0 && p.split(/\s+/).length <= 4)
          .slice(0, 8)
      : [];

    if (body.bookId && userClient && usedFromDb !== null) {
      const { data: row } = await userClient
        .from("books")
        .select("canvas")
        .eq("id", body.bookId)
        .maybeSingle();
      const current = (row?.canvas ?? {}) as Record<string, unknown>;
      const nextUsed = Math.min(3, (typeof current.aiAssistUsed === "number" ? current.aiAssistUsed : 0) + 1);
      const nextCanvas = { ...current, aiAssistUsed: nextUsed, updatedAt: new Date().toISOString() };
      await userClient.from("books").update({ canvas: nextCanvas }).eq("id", body.bookId);
      return json({ questions, phrases, remaining: 3 - nextUsed }, 200, headers);
    }

    return json({ questions, phrases, remaining: null }, 200, headers);
  } catch (err) {
    console.error("suggest-canvas error", err);
    const msg = err instanceof Error ? err.message : "AI request failed";
    return json({ error: msg }, 500, headers);
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function callGateway(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You only ask short open-ended questions. You never write story content. Respond ONLY with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (res.status === 429) throw new Error("AI rate limited — try again soon");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function parseStringArray(text: string, key: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    const arr = obj?.[key];
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
      } catch { /* ignore */ }
    }
  }
  return [];
}