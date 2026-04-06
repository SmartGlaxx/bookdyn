import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { paragraph, bookTitle, chapterTitle, subsectionTitle, guidedAction, fullContent, subsectionGoal } = body;

    if (!paragraph || typeof paragraph !== "string" || paragraph.length > 10000) {
      return new Response(JSON.stringify({ error: "Invalid paragraph" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formatBanRule = "\n\nFORMAT & WORD BAN RULES (STRICTLY ENFORCED):\n- NEVER use markdown formatting such as **, *, ##, or any markdown syntax. Write in plain prose only.\n- NEVER use the word \"magic\" or \"magical\". Use alternatives like \"enchantment\", \"sorcery\", \"extraordinary\", \"remarkable\", \"uncanny\".\n- Do not use asterisks for emphasis.";

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
      const errText = await response.text();
      console.error("[rewrite-paragraph] AI error:", response.status, errText);
      throw new Error("AI request failed");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("No content returned from AI");

    // For guided actions, return as "rewritten" field for compatibility
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
