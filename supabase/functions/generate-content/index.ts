import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// ── Security Config ──
const MAX_PAYLOAD_BYTES = 200_000; // 200KB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── WAF: Block suspicious patterns ──
function wafCheck(req: Request): string | null {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const blocked = ["sqlmap", "nikto", "nessus", "masscan", "zgrab"];
  for (const b of blocked) {
    if (ua.includes(b)) return `Blocked user-agent: ${b}`;
  }
  return null;
}

// ── Prompt injection detection ──
function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /forget\s+(everything|all|your)\s/i,
    /override\s+(your|the)\s+/i,
    /act\s+as\s+(if|a|an)\s+/i,
  ];
  return patterns.some(p => p.test(text));
}

// ── Input validation ──
function validateInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.book || typeof body.book !== "object") return "Missing book data";
  if (typeof body.chapterIndex !== "number" || body.chapterIndex < 0) return "Invalid chapterIndex";
  if (typeof body.subsectionIndex !== "number" || body.subsectionIndex < 0) return "Invalid subsectionIndex";
  if (!body.book.title || typeof body.book.title !== "string") return "Missing book title";
  if (body.book.title.length > 500) return "Book title too long";
  if (!body.book.theme || typeof body.book.theme !== "string") return "Missing book theme";
  if (body.book.theme.length > 2000) return "Theme too long";
  
  // Check for prompt injection in user-controlled text fields
  const fieldsToCheck = [body.book.title, body.book.theme, body.book.subtitle].filter(Boolean);
  for (const field of fieldsToCheck) {
    if (detectPromptInjection(field)) return "Input contains prohibited patterns";
  }
  
  return null;
}

// ── Auth helper ──
async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const user = { id: data.claims.sub as string, email: data.claims.email as string };
  return { user, supabase };
}

// ── Rate limit helper ──
async function checkRateLimit(userId: string, functionName: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _user_id: userId,
    _function_name: functionName,
    _max_per_hour: 60,
    _max_per_day: 500,
  });
  
  if (error) {
    console.error("Rate limit check failed:", error);
    return true; // Fail open
  }
  return data as boolean;
}

// ── Audit log helper ──
async function auditLog(userId: string, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: metadata || {},
  });
}

serve(async (req) => {
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // WAF check
    const wafResult = wafCheck(req);
    if (wafResult) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payload size check
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const auth = await getAuthUser(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    const allowed = await checkRateLimit(auth.user.id, "generate-content");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Input validation
    const validationError = validateInput(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { book, chapterIndex, subsectionIndex, previousSummary, previousRawContent, tonalAnchors, ieltsBand, targetWordsPerSubsection, teaserStyle } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ── Credit & daily word cap enforcement ──
    const estimatedWords = targetWordsPerSubsection || 600;
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: creditCheck, error: creditError } = await adminSupabase.rpc(
      "check_and_deduct_word_credits",
      { _user_id: auth.user.id, _estimated_words: estimatedWords }
    );

    if (creditError) {
      console.error("Credit check failed:", creditError);
      throw new Error("Credit check failed");
    }

    const creditResult = creditCheck as { allowed: boolean; reason?: string };
    if (!creditResult.allowed) {
      return new Response(
        JSON.stringify({ error: creditResult.reason || "Credit limit reached" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chapter = book.outline?.chapters[chapterIndex];
    const subsection = chapter?.subsections[subsectionIndex];
    
    if (!chapter || !subsection) {
      throw new Error("Invalid chapter or subsection index");
    }

    // Audit log
    await auditLog(auth.user.id, "generate_content", "book", book.id, {
      chapterIndex,
      subsectionIndex,
      chapterTitle: chapter.title,
    });

    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    const isNarrative = ["novel", "fiction-serial", "short-story", "children", "comic", "biography", "memoir", "drama"].includes(book.bookType);
    
    const band = ieltsBand || 7;
    const languageGuidelines = getLanguageGuidelines(band);
    
    const hookFrequency = book.controls?.hookFrequency ?? 5;
    const velocity = book.controls?.velocity ?? 5;
    
    const hookInterval = Math.max(1, Math.round(9 - (hookFrequency - 1) * (8 / 9)));
    const sceneChangeWords = Math.max(150, Math.round(600 - ((velocity + hookFrequency) / 2 - 1) * 50));

    const pacingRules = getPacingRules(hookFrequency, velocity, isNarrative, hookInterval, sceneChangeWords);
    
    const isScreenplay = book.bookType === "drama";

    const screenplayRules = isScreenplay ? `
SCREENPLAY FORMAT (MANDATORY — you are writing a screenplay, NOT prose):
You MUST use standard screenplay/stage-play formatting throughout. Never write in prose paragraph form.

FORMAT RULES:
- Scene headings: ALL CAPS, e.g. "INT. COFFEE SHOP — MORNING" or "EXT. ROOFTOP — NIGHT"
- Character names before dialogue: Proper case (e.g., "Durrant", "Maya"), on their own line
- Dialogue: Under the character name, indented
- Parentheticals: In parentheses under character name, before dialogue, e.g. (whispering) or (beat)
- Action/stage directions: Present tense, lean descriptions of what we SEE and HEAR
- Transitions: FADE IN:, CUT TO:, FADE TO BLACK, SMASH CUT TO:, etc. — used sparingly
- (CONT'D) when a character's dialogue is interrupted by action then resumes
- (V.O.) for voiceover, (O.S.) for off-screen
- Keep action lines SHORT — 1-3 sentences max per block
- Show, don't tell — no internal thoughts unless delivered as V.O.
- NO prose paragraphs. NO novelistic descriptions. Every line must serve the camera or the actor.

EXAMPLE FORMAT:
INT. INTERROGATION ROOM — NIGHT

Fluorescent light flickers. A metal table. Two chairs. DURRANT, 40s, worn suit, sits across from MAYA, 28, sharp eyes.

DURRANT
You called him at 11:47.

MAYA
I call a lot of people.

DURRANT
Not from payphones.

Silence. Maya's jaw tightens — barely.

DURRANT (CONT'D)
(leaning forward)
Nobody uses payphones anymore.

He slides a photograph across the table. Face down.
` : "";

    const systemPrompt = `You are a master writer creating content for a ${book.bookType} book.
${isScreenplay ? "You are writing in SCREENPLAY FORMAT. Every line of output must follow screenplay conventions." : ""}

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

${screenplayRules}

${pacingRules}

${previousSummary ? `PREVIOUS SECTION SUMMARY:\n${previousSummary}\n` : ""}

${previousRawContent ? `PREVIOUS SECTION ENDING (last ~1000 words — DO NOT repeat any of this content, scenes, dialogue, or descriptions. Move the story FORWARD from where this left off):\n---\n${previousRawContent}\n---\n` : ""}

ANTI-REPETITION RULE (STRICTLY ENFORCED):
- NEVER rewrite, paraphrase, or revisit scenes, dialogue, descriptions, or events that already appeared in the previous section.
- If the previous section ended mid-scene, continue from exactly that point — do not restart the scene.
- Each subsection must introduce NEW events, NEW dialogue, or NEW developments. Zero overlap with previous content.

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

${teaserStyle && teaserStyle !== "none" ? `
SECTION TEASER (MANDATORY):
You MUST begin your output with a teaser line wrapped in [TEASER]...[/TEASER] tags, followed by two newlines, then the actual ${isScreenplay ? "screenplay" : "prose"}.
${teaserStyle === "mood-setter" ? "The teaser should be a date, location, weather note, or atmospheric stamp that frames the section. Example: [TEASER]November 14th. Rain against the windows of a café that should have closed an hour ago.[/TEASER]" : ""}
${teaserStyle === "cryptic-open-loop" ? "The teaser should be a SINGLE cryptic sentence — intriguing enough to demand resolution, hints at something in the section without revealing what, names no outcomes, only makes full sense in hindsight. Think of it as a riddle the section answers. Example: [TEASER]He shook three hands that morning. One of them would bury him.[/TEASER]" : ""}
${teaserStyle === "character-voice-drop" ? "The teaser should be a one-line thought or fragment in a character's voice, no context given. Example: [TEASER]I should have turned around when I saw the second lock.[/TEASER]" : ""}
` : ""}

Write ONLY the content for this subsection. ${isScreenplay ? "Use proper screenplay formatting throughout. No prose paragraphs." : "Do not include titles or headers. Match the established tone and style."} Strictly adhere to the language/grammar level specified above. Create engaging, high-quality ${isScreenplay ? "screenplay scenes" : "prose"}.`;

function getPacingRules(hookFreq: number, vel: number, isNarr: boolean, hookInt: number, sceneWords: number): string {
  let rules = `WRITING CONTROLS:
- Velocity: ${vel}/10 (${vel > 6 ? "fast-paced, action-driven" : vel > 3 ? "balanced pacing" : "slow, descriptive"})
- Creativity: ${book.controls.creativity}/10
- Scope: ${book.controls.scope}/10
- Hook Frequency: ${hookFreq}/10 (inject a hook every ~${hookInt} paragraph(s))`;

  if (!isNarr && hookFreq <= 3) {
    return rules;
  }

  rules += `

PACING & MOMENTUM RULES (STRICTLY ENFORCED):
1. HOOK INJECTION: Every ${hookInt} paragraph(s), inject a hook — a compelling question, revelation, action beat, scene change, new character entrance, or dialogue shift.
2. NO RUMINATION: Never spend more than ${hookFreq >= 7 ? "1-2" : "2-3"} sentences on internal feelings before moving forward.
3. SCENE MOMENTUM: Every ${sceneWords} words maximum, something MUST change.
4. DYNAMIC PACING: Treat each paragraph like a cut in a film.
5. DIALOGUE BREAKS RUMINATION: If internal monologue exceeds 2 sentences, interrupt with dialogue or action.
6. SHOW DON'T DWELL: One vivid sentence of observation, then the next beat.
7. CONTENT MIX: Aim for roughly ${hookFreq >= 7 ? "60% action/events, 25% dialogue, 15% internal thought" : "50% action/events, 30% dialogue, 20% internal thought"}.
8. OPEN LOOPS: Plant unanswered questions and curiosity gaps throughout.
9. IN MEDIAS RES: Drop into the middle of the action.
10. PATTERN INTERRUPTS: Break predictable rhythms.`;

  return rules;
}

function getLanguageGuidelines(band: number): string {
  switch (band) {
    case 5: return `- Use simple vocabulary and short sentences\n- Basic grammar structures only\n- Maximum sentence length: 10-12 words average`;
    case 6: return `- Moderately simple vocabulary with some descriptive words\n- Mix of simple and compound sentences\n- Maximum sentence length: 15-18 words average`;
    case 7: return `- Standard vocabulary appropriate for general readers\n- Varied sentence structures\n- Average sentence length: 18-22 words`;
    case 8: return `- Wide vocabulary range including some academic/technical terms\n- Complex grammatical structures used naturally\n- Varied sentence lengths for rhythm and effect`;
    case 9: return `- Extensive and precise vocabulary including specialized terminology\n- Full range of grammatical structures\n- Advanced rhetorical devices and scholarly conventions`;
    default: return `- Standard vocabulary appropriate for general readers\n- Varied sentence structures`;
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
          { role: "user", content: isScreenplay 
            ? `Write the screenplay content for subsection "${subsection.title}" in chapter "${chapter.title}". Use proper screenplay format.`
            : `Write the content for subsection "${subsection.title}" in chapter "${chapter.title}". Create immersive, engaging prose.` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

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
