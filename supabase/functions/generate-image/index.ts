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
    const { content, bookType, theme, imageOpportunity, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isChildrensBook = bookType === "children" || bookType === "comic";
    
    // Determine illustration style based on book type
    let styleGuide = style || "";
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

    // Create image prompt from content and context
    const promptContent = imageOpportunity || content?.substring(0, 500) || theme;
    
    const imagePrompt = `Create a ${styleGuide} illustration for a ${bookType} book.

Scene description: ${promptContent}

Requirements:
- No text or words in the image
- Suitable for print quality
- ${isChildrensBook ? "Child-friendly, colorful, engaging characters with expressive faces" : "Professional and polished"}
- 16:9 aspect ratio, high resolution
- Cohesive with the theme: "${theme}"`;

    console.log("Generating image with prompt:", imagePrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
