import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_PAYLOAD_BYTES = 200_000;
const MAX_SECTION_TEXT = 30_000;

type LedgerEntry = {
  id: string;
  name: string;
  aliases?: string[];
  identity: string[];
  relationships: string[];
  keyStatements: string[];
  history: string[];
  lastSectionActivity: string[] | "N/A";
  lastSeenChapterIndex?: number;
  lastSeenSubsectionIndex?: number;
};

type CharLedger = { characters: LedgerEntry[] };
type PlotTodo = {
  id: string;
  text: string;
  introducedChapter: number;
  introducedSubsection: number;
  assignedChapter?: number;
  assignedSubsection?: number;
};
type PlotDone = {
  id: string;
  text: string;
  introducedChapter: number;
  introducedSubsection: number;
  completedChapter: number;
  completedSubsection: number;
};
type PlotLedger = { todos: PlotTodo[]; dones: PlotDone[] };

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      const { data: u, error: ue } = await supabase.auth.getUser(token);
      if (ue || !u?.user) return null;
      return { user: { id: u.user.id }, supabase };
    }
    return { user: { id: data.claims.sub as string }, supabase };
  } catch {
    return null;
  }
}

function buildExtractionPrompt(args: {
  sectionText: string;
  chapterIndex: number;
  subsectionIndex: number;
  chapterTitle: string;
  subsectionTitle: string;
  knownCharacters: { name: string; aliases?: string[] }[];
  openTodos: PlotTodo[];
}) {
  const known = args.knownCharacters
    .map((c) =>
      `- ${c.name}${c.aliases && c.aliases.length ? ` (aliases: ${c.aliases.join(", ")})` : ""}`,
    )
    .join("\n") || "(none yet)";
  const todos = args.openTodos
    .map((t) => `- [${t.id}] ${t.text}`)
    .join("\n") || "(none open)";

  return `You are a strict continuity director for a book. Read the section below and output ONLY a JSON object describing what changed for character continuity and plot threads. No prose.

POSITION: Chapter ${args.chapterIndex + 1} ("${args.chapterTitle}"), Subsection ${args.subsectionIndex + 1} ("${args.subsectionTitle}").

KNOWN CHARACTERS (use existing names exactly when matching):
${known}

OPEN PLOT TODOS (decide which are clearly resolved by THIS section):
${todos}

SECTION TEXT:
---
${args.sectionText}
---

Respond with a single JSON object matching this TypeScript type — no markdown, no commentary:
{
  "characterUpdates": [
    {
      "name": string,                  // existing character name (must match KNOWN list when possible)
      "lastSectionActivity": string[], // 3-12 detailed bullets of what they did this section
      "newIdentity": string[],         // additional identity facts revealed (age, job, traits)
      "newRelationships": string[],    // new/changed relationships, allegiances, oppositions — note shifts explicitly
      "newKeyStatements": string[],    // notable lines they spoke, with whom said to
      "newHistory": string[]           // append-only history bullets — each MUST end with " [ch:${args.chapterIndex + 1} s:${args.subsectionIndex + 1}]"
    }
  ],
  "newCharacters": [
    {
      "name": string,
      "aliases": string[],
      "identity": string[],
      "relationships": string[],
      "keyStatements": string[],
      "history": string[]              // each MUST end with " [ch:${args.chapterIndex + 1} s:${args.subsectionIndex + 1}]"
    }
  ],
  "plotUpdates": {
    "newTodos": [ { "text": string } ],          // unresolved threads introduced this section
    "completedTodoIds": string[]                  // ids from OPEN PLOT TODOS that were CLEARLY resolved
  }
}

Rules:
- Only include characters that actually appear in the section text.
- Be detailed but factual — no invention beyond what the text states or strongly implies.
- A todo is "completed" only if the narrative shows clear resolution; if still in preparation, do NOT include it in completedTodoIds.
- Use existing character names verbatim. Do not rename.`;
}

async function callAI(prompt: string): Promise<string> {
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (DEEPSEEK_API_KEY) {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You output strict JSON only. No prose." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });
    if (r.ok) {
      const j = await r.json();
      return j.choices?.[0]?.message?.content || "{}";
    }
    console.warn("[update-continuity] DeepSeek failed, falling back:", r.status);
  }

  if (!LOVABLE_API_KEY) throw new Error("No AI API key configured");

  const r2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You output strict JSON only. No prose." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r2.ok) throw new Error(`Lovable AI error: ${r2.status}`);
  const j2 = await r2.json();
  return j2.choices?.[0]?.message?.content || "{}";
}

function safeArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, 50);
}

function mergeCharacterLedger(
  current: CharLedger,
  updates: any,
  chapterIndex: number,
  subsectionIndex: number,
): CharLedger {
  const byName = new Map<string, LedgerEntry>();
  for (const c of current.characters || []) {
    byName.set(c.name.toLowerCase(), c);
  }

  // existing character updates
  for (const u of (updates.characterUpdates as any[]) || []) {
    if (!u?.name || typeof u.name !== "string") continue;
    const key = u.name.toLowerCase();
    let entry = byName.get(key);
    if (!entry) {
      // Treat as new character if not matched
      entry = {
        id: slug(u.name) || crypto.randomUUID(),
        name: u.name,
        aliases: [],
        identity: [],
        relationships: [],
        keyStatements: [],
        history: [],
        lastSectionActivity: "N/A",
      };
      byName.set(key, entry);
    }
    entry.identity = [...entry.identity, ...safeArr(u.newIdentity)];
    entry.relationships = [...entry.relationships, ...safeArr(u.newRelationships)];
    entry.keyStatements = [...entry.keyStatements, ...safeArr(u.newKeyStatements)];
    entry.history = [...entry.history, ...safeArr(u.newHistory)];
    const lsa = safeArr(u.lastSectionActivity);
    entry.lastSectionActivity = lsa.length > 0 ? lsa : "N/A";
    entry.lastSeenChapterIndex = chapterIndex;
    entry.lastSeenSubsectionIndex = subsectionIndex;
  }

  // brand new characters
  for (const n of (updates.newCharacters as any[]) || []) {
    if (!n?.name || typeof n.name !== "string") continue;
    const key = n.name.toLowerCase();
    if (byName.has(key)) continue;
    byName.set(key, {
      id: slug(n.name) || crypto.randomUUID(),
      name: n.name,
      aliases: safeArr(n.aliases),
      identity: safeArr(n.identity),
      relationships: safeArr(n.relationships),
      keyStatements: safeArr(n.keyStatements),
      history: safeArr(n.history),
      lastSectionActivity: safeArr(n.history).slice(0, 6),
      lastSeenChapterIndex: chapterIndex,
      lastSeenSubsectionIndex: subsectionIndex,
    });
  }

  // For characters NOT updated this section: mark lastSectionActivity = "N/A"
  const updatedNames = new Set<string>();
  for (const u of (updates.characterUpdates as any[]) || []) {
    if (u?.name) updatedNames.add(u.name.toLowerCase());
  }
  for (const n of (updates.newCharacters as any[]) || []) {
    if (n?.name) updatedNames.add(n.name.toLowerCase());
  }
  for (const [key, entry] of byName) {
    if (!updatedNames.has(key)) {
      entry.lastSectionActivity = "N/A";
    }
  }

  return { characters: Array.from(byName.values()) };
}

function mergePlotLedger(
  current: PlotLedger,
  updates: any,
  chapterIndex: number,
  subsectionIndex: number,
): PlotLedger {
  const todos = [...(current.todos || [])];
  const dones = [...(current.dones || [])];
  const completedIds = new Set<string>(
    (Array.isArray(updates?.plotUpdates?.completedTodoIds)
      ? updates.plotUpdates.completedTodoIds
      : []
    ).filter((x: unknown) => typeof x === "string"),
  );

  // Move completed todos to dones
  const remaining: PlotTodo[] = [];
  for (const t of todos) {
    if (completedIds.has(t.id)) {
      dones.push({
        id: t.id,
        text: t.text,
        introducedChapter: t.introducedChapter,
        introducedSubsection: t.introducedSubsection,
        completedChapter: chapterIndex,
        completedSubsection: subsectionIndex,
      });
    } else {
      remaining.push(t);
    }
  }

  // Add new todos
  const newTodos = Array.isArray(updates?.plotUpdates?.newTodos)
    ? updates.plotUpdates.newTodos
    : [];
  for (const nt of newTodos) {
    if (!nt?.text || typeof nt.text !== "string") continue;
    remaining.push({
      id: crypto.randomUUID(),
      text: nt.text.slice(0, 500),
      introducedChapter: chapterIndex,
      introducedSubsection: subsectionIndex,
    });
  }

  return { todos: remaining, dones };
}

function dedupeFinalize(plot: PlotLedger): PlotLedger {
  // Simple text-based dedupe (case-insensitive, trimmed)
  const seenDone = new Set<string>();
  const dones = plot.dones.filter((d) => {
    const key = d.text.toLowerCase().trim();
    if (seenDone.has(key)) return false;
    seenDone.add(key);
    return true;
  });
  const seenTodo = new Set<string>();
  const todos = plot.todos.filter((t) => {
    const key = t.text.toLowerCase().trim();
    if (seenDone.has(key) || seenTodo.has(key)) return false;
    seenTodo.add(key);
    return true;
  });
  return { todos, dones };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await getAuthUser(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      bookId,
      mode,
      sectionText,
      chapterIndex,
      subsectionIndex,
      chapterTitle,
      subsectionTitle,
    } = body || {};

    if (!bookId || typeof bookId !== "string") {
      return new Response(JSON.stringify({ error: "Missing bookId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: fetchErr } = await admin
      .from("books")
      .select("id, user_id, character_ledger, plot_ledger")
      .eq("id", bookId)
      .maybeSingle();

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentChar: CharLedger = (row.character_ledger as any) || { characters: [] };
    const currentPlot: PlotLedger = (row.plot_ledger as any) || { todos: [], dones: [] };

    if (mode === "finalize") {
      const finalized = dedupeFinalize(currentPlot);
      await admin
        .from("books")
        .update({ plot_ledger: finalized })
        .eq("id", bookId);
      return new Response(
        JSON.stringify({ characterLedger: currentChar, plotLedger: finalized }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "seed-todos") {
      const seedTexts: string[] = Array.isArray(body.todos) ? body.todos : [];
      const newTodos: PlotTodo[] = seedTexts
        .filter((t) => typeof t === "string" && t.trim().length > 0)
        .map((t, i) => ({
          id: crypto.randomUUID(),
          text: t.slice(0, 500),
          introducedChapter: 0,
          introducedSubsection: 0,
          assignedChapter: typeof body.assignments?.[i]?.chapter === "number" ? body.assignments[i].chapter : undefined,
          assignedSubsection: typeof body.assignments?.[i]?.subsection === "number" ? body.assignments[i].subsection : undefined,
        }));
      const merged: PlotLedger = { todos: [...currentPlot.todos, ...newTodos], dones: currentPlot.dones };
      await admin.from("books").update({ plot_ledger: merged }).eq("id", bookId);
      return new Response(
        JSON.stringify({ characterLedger: currentChar, plotLedger: merged }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Default mode: extract from section text
    if (
      typeof sectionText !== "string" ||
      sectionText.trim().length < 50 ||
      typeof chapterIndex !== "number" ||
      typeof subsectionIndex !== "number"
    ) {
      return new Response(
        JSON.stringify({ error: "Missing sectionText / indices" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmed = sectionText.slice(0, MAX_SECTION_TEXT);
    const prompt = buildExtractionPrompt({
      sectionText: trimmed,
      chapterIndex,
      subsectionIndex,
      chapterTitle: chapterTitle || `Chapter ${chapterIndex + 1}`,
      subsectionTitle: subsectionTitle || `Section ${subsectionIndex + 1}`,
      knownCharacters: currentChar.characters.map((c) => ({ name: c.name, aliases: c.aliases })),
      openTodos: currentPlot.todos,
    });

    let parsed: any = {};
    try {
      const raw = await callAI(prompt);
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("[update-continuity] AI/parse error:", e);
      // Soft-fail: return current ledgers unchanged
      return new Response(
        JSON.stringify({ characterLedger: currentChar, plotLedger: currentPlot, warning: "extraction-failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nextChar = mergeCharacterLedger(currentChar, parsed, chapterIndex, subsectionIndex);
    const nextPlot = mergePlotLedger(currentPlot, parsed, chapterIndex, subsectionIndex);

    await admin
      .from("books")
      .update({ character_ledger: nextChar, plot_ledger: nextPlot })
      .eq("id", bookId);

    return new Response(
      JSON.stringify({ characterLedger: nextChar, plotLedger: nextPlot }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("update-continuity error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});