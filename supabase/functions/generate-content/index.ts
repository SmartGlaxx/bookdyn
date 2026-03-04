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
    const { book, chapterIndex, subsectionIndex, previousSummary, tonalAnchors, ieltsBand, targetWordsPerSubsection } = await req.json();
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
    const isNarrative = ["novel", "fiction-serial", "short-story", "children", "comic", "biography", "memoir", "drama"].includes(book.bookType);
    
    // IELTS Band language guidelines
    const band = ieltsBand || 7;
    const languageGuidelines = getLanguageGuidelines(band);
    
    // Hook frequency & velocity
    const hookFrequency = book.controls?.hookFrequency ?? 5;
    const velocity = book.controls?.velocity ?? 5;
    
    // Calculate hook interval in paragraphs based on slider (1=every 8 paragraphs, 10=every paragraph)
    const hookInterval = Math.max(1, Math.round(9 - (hookFrequency - 1) * (8 / 9)));
    // Scene change word limit based on velocity+hookFrequency combo
    const sceneChangeWords = Math.max(150, Math.round(600 - ((velocity + hookFrequency) / 2 - 1) * 50));

    const pacingRules = getPacingRules(hookFrequency, velocity, isNarrative, hookInterval, sceneChangeWords);
    
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

${pacingRules}

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
Write approximately ${targetWordsPerSubsection || 600} words for this subsection.
`}

Write ONLY the content for this subsection. Do not include titles or headers. Match the established tone and style. Strictly adhere to the language/grammar level specified above. Create engaging, high-quality prose.`;

function getPacingRules(hookFreq: number, vel: number, isNarr: boolean, hookInt: number, sceneWords: number): string {
  // Always include core writing controls
  let rules = `WRITING CONTROLS:
- Velocity: ${vel}/10 (${vel > 6 ? "fast-paced, action-driven" : vel > 3 ? "balanced pacing" : "slow, descriptive"})
- Creativity: ${book.controls.creativity}/10
- Scope: ${book.controls.scope}/10
- Hook Frequency: ${hookFreq}/10 (inject a hook every ~${hookInt} paragraph(s))`;

  if (!isNarr && hookFreq <= 3) {
    // Non-narrative, low hook: just basic controls, no special pacing
    return rules;
  }

  // Anti-rumination rules scale with hookFrequency
  rules += `

PACING & MOMENTUM RULES (STRICTLY ENFORCED):
1. HOOK INJECTION: Every ${hookInt} paragraph(s), inject a hook — a compelling question, revelation, action beat, scene change, new character entrance, or dialogue shift. A hook is an open loop that creates a question the reader's brain needs answered.
2. NO RUMINATION: Never spend more than ${hookFreq >= 7 ? "1-2" : "2-3"} sentences on a character's internal feelings, thoughts, or reflections before moving the scene forward with action, dialogue, or a new event.
3. SCENE MOMENTUM: Every ${sceneWords} words maximum, something MUST change: a new character enters, the location shifts, dialogue starts or ends, a revelation occurs, or action happens. If nothing has changed, you are ruminating — cut it.
4. DYNAMIC PACING: Treat each paragraph like a cut in a film. If nothing changed from the previous paragraph (no new information, no new action, no new speaker), that paragraph should not exist.
5. DIALOGUE BREAKS RUMINATION: If internal monologue exceeds 2 sentences, interrupt it with dialogue or external action immediately.
6. SHOW DON'T DWELL: Describe a scene or observation in one vivid sentence, then move. A policeman sees a woman in a phone booth = one sentence of observation, then the next beat. No extended meditation on any single moment.
7. CONTENT MIX: Aim for roughly ${hookFreq >= 7 ? "60% action/events, 25% dialogue, 15% internal thought" : "50% action/events, 30% dialogue, 20% internal thought"}. Never let any single category dominate a passage.
8. OPEN LOOPS: Plant unanswered questions, unresolved tensions, and curiosity gaps throughout. Each subsection should end with the reader needing to know what happens next.
9. IN MEDIAS RES: When starting a new scene or subsection, drop into the middle of the action. Do not set up scenes with long descriptions before anything happens.
10. PATTERN INTERRUPTS: Break predictable rhythms. If you've had two paragraphs of similar structure, the third must be structurally different (shorter, dialogue-heavy, action-only, single sentence).`;

  return rules;
}

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
          { role: "user", content: `Write the content for subsection "${subsection.title}" in chapter "${chapter.title}". Create immersive, engaging prose that advances the book's narrative/purpose. Remember: keep the momentum — no dwelling, no ruminating, always moving forward.` },
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
