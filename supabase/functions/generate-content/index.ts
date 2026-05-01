import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// ── Security Config ──
const MAX_PAYLOAD_BYTES = 200_000;

// ── In-memory novel-text cache (per Deno isolate) ──
// Key: novel_full_v1_{novel_id}_{total_char_count}
// Value: { text, expires }
const NOVEL_TEXT_CACHE = new Map<string, { text: string; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTEXT_CHARS = 100_000;

function getCachedNovelText(key: string): string | null {
  const entry = NOVEL_TEXT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { NOVEL_TEXT_CACHE.delete(key); return null; }
  return entry.text;
}
function setCachedNovelText(key: string, text: string) {
  NOVEL_TEXT_CACHE.set(key, { text, expires: Date.now() + CACHE_TTL_MS });
  // Light eviction: cap to 200 entries
  if (NOVEL_TEXT_CACHE.size > 200) {
    const oldest = NOVEL_TEXT_CACHE.keys().next().value;
    if (oldest) NOVEL_TEXT_CACHE.delete(oldest);
  }
}
function trimToSentenceBoundary(textChunk: string): string {
  const matches = [...textChunk.matchAll(/[.!?]\s+[A-Z]/g)];
  if (matches.length === 0) return textChunk;
  const last = matches[matches.length - 1];
  return textChunk.slice((last.index || 0) + 1);
}

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
  
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) return null;
      return { user: { id: userData.user.id, email: userData.user.email || "" }, supabase };
    }
    return { user: { id: data.claims.sub as string, email: data.claims.email as string }, supabase };
  } catch {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) return null;
      return { user: { id: userData.user.id, email: userData.user.email || "" }, supabase };
    } catch {
      return null;
    }
  }
}

// ── Rate limit helper ──
async function checkRateLimit(userId: string, functionName: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _user_id: userId, _function_name: functionName, _max_per_hour: 60, _max_per_day: 500,
  });
  if (error) { console.error("Rate limit check failed:", error); return true; }
  return data as boolean;
}

// ── Audit log helper ──
async function auditLog(userId: string, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.from("audit_logs").insert({ user_id: userId, action, resource_type: resourceType, resource_id: resourceId, metadata: metadata || {} });
}

// ── Language guidelines ──
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

// ── Pacing rules ──
function getPacingRules(hookFreq: number, vel: number, isNarr: boolean, hookInt: number, sceneWords: number, controls: any): string {
  let rules = `WRITING CONTROLS:
- Velocity: ${vel}/10 (${vel > 6 ? "fast-paced, action-driven" : vel > 3 ? "balanced pacing" : "slow, descriptive"})
- Creativity: ${controls.creativity}/10
- Scope: ${controls.scope}/10
- Hook Frequency: ${hookFreq}/10 (inject a hook every ~${hookInt} paragraph(s))`;

  if (!isNarr && hookFreq <= 3) return rules;

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

// ── Build system prompt (STATIC portion for cache optimization) ──
function buildStaticSystemPrompt(book: any, band: number, isScreenplay: boolean, isChildren: boolean, isComic: boolean, isNarrative: boolean, controls: any): string {
  const languageGuidelines = getLanguageGuidelines(band);
  const hookFrequency = controls?.hookFrequency ?? 5;
  const velocity = controls?.velocity ?? 5;
  const hookInterval = Math.max(1, Math.round(9 - (hookFrequency - 1) * (8 / 9)));
  const sceneChangeWords = Math.max(150, Math.round(600 - ((velocity + hookFrequency) / 2 - 1) * 50));
  const pacingRules = getPacingRules(hookFrequency, velocity, isNarrative, hookInterval, sceneChangeWords, controls);

  const screenplayRules = isScreenplay ? `
SCREENPLAY FORMAT (MANDATORY — you are writing a screenplay, NOT prose):
You MUST use standard screenplay/stage-play formatting throughout. Never write in prose paragraph form.

FORMAT RULES:
- Scene headings: ALL CAPS, e.g. "INT. COFFEE SHOP — MORNING" or "EXT. ROOFTOP — NIGHT"
- Character names before dialogue: Proper case, on their own line
- Dialogue: Under the character name, indented
- Parentheticals: In parentheses under character name, before dialogue
- Action/stage directions: Present tense, lean descriptions
- Transitions: FADE IN:, CUT TO:, FADE TO BLACK, SMASH CUT TO: — used sparingly
- Keep action lines SHORT — 1-3 sentences max per block
- Show, don't tell — no internal thoughts unless delivered as V.O.
- NO prose paragraphs. Every line must serve the camera or the actor.
` : "";

  const childrensEngineRules = isChildren ? `
CHILDREN'S BOOK ENGINE (AGE-AWARE, SIMPLE, VISUAL-FIRST) — STRICTLY ENFORCED:
You are a structured children's book creation engine for ages 1–9. Generate simple, engaging, age-appropriate stories with strong visuals and emotional clarity.

CORE PRINCIPLES:
- Use simple vocabulary a young child can follow.
- Use short sentences. 2–3 sentences per paragraph (1–3 absolute max).
- Use clear emotional cues (happy, scared, brave, surprised, kind).
- Maintain linear storytelling — beginning (setup), middle (problem), resolution (clear ending).
- Each section: 2–5 paragraphs maximum.

CHARACTER DESIGN:
- Only 1–3 main characters total across the book.
- Each character has one or two clear traits: kind, curious, brave, shy, playful.
- No complex motivations, no moral grey areas.

STORY RULES:
- One main problem only. No subplots.
- Clear cause → effect chain. Every event leads naturally to the next.

TONE RULES:
- Warm, positive, encouraging.
- No dark themes, no fear without resolution, no violence, no death, no scary imagery.

INTERACTION ELEMENTS (use sparingly, where natural):
- Gentle repetition for rhythm ("And then…", "Again and again…").
- Soft questions to the reader ("What do you think happened next?") only if the section calls for it.

COMPLETION RULE:
- The book is complete when the problem is resolved clearly, an emotional lesson is delivered, and the ending is satisfying and simple.

META RULE: Clarity > creativity. Simplicity > complexity.
` : "";

  const comicEngineRules = isComic ? `
COMIC / GRAPHIC NOVEL ENGINE (PANEL-BASED, VISUAL-FIRST STORYTELLING) — STRICTLY ENFORCED:
You are a structured comic creation engine. Story is told through panels, dialogue, and visual action. Text must be minimal. Visuals carry the narrative.

OUTPUT FORMAT (MANDATORY):
Each subsection is a SCENE made of 4–8 PANELS. Output panels as plain prose blocks in this exact pattern, one panel after another, with a blank line between panels:

PANEL 1
Description: [what is happening visually — characters, setting, action, lighting, mood]
Camera: [close-up | medium | wide | over-the-shoulder | bird's-eye | low-angle]
Emotion: [the dominant feeling of the panel]
[CHARACTER NAME]: "Short, punchy line of dialogue."
[CHARACTER NAME]: "Another short line."
(Caption or SFX in parentheses if needed: BOOM, WHOOSH, "Later that night…")

PANEL 2
…and so on.

PANEL RULES:
- 4–8 panels per scene. Never fewer than 4, never more than 8.
- Every panel must include a Description and a Camera angle. Emotion is required when characters are present.
- Dialogue is optional per panel — silent visual panels are encouraged for pacing.
- Dialogue lines must be SHORT and punchy. No long paragraphs. Natural speech only.
- Captions (narration) are allowed sparingly — wrap them in parentheses, e.g. (Three days later.).
- SFX are allowed in parentheses, e.g. (CRASH!), (whisper).

VISUAL DIRECTION:
- Each panel's Description must specify: character appearance and pose, environment, lighting, and mood.
- Recurring characters keep a consistent visual identity (clothing, hair, distinguishing features) across all panels.
- Show, don't tell. Action and expression carry meaning — never narrate inner monologue.

PACING:
- Each scene must move the story forward — introduce or escalate conflict.
- End every scene with tension, a beat of emotion, or a clean transition into the next scene.
- Never stall. No filler panels.

COMPLETION:
- The story ends when the main conflict is resolved and a final emotional payoff is delivered.

META RULE: Show > tell. Panels > paragraphs.
` : "";

  const userBannedWords: string[] = Array.isArray(controls?.bannedWords) ? controls.bannedWords : [];
  const bannedWordsBlock = userBannedWords.length > 0
    ? `\n- The following words and their close variants MUST NEVER appear in the output: ${userBannedWords.join(", ")}.`
    : "";

  const genreRaw = (book.genre || "").toString().toLowerCase();
  const isChaseGenre = isNarrative && /(crime|detective|thriller|mystery|noir|hard[- ]?boiled)/.test(genreRaw);
  const chaseStyleProfile = isChaseGenre ? `
JAMES HADLEY CHASE STYLE PROFILE (MANDATORY — this book's genre is "${book.genre}"):
- Channel James Hadley Chase, with shades of Raymond Chandler, Dashiell Hammett, and Lee Child. Hard-boiled, lean, cinematic, ruthless.
- Sentences are short, muscular, and concrete. Cut every spare word. Verbs do the work; adjectives earn their place.
- Dialogue is clipped, loaded, and dangerous. Characters say less than they mean. Subtext carries the weight. Never explain a line of dialogue.
- Every scene smells, tastes, and sweats: cigarette smoke, cheap bourbon, wet asphalt, gun oil, perfume cutting through fear. Use sensory specifics, never abstractions.
- Violence is sudden, ugly, and brief. Suggest more than you show; the cut to the next beat hits harder than the punch itself.
- Women are written with menace and allure intact — never as decoration. Men carry damage in their hands, their silence, the way they pour a drink.
- Settings are seedy, neon-lit, rain-slick, sun-bleached. Hotel rooms with thin walls. Diners at 3 a.m. Empty highways. The world feels like it owes the protagonist nothing.
- Suspense rises through what is withheld, not what is told. End scenes one beat before the reader is ready. Leave the door half-open.
- No moralising. No interior philosophising. No purple prose. The story judges no one; the reader does.
- Pace: relentless. Every paragraph either tightens the screw, plants a knife, or pays one off.
- Tone words to lean into: cold, steady, taut, dry, neon, smoke, edge, weight, glass, blood. Tone words to avoid: lovely, beautiful, magical, wonderful, gentle (unless ironic).` : "";

  return `You are a master writer creating content for a ${book.bookType} book.
${isScreenplay ? "You are writing in SCREENPLAY FORMAT. Every line of output must follow screenplay conventions." : ""}
${isChildren ? "You are writing a CHILDREN'S BOOK for ages 1–9. Every line must obey the Children's Book Engine rules below." : ""}
${isComic ? "You are writing a COMIC / GRAPHIC NOVEL. Every subsection must be delivered as panel-based output following the Comic Engine rules below." : ""}

BOOK CONTEXT:
- Title: "${book.title}"
- Theme: ${book.theme}
- Genre: ${book.genre || "General"}
- Audience: ${book.audience}
- POV: ${book.pov}
- Tone: ${book.toneProfile.primary} (formality: ${book.toneProfile.formality}/10, emotion: ${book.toneProfile.emotionalIntensity}/10)

LANGUAGE & GRAMMAR LEVEL (IELTS Band ${band}):
${languageGuidelines}

${screenplayRules}
${childrensEngineRules}
${comicEngineRules}

${pacingRules}
${chaseStyleProfile}

ANTI-REPETITION RULE (STRICTLY ENFORCED):
- NEVER rewrite, paraphrase, or revisit scenes, dialogue, descriptions, or events that already appeared in the previous section.
- If the previous section ended mid-scene, continue from exactly that point — do not restart the scene.
- Each subsection must introduce NEW events, NEW dialogue, or NEW developments. Zero overlap with previous content.

${isNarrative && !isChildren ? `CHARACTER DESCRIPTION (MANDATORY for every narrative book — novel, serial, short story, biography, memoir, drama, comic):
- When a character first appears in a scene, render them in the tradition of James Hadley Chase: lean, sensory, and instantly cinematic.
- Show physical specifics that imply personality — the cut of the jaw, the set of the mouth, the weight behind the eyes, the fall of the hair, the way the suit hangs on the shoulders, the shoes, the hands, the smell of cologne or sweat or rain.
- Layer in posture, gait, micro-expressions, and the small habits that betray inner life (a thumb worried over a ring, a glance held a beat too long, a smile that does not reach the eyes).
- Anchor the description in the viewpoint character's reaction — what attracts, repels, threatens, or unsettles them about this person.
- Do NOT dump a paragraph of static description. Weave the details into action, dialogue, and movement so the reader sees the character without ever feeling told.
- Recurring characters must keep their established physical signature — never contradict earlier descriptions; deepen them with new angles instead.
- Aim for descriptions that are vivid enough that a reader could close their eyes and recognise the character on a crowded street.` : ""}

FORMAT & WORD BAN RULES (STRICTLY ENFORCED):
- NEVER use markdown formatting such as **, *, ##, or any other markdown syntax in your output. Write in plain prose only.
- NEVER use the word "magic" or "magical" in any context. Find more specific, vivid alternatives.
- Do not use asterisks for emphasis.
- NEVER prefix any line with literal labels like "Hook:", "Teaser:", "Scene:", "Beat:", "Note:", "[HOOK]", "[TEASER]", or any meta-tag. Hooks and teasers must read as natural narrative — the reader must never be told they are reading a hook or a teaser.
- If a teaser or hook is required, write it as ordinary prose that opens the section organically. No tags, no brackets, no labels of any kind.${bannedWordsBlock}`;
}

// ── Build variable user prompt (changes per subsection) ──
function buildVariablePrompt(
  book: any, chapter: any, subsection: any,
  previousNovelText: string | undefined,
  previousSummary: string | undefined, previousRawContent: string | undefined,
  tonalAnchors: string[] | undefined, teaserStyle: string | undefined,
  isScreenplay: boolean, isChildren: boolean, isComic: boolean,
  targetWordsPerSubsection: number | undefined,
  reqAutomationLevel: string | undefined
): string {
  let prompt = `CURRENT POSITION:
- Chapter ${chapter.chapterNumber}: "${chapter.title}"
- Subsection: "${subsection.title}"
- Goal: ${subsection.goal || "Continue the narrative"}

`;

  if (previousNovelText && previousNovelText.length > 0) {
    prompt += `[PREVIOUS_NOVEL_TEXT] (the entire prior novel text, verbatim — DO NOT repeat any of this content; continue seamlessly from where it ends):
---
${previousNovelText}
---

`;
  } else {
    if (previousSummary) prompt += `PREVIOUS SECTION SUMMARY:\n${previousSummary}\n\n`;
    if (previousRawContent) {
      prompt += `PREVIOUS SECTION ENDING (last ~1000 words — DO NOT repeat any of this content):\n---\n${previousRawContent}\n---\n\n`;
    }
  }

  if (tonalAnchors?.length > 0) {
    prompt += `TONAL ANCHORS (match this style):\n${tonalAnchors.join("\n\n")}\n\n`;
  }

  if (isChildren) {
    prompt += `CHILDREN'S BOOK SECTION REQUIREMENTS:
- Write 100-250 words maximum for this section.
- 2–5 short paragraphs. Each paragraph 1–3 sentences (target 2–3).
- Use simple, vivid words a 1–9 year-old child can follow.
- Include warm dialogue and clear action.
- Show one clear emotion arc: setup → small problem → reassurance.
- Add sensory cues a young child notices (colors, sounds, textures, tastes).
- End the section with a soft hook OR a gentle resolution beat.\n\n`;
  } else if (isComic) {
    prompt += `COMIC SECTION REQUIREMENTS:
- Output this subsection as 4–8 PANELS using the panel format defined in the system rules.
- Every panel: PANEL N header line, then "Description:", "Camera:", "Emotion:", optional dialogue lines, optional caption/SFX in parentheses.
- Keep dialogue short and punchy. No prose paragraphs anywhere in the output.
- Maintain consistent visual identity for any character that appeared in earlier panels.
- End the scene with tension or a clean transition into the next scene.\n\n`;
  } else if (reqAutomationLevel === "guided") {
    prompt += `GUIDED MODE — HARD LIMIT (STRICTLY ENFORCED):
- Write EXACTLY 2–3 sentences. No more.
- Total output must be under 80 words.\n\n`;
  } else {
    prompt += `Write approximately ${targetWordsPerSubsection || 600} words for this subsection.\n\n`;
  }

  if (teaserStyle && teaserStyle !== "none" && !isComic && !isChildren) {
    prompt += `SECTION OPENING STYLE:
Open this section with a single line in the "${teaserStyle}" style — but write it as plain prose. Do NOT label it. Do NOT wrap it in any tags or brackets. Do NOT prefix it with words like "Hook:", "Teaser:", or similar. The opening line must read as natural narrative that the reader experiences without any meta-commentary.
${teaserStyle === "mood-setter" ? "It should evoke a date, location, weather, or atmospheric stamp." : ""}
${teaserStyle === "cryptic-open-loop" ? "It should be a single cryptic, intriguing sentence." : ""}
${teaserStyle === "character-voice-drop" ? "It should be a one-line thought or fragment in a character's voice." : ""}\n\n`;
  }

  if (isComic) {
    prompt += `Write ONLY the panels for this subsection, in the panel format. Do not include titles, headers, or any meta-labels.`;
  } else if (isChildren) {
    prompt += `Write ONLY the prose for this section. No titles, no headers, no meta-labels. Keep it warm, simple, and child-safe.`;
  } else {
    prompt += `Write ONLY the content for this subsection. ${isScreenplay ? "Use proper screenplay formatting throughout." : "Do not include titles or headers. Do not include any meta-labels like \"Hook:\" or \"Teaser:\". Match the established tone and style."} Create engaging, high-quality ${isScreenplay ? "screenplay scenes" : "prose"}.`;
  }

  return prompt;
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
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payload size check
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const auth = await getAuthUser(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit(auth.user.id, "generate-content");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const validationError = validateInput(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { book, chapterIndex, subsectionIndex, previousSummary, previousRawContent, tonalAnchors, ieltsBand, targetWordsPerSubsection, teaserStyle, automationLevel: reqAutomationLevel } = body;

    // ── Credit & daily word cap enforcement ──
    const estimatedWords = targetWordsPerSubsection || 600;
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: creditCheck, error: creditError } = await adminSupabase.rpc(
      "check_and_deduct_word_credits",
      { _user_id: auth.user.id, _estimated_words: estimatedWords }
    );

    if (creditError) { console.error("Credit check failed:", creditError); throw new Error("Credit check failed"); }

    const creditResult = creditCheck as { allowed: boolean; reason?: string };
    if (!creditResult.allowed) {
      return new Response(
        JSON.stringify({ error: creditResult.reason || "Credit limit reached" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chapter = book.outline?.chapters[chapterIndex];
    const subsection = chapter?.subsections[subsectionIndex];
    if (!chapter || !subsection) throw new Error("Invalid chapter or subsection index");

    // Audit log
    await auditLog(auth.user.id, "generate_content", "book", book.id, { chapterIndex, subsectionIndex, chapterTitle: chapter.title });

    const isChildren = book.bookType === "children";
    const isComic = book.bookType === "comic";
    const isChildrensBook = isChildren || isComic; // legacy: skip full-text caching for these
    const isNarrative = ["novel", "fiction-serial", "short-story", "children", "comic", "biography", "memoir", "drama"].includes(book.bookType);
    const isScreenplay = book.bookType === "drama";
    const band = ieltsBand || 7;

    // ── Fetch full prior novel text (with in-memory cache) for narrative books ──
    let previousNovelText: string | undefined;
    if (isNarrative && book.id && !isChildrensBook) {
      try {
        // Lookup current char count to build cache key (changes invalidate cache)
        const { data: bookRow } = await adminSupabase
          .from("books")
          .select("full_text, total_char_count, user_id")
          .eq("id", book.id)
          .maybeSingle();

        if (bookRow && bookRow.user_id === auth.user.id) {
          const charCount = bookRow.total_char_count || 0;
          const cacheKey = `novel_full_v1_${book.id}_${charCount}`;
          let cached = getCachedNovelText(cacheKey);
          if (!cached) {
            let fullText = bookRow.full_text || "";
            if (fullText.length > MAX_CONTEXT_CHARS) {
              fullText = trimToSentenceBoundary(fullText.slice(-MAX_CONTEXT_CHARS));
            }
            setCachedNovelText(cacheKey, fullText);
            cached = fullText;
            console.log(`[novel-cache] MISS key=${cacheKey} chars=${fullText.length}`);
          } else {
            console.log(`[novel-cache] HIT key=${cacheKey} chars=${cached.length}`);
          }
          previousNovelText = cached;
        }
      } catch (e) {
        console.warn("[novel-cache] full_text fetch failed:", e);
      }
    }

    // ── Build prompts with cache-optimized structure ──
    // Static system prompt = CACHE ANCHOR (identical across subsections of same book)
    const systemPrompt = buildStaticSystemPrompt(book, band, isScreenplay, isChildren, isComic, isNarrative, book.controls);
    
    // Variable user prompt = changes per subsection (not cached)
    const userPrompt = buildVariablePrompt(
      book, chapter, subsection,
      previousNovelText,
      previousSummary, previousRawContent, tonalAnchors, teaserStyle,
      isScreenplay, isChildren, isComic, targetWordsPerSubsection, reqAutomationLevel
    );

    // ── Choose AI provider: DeepSeek (preferred for novels) vs Lovable AI (fallback) ──
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const useDeepSeek = !!DEEPSEEK_API_KEY;
    
    if (!useDeepSeek && !LOVABLE_API_KEY) {
      throw new Error("No AI API key configured");
    }

    let response: Response;

    if (useDeepSeek) {
      // ── DeepSeek with automatic prefix caching ──
      // DeepSeek caches the PREFIX of the prompt automatically.
      // By putting the static system prompt first, all subsections of the same book
      // share the cached prefix → 90% cheaper input tokens on cache hits.
      // Cache hit tokens: $0.03/M, Cache miss: $0.30/M, Output: $0.50/M
      console.log("[generate-content] Using DeepSeek with prefix caching");
      
      response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      });
    } else {
      // ── Lovable AI Gateway fallback ──
      console.log("[generate-content] Using Lovable AI Gateway");
      
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      });
    }

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
      console.error(`AI error (${useDeepSeek ? "DeepSeek" : "Lovable"}):`, response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    // ── Helper: append generated text to book.full_text and invalidate cache ──
    const finalizeFullText = async (newContent: string) => {
      if (!isNarrative || isChildrensBook || !book.id) return;
      try {
        const { data: row } = await adminSupabase
          .from("books")
          .select("full_text, total_char_count, user_id")
          .eq("id", book.id)
          .maybeSingle();
        if (!row || row.user_id !== auth.user.id) return;
        const oldCharCount = row.total_char_count || 0;
        const updated = ((row.full_text || "") + (row.full_text ? "\n\n" : "") + newContent).slice(-500_000); // safety cap 500k
        const newCharCount = updated.length;
        await adminSupabase
          .from("books")
          .update({ full_text: updated, total_char_count: newCharCount })
          .eq("id", book.id);
        // Invalidate any cached entry for the prior char count
        NOVEL_TEXT_CACHE.delete(`novel_full_v1_${book.id}_${oldCharCount}`);
        console.log(`[novel-cache] invalidated old key, new chars=${newCharCount}`);
      } catch (e) {
        console.warn("[novel-cache] full_text update failed:", e);
      }
    };

    // ── Strip leftover meta-labels the model may emit ──
    const stripMetaLabels = (s: string) =>
      s
        .replace(/^\s*(?:Hook|Teaser|Scene|Beat|Note)\s*:\s*/gim, "")
        .replace(/\[\/?(?:HOOK|TEASER|SCENE|BEAT|NOTE)\]/gi, "");

    // ── For DeepSeek reasoner, we need to filter out reasoning_content from SSE ──
    if (useDeepSeek) {
      // DeepSeek reasoner streams with reasoning_content + content fields.
      // We only want the final content, not the thinking tokens.
      const reader = response.body!.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let collected = "";

      const stream = new ReadableStream({
        async pull(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              // Persist the cleaned full content
              const cleaned = stripMetaLabels(collected).trim();
              if (cleaned) finalizeFullText(cleaned);
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                // Only forward content tokens, skip reasoning_content
                if (delta?.content) {
                  collected += delta.content;
                  const forwarded = {
                    ...parsed,
                    choices: [{
                      ...parsed.choices[0],
                      delta: { content: delta.content }
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(forwarded)}\n\n`));
                }
                // Log cache stats from usage if present (final chunk)
                if (parsed.usage) {
                  const u = parsed.usage;
                  console.log(`[DeepSeek Cache] hit: ${u.prompt_cache_hit_tokens || 0}, miss: ${u.prompt_cache_miss_tokens || 0}, total: ${u.prompt_tokens || 0}`);
                }
              } catch {
                // Pass through unparseable lines
              }
            }
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Lovable AI — wrap stream to also collect content for full_text persistence
    {
      const reader = response.body!.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let collected = "";

      const stream = new ReadableStream({
        async pull(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              const cleaned = stripMetaLabels(collected).trim();
              if (cleaned) finalizeFullText(cleaned);
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            // Forward as-is to client
            controller.enqueue(value);
            // Best-effort parse to collect text
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const c = parsed.choices?.[0]?.delta?.content;
                if (c) collected += c;
              } catch { /* ignore */ }
            }
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
  } catch (error) {
    console.error("generate-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
