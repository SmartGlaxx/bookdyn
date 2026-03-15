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
  const patterns = [/ignore\s+(all\s+)?previous\s+instructions/i, /you\s+are\s+now\s+/i, /system\s*:\s*/i, /\[INST\]/i, /<<SYS>>/i, /forget\s+(everything|all|your)\s/i, /override\s+(your|the)\s+/i];
  return patterns.some(p => p.test(text));
}

function validateInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.book || typeof body.book !== "object") return "Missing book data";
  if (!body.book.title || typeof body.book.title !== "string" || body.book.title.length > 500) return "Invalid book title";
  if (!body.book.theme || typeof body.book.theme !== "string" || body.book.theme.length > 2000) return "Invalid theme";
  const fieldsToCheck = [body.book.title, body.book.theme, body.book.subtitle].filter(Boolean);
  for (const f of fieldsToCheck) { if (detectPromptInjection(f)) return "Input contains prohibited patterns"; }
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const wafResult = wafCheck(req);
    if (wafResult) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const auth = await getAuthUser(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const allowed = await checkRateLimit(auth.user.id, "generate-outline");
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const validationError = validateInput(body);
    if (validationError) return new Response(JSON.stringify({ error: validationError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { book, ieltsBand } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    await auditLog(auth.user.id, "generate_outline", "book", book.id, { title: book.title });

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    const band = ieltsBand || 7;
    const languageGuidelines = getLanguageGuidelines(band);
    const structureGuidelines = getStructureGuidelines(band);
    
    const systemPrompt = `You are a professional book architect. Your task is to create a detailed, structured outline for a ${book.bookType} book.

BOOK DETAILS:
- Title: ${book.title}
- Theme: ${book.theme}
- Genre: ${book.genre || "General"}
- Target Audience: ${book.audience}
- Point of View: ${book.pov}
- Tone: ${book.toneProfile.primary} (intensity: ${book.toneProfile.intensity}/10)
- Depth Level: ${book.controls.depthLevel}

LANGUAGE COMPLEXITY (IELTS Band ${band}):
${languageGuidelines}

STRUCTURE COMPLEXITY:
${structureGuidelines}

DYNAMISM CONTROLS:
- Narrative Velocity: ${book.controls.velocity}/10 (${book.controls.velocity > 6 ? "fast-paced" : book.controls.velocity > 3 ? "moderate" : "slow, contemplative"})
- Entity Complexity: ${book.controls.entityComplexity}/10 (${book.controls.entityComplexity > 6 ? "many characters/concepts" : "focused cast"})
- Perspective Multiplexing: ${book.controls.perspectiveMultiplexing}/10 (${book.controls.perspectiveMultiplexing > 5 ? "multiple viewpoints" : "unified perspective"})
- Creativity Level: ${book.controls.creativity}/10
- Spatial Scope: ${book.controls.spatialScope}
- Temporal Era: ${book.controls.temporalContext?.era || "contemporary"}
- Timeline Structure: ${book.controls.temporalContext?.timelineStructure || "linear"}

TARGET WORD COUNT: ${book.controls.structureControls?.targetWordCount ? book.controls.structureControls.targetWordCount.toLocaleString() + " words" : "~50,000 words (default)"}
- Plan chapters and subsections so that the total content will reach approximately this word count
- Each subsection should produce roughly 400-800 words of prose
- Calculate: target_words / 600 (avg per subsection) = total subsections needed, distributed across chapters

SECTIONS PER CHAPTER: Target ~${book.controls.structureControls?.sectionsPerChapter || 4} sections per chapter, but VARY naturally between ${Math.max(2, (book.controls.structureControls?.sectionsPerChapter || 4) - 1)} and ${Math.min(10, (book.controls.structureControls?.sectionsPerChapter || 4) + 1)}.

STRUCTURE PREFERENCES:
- Chapter Count: ${book.controls.structureControls?.chapterCount === "fixed" ? book.controls.structureControls.targetChapters + " chapters" : "flexible (scale to match target word count)"}
- Titles Required: ${book.controls.structureControls?.titlesRequired ? "Yes" : "Optional"}
- Divergence Allowed: ${book.controls.divergenceAllowed ? "Yes - parallel storylines permitted" : "No - keep focused"}

${isChildrensBook ? `
CHILDREN'S BOOK SPECIAL REQUIREMENTS:
- Keep chapters SHORT (2-4 subsections each, ~200-400 words per subsection)
- Every subsection MUST have an image opportunity
- Use simple, engaging language
- Include clear moral lessons or learning moments
- Create vivid, imaginable scenes for illustration
- Total: 5-8 short chapters maximum
` : ""}

CRITICAL: Match ALL chapter titles, subsection titles, goals, and summaries to the IELTS Band ${band} language level specified above.

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "chapters": [
    {
      "id": "ch-1",
      "chapterNumber": 1,
      "title": "Chapter Title",
      "summary": "Brief chapter summary",
      "subsections": [
        {
          "id": "ch-1-s-1",
          "title": "Subsection Title",
          "goal": "What this section accomplishes",
          "imageOpportunity": "Description of potential illustration"
        }
      ]
    }
  ],
  "openPromises": ["Story promise 1", "Character arc to resolve"],
  "bookGoal": "The overarching purpose/message of this book"
}`;

function getLanguageGuidelines(band: number): string {
  switch (band) {
    case 5: return `- Use VERY simple vocabulary for young children\n- Short, clear chapter and section titles (2-4 words)`;
    case 6: return `- Use simple, accessible vocabulary for older children/beginners\n- Straightforward chapter and section titles`;
    case 7: return `- Use standard vocabulary for general readers\n- Clear, descriptive chapter titles`;
    case 8: return `- Use sophisticated vocabulary including some technical terms\n- Nuanced chapter and section titles`;
    case 9: return `- Use advanced, specialized vocabulary\n- Scholarly or technical chapter titles where appropriate`;
    default: return `- Use standard vocabulary for general readers`;
  }
}

function getStructureGuidelines(band: number): string {
  switch (band) {
    case 5: return `- Very short chapters (2-3 subsections each)\n- Linear, simple narrative structure\n- Maximum 6-8 chapters total`;
    case 6: return `- Short chapters (3-4 subsections each)\n- Mostly linear structure\n- Maximum 8-10 chapters total`;
    case 7: return `- Moderate chapter length (4-5 subsections each)\n- Standard narrative structure\n- 8-12 chapters typical`;
    case 8: return `- Flexible chapter length\n- Can include subplots\n- 10-15 chapters typical`;
    case 9: return `- Complex, sophisticated structure\n- Multiple narrative threads\n- Length determined by content complexity`;
    default: return `- Standard chapter structure`;
  }
}

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a detailed outline for the book "${book.title}" with theme: "${book.theme}". Generate the complete chapter and subsection structure now.` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let outline;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      outline = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error("Failed to parse outline JSON:", parseError);
      throw new Error("Failed to parse outline from AI response");
    }

    const formattedOutline = {
      chapters: outline.chapters.map((ch: any, idx: number) => ({
        id: ch.id || `ch-${idx + 1}`,
        chapterNumber: ch.chapterNumber || idx + 1,
        title: ch.title || `Chapter ${idx + 1}`,
        summary: ch.summary || "",
        status: "pending",
        subsections: (ch.subsections || []).map((sub: any, subIdx: number) => ({
          id: sub.id || `ch-${idx + 1}-s-${subIdx + 1}`,
          title: sub.title || `Section ${subIdx + 1}`,
          goal: sub.goal || "",
          imageOpportunity: sub.imageOpportunity || null,
          status: "pending",
          content: "",
        })),
      })),
      openPromises: outline.openPromises || [],
      resolvedPromises: [],
      bookGoal: outline.bookGoal || "",
    };

    return new Response(JSON.stringify({ outline: formattedOutline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("generate-outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
