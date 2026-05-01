import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const MAX_PAYLOAD_BYTES = 200_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wafCheck(req: Request): string | null {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const blocked = ["sqlmap", "nikto", "nessus", "masscan", "zgrab"];
  for (const b of blocked) if (ua.includes(b)) return `Blocked user-agent: ${b}`;
  return null;
}

function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /forget\s+(everything|all|your)\s/i,
    /override\s+(your|the)\s+/i,
    /act\s+as\s+(if|a|an)\s+/i,
  ];
  return patterns.some((p) => p.test(text));
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
      const { data: u, error: e } = await supabase.auth.getUser(token);
      if (e || !u?.user) return null;
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
    _function_name: "generate-intro",
    _max_per_hour: 10,
    _max_per_day: 30,
  });
  return data !== false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const waf = wafCheck(req);
    if (waf) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const len = parseInt(req.headers.get("content-length") || "0");
    if (len > MAX_PAYLOAD_BYTES) {
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

    if (!(await checkRateLimit(auth.user.id))) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { book } = body;
    if (!book || typeof book !== "object") {
      return new Response(JSON.stringify({ error: "Missing book" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      detectPromptInjection(book.title || "") ||
      detectPromptInjection(book.theme || "")
    ) {
      return new Response(JSON.stringify({ error: "Input contains prohibited patterns" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a high-tension excerpt: scan completed subsections for the longest scene
    // and lift a 250-word window from somewhere in the middle/end of the book.
    const chapters = book.outline?.chapters || [];
    const completed = chapters.flatMap((c: any) =>
      (c.subsections || []).filter((s: any) => s.status === "completed" && s.content),
    );
    if (completed.length === 0) {
      return new Response(JSON.stringify({ error: "Book has no completed content yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a section from the middle-to-late portion for maximum tension
    const sourceIdx = Math.floor(completed.length * 0.6);
    const source: string = completed[sourceIdx].content as string;
    const sourceExcerpt = source.length > 4000 ? source.slice(0, 4000) : source;

    const introLanguage = book.language || "English";
    const systemPrompt = `You are a master writer crafting a teaser intro for a finished ${book.bookType}.
Your job: write a single short cliffhanger snippet (150–220 words) that will be placed BEFORE chapter 1 to hook the reader and force them to keep reading.

OUTPUT LANGUAGE — ABSOLUTE, NON-NEGOTIABLE RULE:
- Write 100% of the snippet in ${introLanguage}. Every word — narration, dialogue, thought, sound — must be in ${introLanguage}.
- Do NOT mix in English (or any other language) unless the requested language is English.
- Use natural idioms, syntax, and punctuation native to ${introLanguage}. This rule overrides every other rule below.

CRITICAL RULES:
- Lift the energy and voice from the supplied excerpt — this snippet must feel like it belongs to this exact book.
- Write in plain prose. No markdown. No headers. No labels. No "Prologue:" or "Intro:" tag.
- End on a true cliffhanger — a question, a sudden cut, an implied threat, an unresolved beat. The reader must NEED the next line.
- Reveal nothing that spoils the ending; pick a moment of maximum tension or intrigue.
- Use vivid sensory language. James Hadley Chase / Lee Child level of cinematic concision.
- Never use the word "magic" or "magical".
- Output ONLY the snippet text. No quotes, no preamble, no postscript.`;

    const userPrompt = `BOOK CONTEXT:
- Title: "${book.title}"
- Theme: ${book.theme}
- Tone: ${book.toneProfile?.primary || "conversational"}
- POV: ${book.pov}

EXCERPT FROM A KEY SCENE (use as voice/tone reference, do not copy):
---
${sourceExcerpt}
---

Now write the 150–220 word cliffhanger intro snippet.`;

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let resp: Response;
    if (DEEPSEEK_API_KEY) {
      resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });
    } else if (LOVABLE_API_KEY) {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        }),
      });
    } else {
      throw new Error("No AI key configured");
    }

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI error: ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const intro = (data.choices?.[0]?.message?.content || "").trim();
    if (!intro) throw new Error("Empty intro");

    return new Response(JSON.stringify({ intro }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-intro error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
