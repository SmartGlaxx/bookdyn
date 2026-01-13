import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    
    const systemPrompt = `You are a professional book architect. Your task is to create a detailed, structured outline for a ${book.bookType} book.

BOOK DETAILS:
- Title: ${book.title}
- Theme: ${book.theme}
- Genre: ${book.genre || "General"}
- Target Audience: ${book.audience}
- Point of View: ${book.pov}
- Tone: ${book.toneProfile.primary} (intensity: ${book.toneProfile.intensity}/10)
- Depth Level: ${book.controls.depthLevel}

DYNAMISM CONTROLS:
- Narrative Velocity: ${book.controls.velocity}/10 (${book.controls.velocity > 6 ? "fast-paced" : book.controls.velocity > 3 ? "moderate" : "slow, contemplative"})
- Entity Complexity: ${book.controls.entityComplexity}/10 (${book.controls.entityComplexity > 6 ? "many characters/concepts" : "focused cast"})
- Perspective Multiplexing: ${book.controls.perspectiveMultiplexing}/10 (${book.controls.perspectiveMultiplexing > 5 ? "multiple viewpoints" : "unified perspective"})
- Creativity Level: ${book.controls.creativity}/10
- Spatial Scope: ${book.controls.spatialScope}
- Temporal Era: ${book.controls.temporalContext?.era || "contemporary"}
- Timeline Structure: ${book.controls.temporalContext?.timelineStructure || "linear"}

STRUCTURE PREFERENCES:
- Chapter Count: ${book.controls.structureControls?.chapterCount === "fixed" ? book.controls.structureControls.targetChapters + " chapters" : "flexible (3-12 chapters)"}
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let outline;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      outline = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error("Failed to parse outline JSON:", parseError);
      throw new Error("Failed to parse outline from AI response");
    }

    // Ensure proper structure
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
    console.error("generate-outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
