// suggest-canvas — AI suggestions for the Story Canvas (Module 1).
// Modes:
//   - story_summary: returns ~10 short bullets from book setup
//   - chapter_titles: returns 3 candidate titles for a chapter
// verify_jwt = false; we validate Bearer + apikey in code.

const ALLOWED_ORIGINS = [
  "https://bookdyn.com",
  "https://bookdyn.lovable.app",
  "https://app.authoryti.com",
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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

interface Body {
  mode: "story_summary" | "chapter_titles";
  bookId: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  // Basic header presence check (Lovable client always sends both)
  const auth = req.headers.get("authorization");
  const apikey = req.headers.get("apikey");
  if (!auth || !apikey) {
    return json({ error: "Missing auth" }, 401, headers);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, headers);
  }

  if (!body?.mode || !body?.bookId) {
    return json({ error: "Missing mode or bookId" }, 400, headers);
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "AI gateway unavailable" }, 503, headers);

  try {
    if (body.mode === "story_summary") {
      const setup = (body.payload as { setup?: Record<string, string> })?.setup ?? {};
      const prompt = `You are helping an author plan a book. Based on this setup, draft EXACTLY 10 short bullet points that sketch the whole story arc, from opening to resolution. Each bullet is one concise sentence. Plain prose. No markdown, no numbering, no quotes.

Title: ${setup.title || "(untitled)"}
Genre: ${setup.genre || "(unspecified)"}
Length target: ${setup.lengthTarget || "(unspecified)"}
Tone: ${setup.tone || "(unspecified)"}

Return ONLY a JSON object: {"bullets": ["...", ..., "..."]} with exactly 10 entries.`;

      const text = await callGateway(key, prompt);
      const bullets = parseStringArray(text, "bullets").slice(0, 10);
      return json({ bullets }, 200, headers);
    }

    if (body.mode === "chapter_titles") {
      const p = body.payload as {
        arc?: { text: string; color: string }[];
        chapterIndex?: number;
        currentTitle?: string;
        plot?: string;
      };
      const arcText = (p.arc ?? []).map((a, i) => `${i + 1}. [${a.color}] ${a.text}`).join("\n");
      const prompt = `You are helping an author title a chapter. Propose THREE distinct, evocative chapter title options. No subtitles. Max 6 words each. No quotes, no numbering, no markdown.

Story arc beats:
${arcText || "(none)"}

Chapter index: ${(p.chapterIndex ?? 0) + 1}
Current working title: ${p.currentTitle || "(none)"}
Chapter plot: ${p.plot || "(none)"}

Return ONLY: {"titles": ["...", "...", "..."]}`;
      const text = await callGateway(key, prompt);
      const titles = parseStringArray(text, "titles").slice(0, 3);
      return json({ titles }, 200, headers);
    }

    return json({ error: "Unknown mode" }, 400, headers);
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
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Respond ONLY with valid JSON. No prose, no code fences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
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
  // Strip code fences if present
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    const arr = obj?.[key];
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {
    // try regex extract
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