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
    const { book, ieltsBand } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    const band = ieltsBand || 7; // Default to Band 7
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

CRITICAL: Match ALL chapter titles, subsection titles, goals, and summaries to the IELTS Band ${band} language level specified above. The structural complexity and vocabulary in titles must be appropriate for the target audience.

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
    case 5:
      return `- Use VERY simple vocabulary for young children
- Short, clear chapter and section titles (2-4 words)
- Goals described in basic, concrete terms
- Avoid abstract concepts`;
    case 6:
      return `- Use simple, accessible vocabulary for older children/beginners
- Straightforward chapter and section titles
- Goals explained in clear, simple language
- Limited abstract concepts`;
    case 7:
      return `- Use standard vocabulary for general readers
- Clear, descriptive chapter titles
- Goals articulated with moderate complexity
- Balance concrete and abstract concepts`;
    case 8:
      return `- Use sophisticated vocabulary including some technical terms
- Nuanced chapter and section titles
- Goals can include complex concepts and analysis
- Academic rigor where appropriate`;
    case 9:
      return `- Use advanced, specialized vocabulary
- Scholarly or technical chapter titles where appropriate
- Goals can include complex theoretical frameworks
- Full academic or professional register`;
    default:
      return `- Use standard vocabulary for general readers`;
  }
}

function getStructureGuidelines(band: number): string {
  switch (band) {
    case 5:
      return `- Very short chapters (2-3 subsections each)
- Linear, simple narrative structure
- One main idea per chapter
- Repetitive patterns for familiarity
- Maximum 6-8 chapters total`;
    case 6:
      return `- Short chapters (3-4 subsections each)
- Mostly linear structure with simple transitions
- Clear beginning, middle, end per chapter
- Maximum 8-10 chapters total`;
    case 7:
      return `- Moderate chapter length (4-5 subsections each)
- Standard narrative structure
- Some complexity in chapter organization
- 8-12 chapters typical`;
    case 8:
      return `- Flexible chapter length based on content needs
- Can include subplots or parallel threads
- Complex chapter organization allowed
- Analytical or thematic chapter structures permitted
- 10-15 chapters typical`;
    case 9:
      return `- Complex, sophisticated structure
- Multiple narrative threads or analytical frameworks
- Can include recursive or non-linear organization
- Academic chapter conventions if appropriate
- Length determined by content complexity`;
    default:
      return `- Standard chapter structure`;
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
