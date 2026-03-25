import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    const { paragraph, bookTitle, chapterTitle, subsectionTitle } = body;

    if (!paragraph || typeof paragraph !== "string" || paragraph.length > 10000) {
      return new Response(JSON.stringify({ error: "Invalid paragraph" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional editor. Rewrite the given paragraph while maintaining the same meaning, tone, and context. Keep it natural and flowing within the chapter "${chapterTitle || ""}", section "${subsectionTitle || ""}" of the book "${bookTitle || ""}". Improve prose quality, vary sentence structure, and use richer vocabulary. Return ONLY the rewritten paragraph text, nothing else. No quotes, no labels, no explanation.`,
          },
          { role: "user", content: paragraph },
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

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[rewrite-paragraph] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to rewrite paragraph" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
