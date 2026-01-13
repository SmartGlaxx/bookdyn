import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CharacterReference {
  id: string;
  name: string;
  visualDescription: string;
  portraitUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      bookType, 
      theme, 
      imageOpportunity, 
      style,
      characters,
      visualStyleGuide,
      useCharacterReferences 
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = bookType === "children" || bookType === "comic";
    
    // Determine illustration style based on book type
    let styleGuide = style || visualStyleGuide || "";
    if (!styleGuide) {
      if (isChildrensBook) {
        styleGuide = "whimsical children's book illustration, soft watercolors, warm and inviting, storybook style, friendly characters";
      } else if (bookType === "comic") {
        styleGuide = "comic book style, bold lines, dynamic composition, vibrant colors";
      } else if (bookType === "science-academic" || bookType === "science-popular") {
        styleGuide = "scientific illustration, clean, informative, detailed";
      } else if (bookType === "cookbook") {
        styleGuide = "food photography style, appetizing, warm lighting";
      } else {
        styleGuide = "professional book illustration, elegant, evocative";
      }
    }

    // Build character reference section for the prompt
    let characterSection = "";
    const characterRefs: CharacterReference[] = characters || [];
    
    if (characterRefs.length > 0 && useCharacterReferences) {
      characterSection = `
IMPORTANT - CHARACTER CONSISTENCY REQUIREMENTS:
You MUST depict the following characters EXACTLY as described. Maintain strict visual consistency:

${characterRefs.map((char: CharacterReference) => `
- ${char.name}: ${char.visualDescription}
`).join("")}

These characters must look IDENTICAL to their reference descriptions in every illustration.
`;
    }

    // Create image prompt from content and context
    const promptContent = imageOpportunity || content?.substring(0, 500) || theme;
    
    const imagePrompt = `Create a ${styleGuide} illustration for a ${bookType} book.

Scene description: ${promptContent}
${characterSection}
Requirements:
- No text or words in the image
- Suitable for print quality
- ${isChildrensBook ? "Child-friendly, colorful, engaging characters with expressive faces" : "Professional and polished"}
- 16:9 aspect ratio, high resolution
- Cohesive with the theme: "${theme}"
- Maintain consistent character appearances throughout`;

    console.log("Generating image with prompt:", imagePrompt.substring(0, 200) + "...");

    // Check if we should use image-to-image with character references
    const hasPortraits = characterRefs.some((c: CharacterReference) => c.portraitUrl);
    
    let response;
    
    if (hasPortraits && useCharacterReferences && isChildrensBook) {
      // Use image-to-image editing with character references
      const portraitsToUse = characterRefs
        .filter((c: CharacterReference) => c.portraitUrl)
        .slice(0, 2); // Limit to 2 reference images
      
      if (portraitsToUse.length > 0) {
        console.log(`Using ${portraitsToUse.length} character reference(s) for image-to-image`);
        
        // Build multi-image content
        const messageContent: any[] = [
          {
            type: "text",
            text: `Using these character reference portraits, create a new scene illustration:

Scene: ${promptContent}

Style: ${styleGuide}

CRITICAL: The characters in the new scene must look EXACTLY like they appear in these reference portraits. Maintain:
- Same colors (fur, hair, clothing)
- Same proportions and body shape
- Same distinctive features and markings
- Same art style

Create a scene showing: ${imageOpportunity || "the characters in action"}

Requirements:
- No text or words
- ${isChildrensBook ? "Child-friendly, warm, colorful" : "Professional quality"}
- 16:9 aspect ratio
- Characters must be recognizable from references`
          }
        ];
        
        // Add character portrait references
        for (const char of portraitsToUse) {
          messageContent.push({
            type: "image_url",
            image_url: {
              url: char.portraitUrl
            }
          });
        }

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [
              { role: "user", content: messageContent },
            ],
            modalities: ["image", "text"],
          }),
        });
      } else {
        // Fallback to text-only generation
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [
              { role: "user", content: imagePrompt },
            ],
            modalities: ["image", "text"],
          }),
        });
      }
    } else {
      // Standard text-to-image generation
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            { role: "user", content: imagePrompt },
          ],
          modalities: ["image", "text"],
        }),
      });
    }

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
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
