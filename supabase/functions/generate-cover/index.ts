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
  ];
  return patterns.some(p => p.test(text));
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return { id: data.claims.sub as string, email: data.claims.email as string };
}

async function checkRateLimit(userId: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.rpc("check_rate_limit", { _user_id: userId, _function_name: "generate-cover", _max_per_hour: 10, _max_per_day: 30 });
  return data as boolean ?? true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // WAF check
    const wafResult = wafCheck(req);
    if (wafResult) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Payload size check
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const user = await getAuthUser(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const allowed = await checkRateLimit(user.id);
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { description, count, bookTitle, bookType, theme } = body;

    if (!description || typeof description !== "string" || description.length < 5) {
      return new Response(JSON.stringify({ error: "Description must be at least 5 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (description.length > 2000) {
      return new Response(JSON.stringify({ error: "Description too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (bookTitle && typeof bookTitle === "string" && bookTitle.length > 500) {
      return new Response(JSON.stringify({ error: "Book title too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prompt injection check on user-controlled fields
    const fieldsToCheck = [description, bookTitle, theme].filter(Boolean);
    for (const f of fieldsToCheck) {
      if (typeof f === "string" && detectPromptInjection(f)) {
        return new Response(JSON.stringify({ error: "Input contains prohibited patterns" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const numCovers = Math.min(5, Math.max(1, count || 3));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Deduct 1 credit
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: creditCheck } = await adminClient.rpc("check_and_deduct_word_credits", { _user_id: user.id, _estimated_words: 1000 });
    const creditResult = creditCheck as Record<string, unknown> | null;
    if (!creditResult?.allowed) {
      return new Response(JSON.stringify({ error: creditResult?.reason || "Insufficient credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const coverPromises = Array.from({ length: numCovers }, async (_, i) => {
      const variationHint = numCovers > 1 ? ` (Variation ${i + 1} of ${numCovers} — create a distinct interpretation)` : "";
      const prompt = `Create a professional book cover illustration for a ${bookType || "book"} titled "${bookTitle || "Untitled"}".

Theme: ${theme || "general"}
Cover description: ${description}${variationHint}

Requirements:
- Portrait orientation, 2:3 aspect ratio (book cover proportions)
- Professional, publishable book cover quality
- NO text, NO title, NO author name — pure visual illustration only
- Rich, detailed artwork suitable for a real book cover
- Strong focal point and balanced composition
- Dramatic lighting and atmosphere`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit exceeded");
        if (response.status === 402) throw new Error("Payment required");
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error("No image generated");
      return imageUrl;
    });

    const results = await Promise.allSettled(coverPromises);
    const covers = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map(r => r.value);

    if (covers.length === 0) {
      throw new Error("Failed to generate any covers");
    }

    return new Response(JSON.stringify({ covers }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("generate-cover error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Rate limit") ? 429 : msg.includes("Payment") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
