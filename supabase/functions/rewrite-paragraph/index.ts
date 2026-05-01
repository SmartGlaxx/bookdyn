import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// ── Security Config ──
const MAX_PAYLOAD_BYTES = 50_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wafCheck(req: Request): string | null {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const blocked = ["sqlmap", "nikto", "nessus", "masscan", "zgrab"];
  for (const b of blocked) { if (ua.includes(b)) return `Blocked: ${b}`; }
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
  return patterns.some(p => p.test(text));
}

function validateInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.paragraph || typeof body.paragraph !== "string") return "Missing paragraph";
  if (body.paragraph.length > 10000) return "Paragraph too long";
  if (body.bookTitle && typeof body.bookTitle === "string" && body.bookTitle.length > 500) return "Book title too long";
  if (body.fullContent && typeof body.fullContent === "string" && body.fullContent.length > 20000) return "Full content too long";
  // Check for prompt injection in user-editable fields
  const fieldsToCheck = [body.paragraph, body.bookTitle, body.chapterTitle, body.subsectionTitle, body.subsectionGoal].filter(Boolean);
  for (const f of fieldsToCheck) {
    if (typeof f === "string" && detectPromptInjection(f)) return "Input contains prohibited patterns";
  }
  if (body.guidedAction && !["continue", "rewrite", "improve", "dialogue"].includes(body.guidedAction)) return "Invalid guided action";
  return null;
}

function getGuidedPrompt(action: string, paragraph: string, bookTitle: string, chapterTitle: string, subsectionTitle: string, fullContent?: string, subsectionGoal?: string): string {
  const context = `Book: "${bookTitle}", Chapter: "${chapterTitle}", Section: "${subsectionTitle}"${subsectionGoal ? `, Goal: ${subsectionGoal}` : ""}.`;

  switch (action) {
    case "continue":
      return `You are a master writer helping continue a story/text.

${context}

Here is the current content so far:
---
${(fullContent || paragraph).slice(-2000)}
---

Write the next 2–3 sentences ONLY. Continue naturally from where the text left off. Match the existing tone, style, and pacing. Do NOT repeat anything already written. Return ONLY the new sentences, nothing else.`;

    case "rewrite":
      return `You are a professional editor.

${context}

Rewrite the following sentence/paragraph with better prose quality. Keep the same meaning and tone. Return ONLY the rewritten text (2–3 sentences max), nothing else.

Text to rewrite:
${paragraph}`;

    case "improve":
      return `You are a prose stylist.

${context}

Improve the following text. Enhance vocabulary, sentence rhythm, and clarity while preserving the original meaning. Return ONLY the improved text (2–3 sentences max), nothing else.

Text to improve:
${paragraph}`;

    case "dialogue":
      return `You are a dialogue specialist.

${context}

Based on the current content:
---
${(fullContent || paragraph).slice(-1500)}
---

Write 1–2 lines of natural dialogue that advance the scene. Include character attribution. Match the established tone. Return ONLY the dialogue lines, nothing else.`;

    default:
      return `You are a professional editor. Rewrite the given paragraph while maintaining the same meaning, tone, and context. Keep it natural and flowing within the chapter "${chapterTitle}", section "${subsectionTitle}" of the book "${bookTitle}". Improve prose quality, vary sentence structure, and use richer vocabulary. Return ONLY the rewritten paragraph text, nothing else. No quotes, no labels, no explanation.`;
  }
}

async function checkRateLimit(userId: string, functionName: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.rpc("check_rate_limit", { _user_id: userId, _function_name: functionName, _max_per_hour: 60, _max_per_day: 500 });
  return data as boolean ?? true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // WAF check
    const wafResult = wafCheck(req);
    if (wafResult) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Payload size check
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    let userId: string;
    try {
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) {
        const { data: ud, error: ue } = await supabase.auth.getUser(token);
        if (ue || !ud?.user) throw new Error("Auth failed");
        userId = ud.user.id;
      } else {
        userId = data.claims.sub as string;
      }
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    const allowed = await checkRateLimit(userId, "rewrite-paragraph");
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();

    // Input validation
    const validationError = validateInput(body);
    if (validationError) return new Response(JSON.stringify({ error: validationError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { paragraph, bookTitle, chapterTitle, subsectionTitle, guidedAction, fullContent, subsectionGoal, language } = body;
    const outputLanguage = (typeof language === "string" && language.trim()) ? language.trim() : "English";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const languageRule = `\n\nOUTPUT LANGUAGE — ABSOLUTE, NON-NEGOTIABLE RULE:\n- Write 100% of your response in ${outputLanguage}. Every word — narration, dialogue, thought — must be in ${outputLanguage}.\n- Do NOT mix in English (or any other language) unless the requested language is English.\n- Use natural idioms, syntax, and punctuation native to ${outputLanguage}. This rule overrides every other rule.`;
    const formatBanRule = languageRule + "\n\nFORMAT & WORD BAN RULES (STRICTLY ENFORCED):\n- NEVER use markdown formatting such as **, *, ##, or any markdown syntax. Write in plain prose only.\n- NEVER use the word \"magic\" or \"magical\". Use alternatives like \"enchantment\", \"sorcery\", \"extraordinary\", \"remarkable\", \"uncanny\".\n- Do not use asterisks for emphasis.";

    const systemPrompt = guidedAction
      ? getGuidedPrompt(guidedAction, paragraph, bookTitle || "", chapterTitle || "", subsectionTitle || "", fullContent, subsectionGoal) + formatBanRule
      : `You are a professional editor. Rewrite the given paragraph while maintaining the same meaning, tone, and context. Keep it natural and flowing within the chapter "${chapterTitle || ""}", section "${subsectionTitle || ""}" of the book "${bookTitle || ""}". Improve prose quality, vary sentence structure, and use richer vocabulary. Return ONLY the rewritten paragraph text, nothing else. No quotes, no labels, no explanation.${formatBanRule}`;

    const userMessage = guidedAction ? "Execute the instruction above." : paragraph;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("[rewrite-paragraph] AI error:", response.status, errText);
      throw new Error("AI request failed");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("No content returned from AI");

    return new Response(JSON.stringify({ content, rewritten: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[rewrite-paragraph] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
