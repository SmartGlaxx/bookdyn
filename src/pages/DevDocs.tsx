import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const DOCS_CONTENT = `# Technical Blueprint — Book Generation Engine
Generated: ${new Date().toISOString().split("T")[0]}

---

## 1. Database Schema

### profiles
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid (PK) | — | References auth.users |
| full_name | text | '' | |
| plan | text | 'free' | free / starter / pro / business |
| credits_used | integer | 0 | Incremented per generation call |
| credits_limit | integer | 5 | Based on plan |
| credits_reset_at | timestamptz | now() | Aligned to Stripe billing cycle |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |
- **RLS**: Users can SELECT/INSERT/UPDATE own row only (auth.uid() = id)

### books
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid (PK) | gen_random_uuid() | |
| user_id | uuid | — | Owner |
| title | text | — | Required |
| subtitle | text | null | Optional |
| book_type | text | — | One of 29+ types |
| theme | text | — | Main topic/premise |
| genre | text | null | Fiction genre preset |
| audience | text | — | Target reader |
| pov | text | — | Point of view |
| status | text | 'planning' | planning → ready_to_write → writing → completed → paused |
| tone_profile | jsonb | — | {primary, secondary, intensity, formality, emotionalIntensity, humorLevel, authorityLevel} |
| controls | jsonb | — | Full BookControls object (see Section 8) |
| outline | jsonb | null | {chapters[], characters[], visualStyleGuide, openPromises[], resolvedPromises[]} |
| tonal_anchors | text[] | null | Tags like "witty", "academic", "suspenseful" |
| entities | text[] | null | Named entities for consistency |
| concepts | text[] | null | Core concepts/themes |
| current_chapter_index | integer | 0 | Resume position |
| current_subsection_index | integer | 0 | Resume position |
| word_count | integer | 0 | Running total |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |
- **RLS**: Full CRUD for own rows only (user_id = auth.uid())

### request_logs
- Rate limiting tracker: id, user_id, function_name, created_at
- **RLS**: SELECT own; INSERT/UPDATE/DELETE denied to client (service role only)

### audit_logs
- Action audit trail: id, user_id, action, resource_type, resource_id, metadata, created_at
- **RLS**: SELECT own rows only

---

## 2. Database Functions

### check_rate_limit(_user_id uuid, _function_name text, _max_per_hour int DEFAULT 60, _max_per_day int DEFAULT 500)
- Returns boolean (true = allowed, false = rate limited)
- Counts request_logs entries for user+function within 1hr and 24hr windows
- Called by every edge function before processing

### cleanup_old_request_logs
- Deletes request_logs older than 7 days
- Can be called via pg_cron or manual trigger

---

## 3. Authentication Setup

- **Method**: Email/password with MANDATORY email verification (auto_confirm_email: false)
- **OAuth**: Google OAuth configured
- **CAPTCHA**: Cloudflare Turnstile on signup form (verify-turnstile edge function validates token)
- **Password Reset**: Dedicated /reset-password page with token-based flow
- **Profile Creation**: Client-side upsert on first sign-in (checks if profile exists, creates if not)
- **Session Management**: Supabase auth session with automatic refresh

---

## 4. Edge Functions (Backend Functions)

### generate-outline
- **Input**: { title, theme, audience, bookType, genre, pov, controls, toneProfile, tonalAnchors, entities, concepts }
- **Output**: JSON with { chapters: [{ id, chapterNumber, title, subsections: [{ id, title, goal, imageOpportunity, teaser }] }], characters: [...], visualStyleGuide, openPromises, resolvedPromises }
- **Model**: Lovable AI (Gemini) with structured JSON output
- **Character extraction**: During outline generation, the AI is instructed to extract EVERY character mentioned — even background characters — and produce a full Character Index entry for each
- **Rate limited**: Via check_rate_limit RPC

### generate-content
- **Input**: { book context, chapter info, subsection info, previousSummary, allPriorContent }
- **Output**: Server-Sent Events (SSE) stream of generated prose
- **Context windowing strategy**:
  - Sends summary of ALL prior chapters (compressed via summarize-content)
  - Sends full content of current chapter's completed subsections
  - Sends current subsection's goal, teaser, and structure guidance
- **Rate limited**

### generate-characters
- **Input**: { outline, bookMetadata, visualStyleGuide }
- **Output**: JSON array of CharacterReference objects with exhaustive profiles
- **Scope**: Called for children/comic book types; for other types, characters come from the outline phase
- **Profile depth**: Identity, Appearance, Hair, Fashion, Voice & Mannerisms, Personality, Backstory, Story Role

### generate-image
- **Input**: { prompt, visualStyleGuide, width?, height? }
- **Output**: base64 image data
- **Rate limited**: 30/hr default
- **Uses**: Character portraits and chapter illustrations

### summarize-content
- **Input**: { content (full chapter text) }
- **Output**: Condensed summary (used for context windowing in subsequent chapters)
- **Called**: After each chapter completes to maintain cross-chapter continuity

### verify-turnstile
- **Input**: { token }
- **Output**: { success: boolean }
- Validates Cloudflare Turnstile CAPTCHA tokens server-side

### check-subscription
- **Input**: User JWT (from auth header)
- **Output**: { plan, credits_used, credits_limit, credits_reset_at }
- Calculates billing period from Stripe billing_cycle_anchor
- Auto-resets credits_used to 0 when new billing period detected

### create-checkout
- Creates Stripe Checkout session for plan upgrades
- Includes trial period configuration

### customer-portal
- Returns Stripe Customer Portal URL for self-service billing management

### manage-subscription
- Handles plan changes (upgrade/downgrade)
- Uses proration_behavior: "none" (changes apply at next billing cycle)

### stripe-webhook
- Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded
- Syncs plan and credits_limit to profiles table

---

## 5. Security Middleware (All Edge Functions)

Every edge function includes this security stack:
1. **CORS whitelisting**: Only allowed origins can call functions
2. **WAF layer**: Blocks known scanner/bot user agents
3. **Payload size validation**: 50KB max request body
4. **Prompt injection detection**: Scans input for known attack patterns (e.g., "ignore previous instructions", encoded injections)
5. **Rate limiting**: Via check_rate_limit RPC (per-user, per-function)
6. **JWT verification**: Validates Supabase auth token before processing

---

## 6. Book Generation Pipeline (useBookGeneration.ts)

### 5-Phase State Machine:
\`\`\`
idle → generating-outline → generating-characters → writing → summarizing → completed
\`\`\`

### Phase Details:
1. **generating-outline**: Calls generate-outline edge function. Saves full outline (chapters + Character Index + visual style guide) to book.outline JSONB column.

2. **generating-characters**: (children/comic only) Calls generate-characters, then generate-image for each character's portrait. Merges portraits into Character Index.

3. **writing**: Iterates through chapters and subsections sequentially. For each subsection:
   - Calls generate-content with SSE streaming
   - Displays text in real-time via LiveContentView
   - Saves content to outline after completion
   - Updates current_chapter_index and current_subsection_index in database

4. **generating-image**: (for supported book types with imageGeneration enabled) Generates chapter illustrations based on imageOpportunity prompts.

5. **summarizing**: After each chapter completes, calls summarize-content to create compressed summary for context windowing in subsequent chapters.

### Resilience Features:
- **Pause/Resume**: Persists exact position (chapter + subsection index). Resume picks up from saved position.
- **Exponential backoff**: 3 retries with increasing delays on transient failures
- **Progress persistence**: Saved to database after each subsection completes
- **Stop**: Gracefully halts generation, preserves all completed content

---

## 7. Book Types System (src/types/book.ts)

### 29+ Book Types across categories:

**Fiction**: novel, fiction-serial, short-story, children, comic, poetry, drama
**Non-Fiction**: biography, memoir, self-help, psychology, history, culture, travel, cookbook
**Business**: business, finance, accounting, economics
**Technical**: technology, programming, ai-ml, engineering
**Academic**: science-academic, science-popular, textbook, reference
**Other**: magazine, illustrated-guide, custom

### Each BookType defines:
- label, description, icon
- supportedPOVs (which POV options are available)
- supportedTones (which tones make sense)
- defaultControls (sensible defaults for that type)

### Audience Filtering:
Audiences are dynamically filtered based on book type to prevent illogical combinations:
- Children's books cannot target "Professionals" or "Academics"
- Technical books exclude "Children" audience
- "General Readers" is explicitly available for all non-fiction categories
- Horror is excluded from fiction genres
- "Beginners"/"Intermediate Learners" excluded from audience options

---

## 8. BookControls — The Full Control Surface

\`\`\`typescript
interface BookControls {
  // Core creative dials (all 1-10 scale)
  velocity: number;              // Narrative/conceptual pace
  scope: number;                 // Depth of detail
  creativity: number;            // Creative license
  hookFrequency: number;         // How often hooks/scene changes occur

  // Character/concept complexity
  entityComplexity: number;      // 1-10, depth of characters/concepts
  spatialScope: SpatialScope;    // single-location → universal
  perspectiveMultiplexing: number; // 1-10, parallel viewpoints/threads

  // Temporal context
  temporalContext: {
    era: TemporalEra;           // ancient → far-future → timeless
    timelineStructure: TimelineStructure; // linear, non-linear, circular, fragmented
    specificPeriod?: string;
  };

  // Structure
  structureControls: {
    chapterCount: "flexible" | "fixed";
    targetChapters?: number;
    sectionsPerChapter?: number; // 2-10, default 4
    subsectionCount: "flexible" | "fixed";
    targetSubsections?: number;
    titlesRequired: boolean;
    targetWordCount?: number;
  };

  // Meta
  automationLevel: AutomationLevel; // assisted, semi-autonomous, fully-autonomous
  depthLevel: DepthLevel;           // overview, intermediate, comprehensive, academic

  // Toggles
  imageGeneration: boolean;     // Generate images (disabled by default)
  autoResume: boolean;          // Auto-resume on page load
  divergenceAllowed: boolean;   // Allow AI to deviate from outline

  // Teaser
  teaserStyle: TeaserStyle;     // none, mood-setter, cryptic-open-loop, character-voice-drop
}
\`\`\`

### ToneProfile:
\`\`\`typescript
interface ToneProfile {
  primary: ToneLevel;            // formal, conversational, humorous, dramatic, poetic, technical, authoritative, reflective, neutral
  secondary?: ToneLevel;
  intensity: number;             // 1-10
  formality: number;             // 1-10
  emotionalIntensity: number;    // 1-10
  humorLevel: number;            // 1-10
  authorityLevel: number;        // 1-10
}
\`\`\`

### Word Count Presets:
Selected via categorical labels (not raw numbers):
- **Short**: ~15,000-25,000 words
- **Novella**: ~30,000-50,000 words
- **Standard**: ~60,000-80,000 words
- **Long**: ~90,000-120,000 words
- **Epic**: ~150,000+ words

---

## 9. Character Index System (formerly "Character Bible")

### Purpose:
A mandatory character database for every book project that enforces narrative consistency. Every individual mentioned in the outline receives an exhaustive profile.

### Character Roles (4 tiers):
1. **Protagonist** — Main character(s), full profile mandatory
2. **Supporting** — Important secondary characters, full profile
3. **Minor** — Named characters with limited screen time, partial profile
4. **Background** — Mentioned characters, minimal profile

### CharacterReference Schema:
\`\`\`typescript
interface CharacterReference {
  id: string;
  name: string;
  description: string;           // Brief summary
  visualDescription: string;     // For image generation prompts
  role: "protagonist" | "supporting" | "minor" | "background";
  portraitUrl?: string;          // Generated portrait image

  // 8 detailed profile sections:
  identity?: {
    fullName, aliases[], age, dateOfBirth, gender, pronouns,
    nationality, ethnicity, culturalBackground, nativeLanguage, accent
  };
  appearance?: {
    height, build, skinTone, faceShape, eyeColor, eyeShape,
    eyeDistinguishing, noseShape, lipShape, jawline, cheekbones,
    scars, birthmarks, tattoos, distinctiveMarks, hands
  };
  hair?: {
    color, texture, lengthAndStyle, casualStyle, formalStyle,
    changesAcrossStory
  };
  fashion?: {
    casualStyle, workAttire, formalWear, sleepwear, signatureItem,
    shoePreference, styleReflection, styleEvolution
  };
  voice?: {
    toneOfVoice, speechPatterns, accentStrength, nervousHabits,
    posture, defaultExpressions, laughStyle, angerStyle, fearStyle
  };
  personality?: {
    coreType, strengths[], flaws[], fears[], desires[],
    publicPersona, privateReality, treatmentOfStrangers, treatmentOfLovedOnes
  };
  backstory?: {
    upbringing, formativeEvents[], definingRelationships[],
    whatTheyLost, whatTheySeek
  };
  storyRole?: {
    archetype, relationshipToMainCharacter, goal, obstacle, arc
  };
}
\`\`\`

### UI (CharacterGallery component):
- Groups characters by role tier (Protagonist → Background)
- Compact mode: 4-column grid with avatar + name + role badge
- Expanded mode: 2-column grid with expandable accordion for full profile
- Each profile section has its own header and field display
- Portrait images displayed as rounded thumbnails (w-16 h-16 default, w-10 h-10 compact)
- Visual style guide shown as an italic quote with border-left accent

### How Characters Are Generated:
1. During \`generate-outline\`, the AI prompt instructs: "Extract EVERY character mentioned — including background characters — and produce a full Character Index entry with all profile sections populated where possible"
2. For children/comic types, \`generate-characters\` is called separately with the outline to produce richer visual descriptions
3. \`generate-image\` is then called for each character's portraitUrl using their visualDescription + the book's visualStyleGuide

---

## 10. Creation Engine (5-Step Form)

### Step 1: Choose Book Type
- Categories displayed as scrollable tabs: Fiction, Non-Fiction, Business, Technical, Academic, Other
- Each book type shown as a card with icon, label, and description
- Selecting a type auto-filters available audiences, POVs, tones, and genres
- Mobile-optimized: horizontal scroll tabs

### Step 2: Book Details
- Title (required, text input)
- Subtitle (optional)
- Theme/Premise (required, textarea — the core topic or story concept)
- Genre (dropdown, dynamically filtered by book type — fiction types get genre presets like "Sci-Fi", "Romance", etc.)
- Audience (dropdown, dynamically filtered — e.g., children's books can't target "Professionals")

### Step 3: Voice & Tone
- Point of View selector (card-based with labels + descriptions):
  - First Person, Second Person, Third Person Limited, Third Person Omniscient
  - Available options filtered by book type
- Tone Profile:
  - Primary tone (dropdown): formal, conversational, humorous, dramatic, poetic, technical, authoritative, reflective, neutral
  - Secondary tone (optional dropdown)
  - 5 sliders (1-10): Intensity, Formality, Emotional Intensity, Humor Level, Authority Level
- Tonal Anchors (multi-select tags): "witty", "dark", "uplifting", "academic", "suspenseful", etc.

### Step 4: Structure & Controls
Layout: Two-column grid (on desktop)

**Left column:**
- Chapter Count: "Flexible" or "Fixed" toggle
  - If Fixed: Target Chapters number input (appears conditionally)
- Word Count Preset: Short / Novella / Standard / Long / Epic (card selector with word ranges)

**Right column:**
- Sections Per Chapter: Slider (2-10, default 4, with natural variation note)
- Hook Frequency: Slider (1-10, low = steady flow, high = frequent hooks)

**Additional controls:**
- Teaser Style: Card selector (None, Mood Setter, Cryptic Open Loop, Character Voice Drop — each with description)
- Temporal Era dropdown
- Timeline Structure dropdown
- Spatial Scope dropdown
- Depth Level dropdown
- Entity Complexity slider (1-10)
- Creativity slider (1-10)
- Velocity slider (1-10)
- Image Generation toggle (off by default)
- Divergence Allowed toggle

### Step 5: Review & Create
- Summary of all selections
- Edit buttons to jump back to any step
- "Create Book" primary action button
- Shows estimated word count based on selections

---

## 11. Subscription & Credits System

### Plans: free, starter, pro, business
### Credit Flow:
1. On each generation call, check-subscription verifies credits_used < credits_limit
2. Edge function increments credits_used after successful processing
3. credits_reset_at tracks when credits should reset (aligned to Stripe billing_cycle_anchor)
4. check-subscription resets credits_used to 0 when new billing period detected

### Stripe Integration:
- Products/prices created in Stripe dashboard
- Checkout creates subscription with optional trial period
- Webhook syncs plan changes to profiles table
- Customer portal for self-service billing
- Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID

---

## 12. Frontend Architecture

### Routes:
- \`/\` — Landing page (public)
- \`/auth\` — Login/Signup with Turnstile CAPTCHA
- \`/dashboard\` — Book library (protected)
- \`/plans\` — Pricing page
- \`/manage-subscription\` — Billing dashboard (protected)
- \`/reset-password\` — Password reset
- \`/dev-docs\` — This technical blueprint

### Key Components:
- **CreateBookEngine**: 5-step book creation form with dynamic filtering and validation
- **BookDetailView**: Book reading/generation interface with chapter navigation sidebar
- **BookSettings**: Edit book metadata and generation controls post-creation
- **ChapterView**: Read chapters with sidebar navigation and section highlighting
- **CharacterGallery**: Character Index display with role grouping and expandable profiles
- **GenerationStatus**: Real-time generation progress with phase indicators
- **LiveContentView**: SSE streaming content display (text appears word-by-word)
- **RegenerateBookDialog**: Confirm and reset book for regeneration (clears all content)

### State Management:
- **useBooks**: CRUD operations for books (Supabase queries)
- **useBookGeneration**: Generation state machine (idle → outline → characters → writing → summarizing → completed)
- **useAuth**: Authentication state and user session
- **useTurnstile**: CAPTCHA integration for signup
- **React Query**: Server state caching and synchronization

---

## 13. Content Safety

- **DOMPurify** for HTML sanitization (src/lib/sanitize.ts)
- **Safe content validation** (src/lib/safeContent.ts)
- Input sanitization before database writes
- Prompt injection detection in edge functions (blocks known attack patterns)

---

## 14. PDF Export

- Uses **jsPDF** library
- Generates formatted A4 PDF with title page + chapters
- Blob-based download (bypasses iframe restrictions in Lovable preview)
- Available when book status is "completed"

---

## 15. Required Secrets (Edge Function Environment)

| Secret | Purpose |
|--------|---------|
| SUPABASE_URL | Auto-provided |
| SUPABASE_SERVICE_ROLE_KEY | Auto-provided |
| STRIPE_SECRET_KEY | Stripe API access |
| STRIPE_WEBHOOK_SECRET | Webhook signature verification |
| STRIPE_STARTER_PRICE_ID | Starter plan price |
| STRIPE_PRO_PRICE_ID | Pro plan price |
| STRIPE_BUSINESS_PRICE_ID | Business plan price |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile verification |
| LOVABLE_API_KEY | Lovable AI proxy access |

---

## 16. Replication Prompts

### To recreate the Character Index in another project:
"Build a Character Index system. During outline generation, extract every character mentioned — including minor and background characters — and create exhaustive profiles. Each character has 8 profile sections: Identity (fullName, aliases, age, gender, pronouns, nationality, ethnicity, culturalBackground, nativeLanguage, accent), Physical Appearance (height, build, skinTone, faceShape, eye details, nose, lips, jawline, scars, tattoos, distinctiveMarks, hands), Hair (color, texture, style, casual/formal variants, changes across story), Fashion (casual, work, formal, sleepwear, signature item, shoes, style reflection, evolution), Voice & Mannerisms (tone, speech patterns, accent strength, nervous habits, posture, expressions, laugh/anger/fear styles), Personality (core type, strengths, flaws, fears, desires, public persona, private reality, treatment of strangers vs loved ones), Backstory (upbringing, formative events, defining relationships, what they lost, what they seek), and Story Role (archetype, relationship to MC, goal, obstacle, arc). Characters are classified into 4 roles: protagonist, supporting, minor, background. The UI displays them grouped by role in expandable cards with portrait images."

### To recreate the Creation Engine in another project:
"Build a 5-step book Creation Engine. Step 1: Book Type selection from 29+ types organized in scrollable category tabs (Fiction, Non-Fiction, Business, Technical, Academic, Other) — each type has icon, label, description and defines which POVs, tones, and audiences are available. Step 2: Book Details — title, subtitle, theme/premise, genre (dynamically filtered by type), audience (dynamically filtered — e.g., children's books can't target professionals). Step 3: Voice & Tone — POV selector as cards with descriptions, primary/secondary tone dropdowns, 5 intensity sliders (1-10 each: intensity, formality, emotional intensity, humor, authority), and tonal anchor tags. Step 4: Structure & Controls — chapter count (flexible/fixed), word count via categorical presets (Short/Novella/Standard/Long/Epic), sections per chapter slider (2-10), hook frequency slider (1-10), teaser style card selector (none/mood-setter/cryptic-open-loop/character-voice-drop), temporal era, timeline structure, spatial scope, depth level, entity complexity, creativity, velocity sliders, and toggles for image generation and divergence. Step 5: Review summary of all selections with edit buttons and create action."
`;

const DevDocs = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([DOCS_CONTENT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "technical-blueprint.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Blueprint downloaded");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(DOCS_CONTENT);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download .md
            </Button>
          </div>
        </div>
      </header>
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
          {DOCS_CONTENT}
        </pre>
      </main>
    </div>
  );
};

export default DevDocs;