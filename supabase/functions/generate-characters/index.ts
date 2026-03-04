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
    const { book, outline, ieltsBand } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    const band = ieltsBand || 7;
    const descriptionGuidelines = getDescriptionGuidelines(band);
    
    const extractPrompt = `Analyze this book outline and extract EVERY character, person, or entity mentioned or implied — protagonists, supporting cast, minor characters, AND background characters (a shopkeeper mentioned once, a passing stranger, anyone). Every person in the narrative gets a full profile.

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

For EACH character, provide an EXHAUSTIVE profile with ALL of these sections:

IDENTITY:
- fullName (and any aliases, nicknames, titles)
- age and dateOfBirth
- gender and pronouns
- nationality, ethnicity, culturalBackground
- nativeLanguage and accent

PHYSICAL APPEARANCE:
- height and build (slim, athletic, stocky, heavyset)
- skinTone (specific — e.g. "warm brown with golden undertones")
- faceShape (oval, square, heart, round)
- eyeColor, eyeShape, eyeDistinguishing (hooded, deep-set)
- noseShape and lipShape
- jawline and cheekbones
- scars, birthmarks, tattoos, distinctiveMarks
- hands description

HAIR:
- color (natural + dyed if applicable)
- texture (coarse, fine, wavy, kinky, straight)
- lengthAndStyle (e.g. fade, locs, bob, bun)
- casualStyle vs formalStyle
- changesAcrossStory

FASHION & STYLE:
- casualStyle, workAttire, formalWear, sleepwear
- signatureItem (a watch, ring, jacket they're always wearing)
- shoePreference
- styleReflection (how clothing reflects personality/status)
- styleEvolution (how style changes across story)

VOICE & MANNERISMS:
- toneOfVoice (gravelly, soft, commanding, timid)
- speechPatterns (verbose, terse, slang, formal)
- accentStrength
- nervousHabits (taps fingers, avoids eye contact)
- posture and how they carry themselves
- defaultExpressions
- laughStyle, angerStyle, fearStyle

PERSONALITY:
- coreType (descriptors or MBTI)
- strengths (array)
- flaws (array)
- fears (array)
- desires (array)
- publicPersona vs privateReality
- treatmentOfStrangers vs treatmentOfLovedOnes

BACKSTORY:
- upbringing (where they grew up, how it shaped them)
- formativeEvents (array of key events)
- definingRelationships (array — parents, first love, enemies)
- whatTheyLost
- whatTheySeek (running from or toward)

ROLE IN STORY:
- archetype (Protagonist / Antagonist / Supporting / Minor / Background)
- relationshipToMainCharacter (IMPORTANT — how they connect to the protagonist or other key characters)
- goal (what they want in this story)
- obstacle (what's standing in their way)
- arc (how they change or refuse to change by the end)

Also provide:
- A brief description (for quick reference)
- A visualDescription for illustration consistency

IMPORTANT: Match language complexity to IELTS Band ${band}. Even background characters mentioned once get a FULL profile — consistency across a long novel depends on it.

Return ONLY valid JSON:
{
  "characters": [
    {
      "id": "character_id",
      "name": "Character Name",
      "description": "Quick reference summary",
      "visualDescription": "Visual description for illustration",
      "role": "protagonist|supporting|minor|background",
      "identity": { "fullName": "...", "aliases": [], "age": "...", "dateOfBirth": "...", "gender": "...", "pronouns": "...", "nationality": "...", "ethnicity": "...", "culturalBackground": "...", "nativeLanguage": "...", "accent": "..." },
      "appearance": { "height": "...", "build": "...", "skinTone": "...", "faceShape": "...", "eyeColor": "...", "eyeShape": "...", "eyeDistinguishing": "...", "noseShape": "...", "lipShape": "...", "jawline": "...", "cheekbones": "...", "scars": "...", "birthmarks": "...", "tattoos": "...", "distinctiveMarks": "...", "hands": "..." },
      "hair": { "color": "...", "texture": "...", "lengthAndStyle": "...", "casualStyle": "...", "formalStyle": "...", "changesAcrossStory": "..." },
      "fashion": { "casualStyle": "...", "workAttire": "...", "formalWear": "...", "sleepwear": "...", "signatureItem": "...", "shoePreference": "...", "styleReflection": "...", "styleEvolution": "..." },
      "voice": { "toneOfVoice": "...", "speechPatterns": "...", "accentStrength": "...", "nervousHabits": "...", "posture": "...", "defaultExpressions": "...", "laughStyle": "...", "angerStyle": "...", "fearStyle": "..." },
      "personality": { "coreType": "...", "strengths": [], "flaws": [], "fears": [], "desires": [], "publicPersona": "...", "privateReality": "...", "treatmentOfStrangers": "...", "treatmentOfLovedOnes": "..." },
      "backstory": { "upbringing": "...", "formativeEvents": [], "definingRelationships": [], "whatTheyLost": "...", "whatTheySeek": "..." },
      "storyRole": { "archetype": "...", "relationshipToMainCharacter": "...", "goal": "...", "obstacle": "...", "arc": "..." }
    }
  ],
  "visualStyleGuide": "Overall art style description for the book"
}`;

    function getDescriptionGuidelines(band: number): string {
      switch (band) {
        case 5:
          return `- Use VERY simple words a young child would understand
- Short, simple sentences (5-10 words)
- Concrete descriptions only
- Character names should be easy to say and remember`;
        case 6:
          return `- Use simple, clear vocabulary for older children
- Straightforward personality descriptions
- Easy-to-understand character motivations`;
        case 7:
          return `- Standard vocabulary for general readers
- Balanced personality descriptions with some nuance
- Clear motivations and traits`;
        case 8:
          return `- Sophisticated vocabulary for academic readers
- Nuanced character descriptions
- Complex personality traits and motivations`;
        case 9:
          return `- Advanced, literary vocabulary
- Complex, multi-dimensional character descriptions
- Sophisticated psychological profiles`;
        default:
          return `- Standard vocabulary appropriate for general readers`;
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
          { role: "user", content: extractPrompt },
        ],
        temperature: 0.5,
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      throw new Error("Failed to parse character data");
    }

    const characters = parsed.characters || [];
    const visualStyleGuide = parsed.visualStyleGuide || "";

    // Generate portraits only for children's books (top 5 characters)
    const charactersWithPortraits = [];
    
    if (isChildrensBook) {
      for (const character of characters.slice(0, 5)) {
        try {
          const portraitPrompt = `Create a character reference sheet portrait for a children's book character.

CHARACTER: ${character.name}
VISUAL DESCRIPTION: ${character.visualDescription}
STYLE: ${visualStyleGuide}

Requirements:
- Clean, clear character portrait showing the character from chest/shoulders up
- Soft watercolor style, warm colors, friendly expression, child-friendly
- White or simple background for reference clarity
- Show the character's key identifying features clearly
- No text or words in the image`;

          console.log(`Generating portrait for ${character.name}`);

          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-pro-image-preview",
              messages: [{ role: "user", content: portraitPrompt }],
              modalities: ["image", "text"],
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const portraitUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (portraitUrl) {
              charactersWithPortraits.push({ ...character, portraitUrl });
              console.log(`Portrait generated for ${character.name}`);
            } else {
              charactersWithPortraits.push(character);
            }
          } else {
            console.error(`Failed to generate portrait for ${character.name}:`, imageResponse.status);
            charactersWithPortraits.push(character);
          }

          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.error(`Error generating portrait for ${character.name}:`, err);
          charactersWithPortraits.push(character);
        }
      }
      // Add remaining characters without portraits
      for (const character of characters.slice(5)) {
        charactersWithPortraits.push(character);
      }
    } else {
      // Non-children's books: no portraits, just profiles
      charactersWithPortraits.push(...characters);
    }

    return new Response(JSON.stringify({ 
      characters: charactersWithPortraits,
      visualStyleGuide,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-characters error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
