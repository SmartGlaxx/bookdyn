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
    const { book, chapterIndex, subsectionIndex, previousSummary, tonalAnchors, ieltsBand } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const chapter = book.outline?.chapters[chapterIndex];
    const subsection = chapter?.subsections[subsectionIndex];
    
    if (!chapter || !subsection) {
      throw new Error("Invalid chapter or subsection index");
    }

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    
    // IELTS Band language guidelines
    const band = ieltsBand || 7; // Default to Band 7
    const languageGuidelines = getLanguageGuidelines(band);
    
    const systemPrompt = `You are a master writer creating content for a ${book.bookType} book.

BOOK CONTEXT:
- Title: "${book.title}"
- Theme: ${book.theme}
- Audience: ${book.audience}
- POV: ${book.pov}
- Tone: ${book.toneProfile.primary} (formality: ${book.toneProfile.formality}/10, emotion: ${book.toneProfile.emotionalIntensity}/10)

LANGUAGE & GRAMMAR LEVEL (IELTS Band ${band}):
${languageGuidelines}

CURRENT POSITION:
- Chapter ${chapter.chapterNumber}: "${chapter.title}"
- Subsection: "${subsection.title}"
- Goal: ${subsection.goal || "Continue the narrative"}

WRITING CONTROLS:
- Velocity: ${book.controls.velocity}/10 (${book.controls.velocity > 6 ? "fast-paced, action-driven" : book.controls.velocity > 3 ? "balanced pacing" : "slow, descriptive"})
- Creativity: ${book.controls.creativity}/10
- Scope: ${book.controls.scope}/10

${previousSummary ? `PREVIOUS SECTION SUMMARY:\n${previousSummary}\n` : ""}

${tonalAnchors?.length > 0 ? `TONAL ANCHORS (match this style):\n${tonalAnchors.join("\n\n")}\n` : ""}

${isChildrensBook ? `
CHILDREN'S BOOK REQUIREMENTS:
- Write 200-400 words maximum
- Use simple, vivid language children understand
- Include dialogue and action
- Create scenes that are easy to illustrate
- End with a gentle hook or resolution
- Include sensory details (colors, sounds, textures)
` : `
Write 400-800 words for this subsection.
`}

Write ONLY the content for this subsection. Do not include titles or headers. Match the established tone and style. Strictly adhere to the language/grammar level specified above. Create engaging, high-quality prose.`;

function getLanguageGuidelines(band: number): string {
  switch (band) {
    case 5:
      return `- Use simple vocabulary and short sentences
- Basic grammar structures only (simple present, past, future)
- Avoid complex clauses and subordination
- Concrete, everyday words children can understand
- Repetition for emphasis and clarity is encouraged
- Maximum sentence length: 10-12 words average`;
    case 6:
      return `- Moderately simple vocabulary with some descriptive words
- Mix of simple and compound sentences
- Limited use of complex sentences
- Accessible language for older children and beginners
- Clear, straightforward explanations
- Maximum sentence length: 15-18 words average`;
    case 7:
      return `- Standard vocabulary appropriate for general readers
- Varied sentence structures (simple, compound, complex)
- Good range of connectors and transitions
- Clear expression of ideas with some nuance
- Balance between accessibility and sophistication
- Average sentence length: 18-22 words`;
    case 8:
      return `- Wide vocabulary range including some academic/technical terms
- Complex grammatical structures used naturally
- Sophisticated connectors and cohesive devices
- Nuanced expression with precise word choice
- Can handle abstract concepts and detailed analysis
- Varied sentence lengths for rhythm and effect`;
    case 9:
      return `- Extensive and precise vocabulary including specialized terminology
- Full range of grammatical structures used with complete flexibility
- Highly sophisticated expression and argumentation
- Subtle nuances, implications, and academic register
- Complex ideas expressed with clarity and elegance
- Advanced rhetorical devices and scholarly conventions`;
    default:
      return `- Standard vocabulary appropriate for general readers
- Varied sentence structures
- Clear expression of ideas`;
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
          { role: "user", content: `Write the content for subsection "${subsection.title}" in chapter "${chapter.title}". Create immersive, engaging prose that advances the book's narrative/purpose.` },
        ],
        stream: true,
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

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("generate-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
