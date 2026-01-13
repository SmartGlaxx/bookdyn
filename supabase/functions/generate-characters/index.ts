import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Character {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book, outline } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    
    // Step 1: Extract characters from the outline
    const extractPrompt = `Analyze this book outline and extract ALL characters/entities that will appear in the story.

BOOK: "${book.title}"
THEME: "${book.theme}"
TYPE: ${book.bookType}

OUTLINE:
${JSON.stringify(outline.chapters.map((ch: any) => ({
  title: ch.title,
  summary: ch.summary,
  subsections: ch.subsections.map((s: any) => ({ title: s.title, goal: s.goal }))
})), null, 2)}

For each character, provide:
1. A unique ID (snake_case)
2. Their name
3. A brief story description (personality, role in story)
4. A DETAILED visual description for consistent illustration:
   - Species/type (human, animal, creature)
   - Age appearance
   - Body type and size
   - Distinctive colors (fur, hair, skin, clothing)
   - Key identifying features (accessories, markings, expressions)
   - Style notes for ${isChildrensBook ? "children's book illustration" : "book illustration"}

Return ONLY valid JSON:
{
  "characters": [
    {
      "id": "character_id",
      "name": "Character Name",
      "description": "Story role and personality",
      "visualDescription": "Detailed visual description for consistent illustration",
      "role": "protagonist|supporting|minor"
    }
  ],
  "visualStyleGuide": "Overall art style description for the book"
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
    
    // Parse JSON
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      throw new Error("Failed to parse character data");
    }

    const characters: Character[] = parsed.characters || [];
    const visualStyleGuide = parsed.visualStyleGuide || "";

    // Step 2: Generate reference portrait for each main character
    const charactersWithPortraits = [];
    
    for (const character of characters.slice(0, 5)) { // Limit to 5 main characters
      try {
        const portraitPrompt = `Create a character reference sheet portrait for a ${isChildrensBook ? "children's book" : "book"} character.

CHARACTER: ${character.name}
VISUAL DESCRIPTION: ${character.visualDescription}
STYLE: ${visualStyleGuide}

Requirements:
- Clean, clear character portrait showing the character from chest/shoulders up
- ${isChildrensBook ? "Soft watercolor style, warm colors, friendly expression, child-friendly" : "Professional illustration style"}
- White or simple background for reference clarity
- Show the character's key identifying features clearly
- No text or words in the image
- This is a REFERENCE portrait for maintaining consistency across all book illustrations`;

        console.log(`Generating portrait for ${character.name}`);

        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [
              { role: "user", content: portraitPrompt },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const portraitUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (portraitUrl) {
            charactersWithPortraits.push({
              ...character,
              portraitUrl,
            });
            console.log(`Portrait generated for ${character.name}`);
          } else {
            charactersWithPortraits.push(character);
          }
        } else {
          console.error(`Failed to generate portrait for ${character.name}:`, imageResponse.status);
          charactersWithPortraits.push(character);
        }

        // Small delay between image generations to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error generating portrait for ${character.name}:`, err);
        charactersWithPortraits.push(character);
      }
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
