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
  const patterns = [/ignore\s+(all\s+)?previous\s+instructions/i, /you\s+are\s+now\s+/i, /system\s*:\s*/i, /\[INST\]/i, /<<SYS>>/i, /forget\s+(everything|all|your)\s/i];
  return patterns.some(p => p.test(text));
}

function validateInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.book || typeof body.book !== "object") return "Missing book data";
  if (!body.outline || typeof body.outline !== "object") return "Missing outline data";
  if (!body.book.title || typeof body.book.title !== "string" || body.book.title.length > 500) return "Invalid book title";
  if (detectPromptInjection(body.book.title)) return "Input contains prohibited patterns";
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
  const { data } = await supabase.rpc("check_rate_limit", { _user_id: userId, _function_name: functionName, _max_per_hour: 10, _max_per_day: 50 });
  return data as boolean ?? true;
}

async function auditLog(userId: string, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.from("audit_logs").insert({ user_id: userId, action, resource_type: resourceType, resource_id: resourceId, metadata: metadata || {} });
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

    const allowed = await checkRateLimit(auth.user.id, "generate-characters");
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const validationError = validateInput(body);
    if (validationError) return new Response(JSON.stringify({ error: validationError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { book, outline, ieltsBand } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    await auditLog(auth.user.id, "generate_characters", "book", book.id, { title: book.title });

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    const band = ieltsBand || 7;
    const descriptionGuidelines = getDescriptionGuidelines(band);
    
    const extractPrompt = `Analyze this book outline and extract EVERY character, person, or entity mentioned or implied.

BOOK: "${book.title}"
THEME: "${book.theme}"
TYPE: ${book.bookType}
AUDIENCE: ${book.audience}
TARGET LANGUAGE COMPLEXITY (IELTS Band ${band}):
${descriptionGuidelines}

OUTLINE:
${JSON.stringify(outline.chapters.map((ch: any) => ({
  title: ch.title,
  summary: ch.summary,
  subsections: ch.subsections.map((s: any) => ({ title: s.title, goal: s.goal }))
})), null, 2)}

For EACH character, provide an EXHAUSTIVE profile with ALL sections:
IDENTITY, PHYSICAL APPEARANCE, HAIR, FASHION & STYLE, VOICE & MANNERISMS, PERSONALITY, BACKSTORY, ROLE IN STORY.

Also provide:
- A brief description (for quick reference)
- A visualDescription for illustration consistency

Return ONLY valid JSON:
{
  "characters": [
    {
      "id": "character_id",
      "name": "Character Name",
      "description": "Quick reference summary",
      "visualDescription": "Visual description for illustration",
      "role": "protagonist|supporting|minor|background",
      "identity": { ... },
      "appearance": { ... },
      "hair": { ... },
      "fashion": { ... },
      "voice": { ... },
      "personality": { ... },
      "backstory": { ... },
      "storyRole": { ... }
    }
  ],
  "visualStyleGuide": "Overall art style description for the book"
}`;

    function getDescriptionGuidelines(band: number): string {
      switch (band) {
        case 5: return `- Use VERY simple words a young child would understand`;
        case 6: return `- Use simple, clear vocabulary for older children`;
        case 7: return `- Standard vocabulary for general readers`;
        case 8: return `- Sophisticated vocabulary for academic readers`;
        case 9: return `- Advanced, literary vocabulary`;
        default: return `- Standard vocabulary`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: extractPrompt }], temperature: 0.5 }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch { throw new Error("Failed to parse character data"); }

    const characters = parsed.characters || [];
    const visualStyleGuide = parsed.visualStyleGuide || "";

    const charactersWithPortraits = [];
    
    if (isChildrensBook) {
      for (const character of characters.slice(0, 5)) {
        try {
          const portraitPrompt = `Create a character reference sheet portrait for a children's book character.\n\nCHARACTER: ${character.name}\nVISUAL DESCRIPTION: ${character.visualDescription}\nSTYLE: ${visualStyleGuide}\n\nRequirements:\n- Clean, clear character portrait\n- Soft watercolor style, warm colors\n- White background\n- No text`;

          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content: portraitPrompt }], modalities: ["image", "text"] }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const portraitUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            charactersWithPortraits.push(portraitUrl ? { ...character, portraitUrl } : character);
          } else {
            charactersWithPortraits.push(character);
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.error(`Error generating portrait for ${character.name}:`, err);
          charactersWithPortraits.push(character);
        }
      }
      for (const character of characters.slice(5)) { charactersWithPortraits.push(character); }
    } else {
      charactersWithPortraits.push(...characters);
    }

    return new Response(JSON.stringify({ characters: charactersWithPortraits, visualStyleGuide }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("generate-characters error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
