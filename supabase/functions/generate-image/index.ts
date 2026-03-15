import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// ── Security Config ──
const ALLOWED_ORIGINS = [
  "https://id-preview--50948d4c-97c6-4338-a33a-59e9cf03b7c0.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];
const MAX_PAYLOAD_BYTES = 50_000;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function wafCheck(req: Request): string | null {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const blocked = ["sqlmap", "nikto", "nessus", "masscan", "zgrab"];
  for (const b of blocked) { if (ua.includes(b)) return `Blocked: ${b}`; }
  return null;
}

function validateInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.bookType || typeof body.bookType !== "string") return "Missing bookType";
  if (!body.theme || typeof body.theme !== "string") return "Missing theme";
  if (body.theme.length > 2000) return "Theme too long";
  if (body.content && typeof body.content === "string" && body.content.length > 10000) return "Content too long";
  return null;
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const user = { id: data.claims.sub as string, email: data.claims.email as string };
  return { user, supabase };
}

async function checkRateLimit(userId: string, functionName: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.rpc("check_rate_limit", { _user_id: userId, _function_name: functionName, _max_per_hour: 30, _max_per_day: 200 });
  return data as boolean ?? true;
}

async function auditLog(userId: string, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.from("audit_logs").insert({ user_id: userId, action, resource_type: resourceType, resource_id: resourceId, metadata: metadata || {} });
}

interface CharacterReference {
  id: string;
  name: string;
  visualDescription: string;
  portraitUrl?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const wafResult = wafCheck(req);
    if (wafResult) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const auth = await getAuthUser(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const allowed = await checkRateLimit(auth.user.id, "generate-image");
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const validationError = validateInput(body);
    if (validationError) return new Response(JSON.stringify({ error: validationError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { content, bookType, theme, imageOpportunity, style, characters, visualStyleGuide, useCharacterReferences } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    await auditLog(auth.user.id, "generate_image", "book", undefined, { bookType });

    const isChildrensBook = bookType === "children" || bookType === "comic";
    
    let styleGuide = style || visualStyleGuide || "";
    if (!styleGuide) {
      if (isChildrensBook) styleGuide = "whimsical children's book illustration, soft watercolors, warm and inviting";
      else if (bookType === "comic") styleGuide = "comic book style, bold lines, dynamic composition";
      else if (bookType === "science-academic" || bookType === "science-popular") styleGuide = "scientific illustration, clean, informative";
      else if (bookType === "cookbook") styleGuide = "food photography style, appetizing, warm lighting";
      else styleGuide = "professional book illustration, elegant, evocative";
    }

    const characterRefs: CharacterReference[] = characters || [];
    let characterSection = "";
    if (characterRefs.length > 0 && useCharacterReferences) {
      characterSection = `\nIMPORTANT - CHARACTER CONSISTENCY:\n${characterRefs.map((char: CharacterReference) => `- ${char.name}: ${char.visualDescription}`).join("\n")}\n`;
    }

    const promptContent = imageOpportunity || content?.substring(0, 500) || theme;
    const imagePrompt = `Create a ${styleGuide} illustration for a ${bookType} book.\n\nScene: ${promptContent}\n${characterSection}\nRequirements:\n- No text or words\n- ${isChildrensBook ? "Child-friendly, colorful" : "Professional and polished"}\n- 16:9 aspect ratio\n- Cohesive with theme: "${theme}"`;

    console.log("Generating image with prompt:", imagePrompt.substring(0, 200) + "...");

    const hasPortraits = characterRefs.some((c: CharacterReference) => c.portraitUrl);
    let response;
    
    if (hasPortraits && useCharacterReferences && isChildrensBook) {
      const portraitsToUse = characterRefs.filter((c: CharacterReference) => c.portraitUrl).slice(0, 2);
      if (portraitsToUse.length > 0) {
        const messageContent: any[] = [
          { type: "text", text: `Using these character reference portraits, create a new scene illustration:\n\nScene: ${promptContent}\nStyle: ${styleGuide}\n\nCRITICAL: Characters must look EXACTLY like references.\n- No text\n- ${isChildrensBook ? "Child-friendly" : "Professional"}\n- 16:9` }
        ];
        for (const char of portraitsToUse) {
          messageContent.push({ type: "image_url", image_url: { url: char.portraitUrl } });
        }
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content: messageContent }], modalities: ["image", "text"] }),
        });
      } else {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }),
        });
      }
    } else {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) { console.error("No image in response:", JSON.stringify(data)); throw new Error("No image generated"); }

    return new Response(JSON.stringify({ imageUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("generate-image error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
