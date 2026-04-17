import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// Silent post-chapter repetition audit + rewrite cycle (DeepSeek reasoner).
// Compares the just-finished chapter against itself and the last 2 chapters,
// detects 4+-word repeats, repeated similes/metaphors, repeated adverb+verb
// pairs and dialogue-tag repeats, then rewrites the chapter to eliminate them.
// Returns the cleaned chapter. If 3+ irreplaceable repeats remain, the function
// flags `needsManualReview = true` so the client can prompt the user.

const MAX_PAYLOAD_BYTES = 400_000; // chapters can be larger than a single subsection
const MAX_CHAPTER_CHARS = 60_000;  // ~10k words safety cap

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return { user: { id: u.user.id, email: u.user.email || "" } };
    }
    return { user: { id: data.claims.sub as string, email: data.claims.email as string } };
  } catch {
    return null;
  }
}

async function checkRateLimit(userId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await supabase.rpc("check_rate_limit", {
    _user_id: userId,
    _function_name: "audit-rewrite-chapter",
    _max_per_hour: 30,
    _max_per_day: 200,
  });
  return data as boolean ?? true;
}

function clamp(text: string, max: number): string {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const allowed = await checkRateLimit(auth.user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const chapterText: string = clamp(String(body?.chapterText ?? ""), MAX_CHAPTER_CHARS);
    const previousChapters: string[] = Array.isArray(body?.previousChapters)
      ? body.previousChapters.map((c: unknown) => clamp(String(c ?? ""), MAX_CHAPTER_CHARS)).slice(-2)
      : [];
    const bookTitle: string = String(body?.bookTitle ?? "Untitled");
    const isScreenplay: boolean = !!body?.isScreenplay;

    if (!chapterText || chapterText.trim().length < 200) {
      return new Response(
        JSON.stringify({ rewrittenChapter: chapterText, needsManualReview: false, repeats: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!DEEPSEEK_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No AI API key configured");
    }

    const systemPrompt = `You are a meticulous literary editor performing a silent repetition audit on a chapter from the book "${bookTitle}".

Your job has TWO phases:

PHASE 1 — REPETITION AUDIT (internal, do not show the user):
Compare the CURRENT CHAPTER against itself and against the PREVIOUS CHAPTERS provided. Find:
- Any identical phrase of 4 or more consecutive words.
- Any unique imagery, simile, or metaphor used more than once (e.g., "the rain had fingers").
- Any adverb+verb pair repeated (e.g., "walked slowly", "smiled wearily").
- Any dialogue tag repeated within 10 exchanges (e.g., "he said" three times in a row).
- Any rare or signature adjective reused.
- Any descriptive sentence structure repeated.

PHASE 2 — SILENT REWRITE:
Rewrite the CURRENT CHAPTER to eliminate every repetition you found, while:
- Preserving plot, characters, beats, dialogue meaning, tone, POV, and pacing exactly.
- Keeping the same approximate length (within 5%).
- Maintaining lyrical flow, varied sentence lengths, sensory rhythm, and natural cadence.
- Using fresh, fitting alternatives — never bland substitutions.
- ${isScreenplay ? "Preserving strict screenplay formatting (scene headings, character names, parentheticals, action lines)." : "Keeping plain prose with no markdown."}

CRITICAL OUTPUT RULES:
- Return STRICT JSON only, no prose before or after, no markdown code fences.
- Schema: { "rewrittenChapter": string, "needsManualReview": boolean, "irreplaceableRepeats": string[] }
- "rewrittenChapter" must contain the FULL clean chapter text.
- Set "needsManualReview" to true ONLY if 3 or more repetitions are genuinely irreplaceable without breaking plot or meaning. Otherwise false.
- "irreplaceableRepeats" lists only those flagged for the user (empty if needsManualReview is false).
- NEVER include the audit report itself in the output. The user must only see the final clean chapter.
- NEVER use the words "magic" or "magical".`;

    const previousBlock = previousChapters.length
      ? previousChapters
          .map((c, i) => `--- PREVIOUS CHAPTER ${previousChapters.length - i} ---\n${c}`)
          .join("\n\n")
      : "(no previous chapters)";

    const userPrompt = `PREVIOUS CHAPTERS (for repetition comparison only — do not rewrite these):
${previousBlock}

--- CURRENT CHAPTER (to be audited and rewritten) ---
${chapterText}

Run the audit, then return the rewritten chapter as JSON per the schema. Output JSON only.`;

    let aiResponse: Response;
    if (DEEPSEEK_API_KEY) {
      console.log("[audit-rewrite-chapter] Using DeepSeek reasoner");
      aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          response_format: { type: "json_object" },
        }),
      });
    } else {
      console.log("[audit-rewrite-chapter] Using Lovable AI fallback");
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[audit-rewrite-chapter] AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ rewrittenChapter: chapterText, needsManualReview: false, repeats: [], skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await aiResponse.json();
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: { rewrittenChapter?: string; needsManualReview?: boolean; irreplaceableRepeats?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
      }
    }

    const rewritten = (parsed.rewrittenChapter && parsed.rewrittenChapter.trim().length > 200)
      ? parsed.rewrittenChapter
      : chapterText;

    return new Response(
      JSON.stringify({
        rewrittenChapter: rewritten,
        needsManualReview: !!parsed.needsManualReview,
        repeats: Array.isArray(parsed.irreplaceableRepeats) ? parsed.irreplaceableRepeats : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("audit-rewrite-chapter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
