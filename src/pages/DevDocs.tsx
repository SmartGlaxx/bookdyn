import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const DOCS_CONTENT = `# Technical Blueprint — Book Generation App
Generated: ${new Date().toISOString().split("T")[0]}

## 1. Database Schema

### profiles
- id (uuid, PK, references auth.users)
- full_name (text)
- plan (text, default: 'free')
- credits_used (integer, default: 0)
- credits_limit (integer, default: 5)
- credits_reset_at (timestamptz, default: now())
- created_at, updated_at (timestamptz)
- RLS: users can SELECT/INSERT/UPDATE own row only

### books
- id (uuid, PK)
- user_id (uuid, references auth.users)
- title, subtitle, book_type, theme, genre, audience, pov, status (text)
- tone_profile, controls (jsonb)
- outline (jsonb, nullable — holds chapters, characters, visualStyleGuide)
- tonal_anchors, entities, concepts (text[])
- current_chapter_index, current_subsection_index, word_count (integer)
- created_at, updated_at (timestamptz)
- RLS: full CRUD for own rows only (authenticated)

### request_logs
- id (uuid), user_id (uuid), function_name (text), created_at (timestamptz)
- RLS: SELECT own rows only; INSERT/UPDATE/DELETE denied to client

### audit_logs
- id (uuid), user_id (uuid), action (text), resource_type (text), resource_id (text), metadata (jsonb), created_at (timestamptz)
- RLS: SELECT own rows only

## 2. Database Functions

### check_rate_limit(_user_id uuid, _function_name text, _max_per_hour int DEFAULT 60, _max_per_day int DEFAULT 500)
- Returns boolean
- Counts rows in request_logs for the given user+function within the time windows
- Used by edge functions before processing

### cleanup_old_request_logs
- Deletes request_logs older than 7 days

## 3. Authentication Setup

- Email/password auth with MANDATORY email verification (auto_confirm_email: false)
- Google OAuth configured
- Password reset flow via /reset-password page
- Turnstile CAPTCHA on signup (verify-turnstile edge function)
- Profile auto-created on first sign-in (client-side upsert)

## 4. Edge Functions

### generate-outline
- Input: book metadata (title, theme, audience, bookType, controls, toneProfile, etc.)
- Output: JSON outline with chapters[], each having subsections[]
- Uses Lovable AI (Gemini models)
- Enforces rate limiting via check_rate_limit RPC

### generate-content
- Input: book context + chapter/subsection info + previous content summary
- Output: SSE stream of generated text
- Uses context windowing: sends summary of prior chapters + full current chapter context
- Rate limited

### generate-characters
- Input: outline data, book metadata
- Output: JSON array of character objects with name, role, description, visualDescription, personality
- Only for children/comic book types

### generate-image
- Input: prompt, visual style guide
- Output: base64 image data
- Rate limited (30/hr default)
- Used for character portraits and chapter illustrations

### summarize-content
- Input: text content to summarize
- Output: condensed summary for context windowing
- Called after each chapter completes to maintain continuity

### verify-turnstile
- Input: Turnstile token
- Output: success boolean
- Validates Cloudflare Turnstile CAPTCHA tokens

### check-subscription
- Input: user JWT
- Output: plan, credits_used, credits_limit, credits_reset_at
- Calculates billing period from Stripe billing_cycle_anchor
- Resets credits when new billing period detected

### create-checkout
- Creates Stripe Checkout session for plan upgrades
- Includes trial period config

### customer-portal
- Returns Stripe Customer Portal URL for billing management

### manage-subscription
- Handles plan changes (upgrade/downgrade)
- Uses proration_behavior: "none" (changes apply at next billing cycle)

### stripe-webhook
- Handles: checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_succeeded
- Syncs plan and credits to profiles table

## 5. Security Middleware (in Edge Functions)

All edge functions include:
- CORS whitelisting (only allowed origins)
- WAF: blocks known scanner user agents
- Payload size validation (50KB max)
- Prompt injection detection (blocks known attack patterns)
- Rate limiting via check_rate_limit RPC
- JWT verification via Supabase auth

## 6. Book Generation Pipeline (useBookGeneration.ts)

### 5-Phase Pipeline:
1. **generating-outline**: Calls generate-outline, saves outline to book
2. **generating-characters**: (children/comic only) Calls generate-characters, then generate-image for portraits
3. **writing**: Iterates chapters/subsections, calls generate-content (SSE streaming), saves content progressively
4. **generating-image**: Generates chapter illustrations (for supported book types)
5. **summarizing**: Calls summarize-content for completed chapters

### State Machine:
- idle → generating-outline → generating-characters → writing → summarizing → completed
- Supports: pause (persists position), resume (from saved chapter/subsection index), stop
- Exponential backoff on failures (3 retries)
- Progress saved to database after each subsection

## 7. Book Types (src/types/book.ts)

Supported: nonfiction, fiction, memoir, children, comic, academic, selfhelp, poetry, business
Each has: label, description, icon, supportedPOVs, supportedTones, defaultControls

### Controls per book:
- chapterCount, subsectionsPerChapter, wordsPerSubsection
- These determine the book's structure and total word count

### Tone Profile:
- formality (0-1), creativity (0-1), humor (0-1), emotion (0-1)
- Plus tonal_anchors (string tags like "witty", "academic")

## 8. Subscription & Credits

### Plans: free, starter, pro, business
### Credit Flow:
1. On each generation call, check-subscription verifies credits
2. Edge function increments credits_used
3. credits_reset_at tracks when credits should reset (aligned to Stripe billing_cycle_anchor)
4. check-subscription resets credits_used to 0 when new period starts

### Stripe Integration:
- Products/prices created in Stripe
- Checkout creates subscription
- Webhook syncs plan changes
- Customer portal for self-service billing
- Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID

## 9. Frontend Architecture

### Key Pages:
- / (Landing - public)
- /auth (Login/Signup with Turnstile)
- /dashboard (Book library - protected)
- /plans (Pricing page)
- /manage-subscription (Billing dashboard - protected)
- /reset-password (Password reset)

### Key Components:
- CreateBookWizard: Multi-step book creation form
- BookDetailView: Book reading/generation interface with chapter navigation
- BookSettings: Edit book metadata and generation controls
- ChapterView: Read chapters with sidebar navigation
- CharacterGallery: Display generated character portraits
- GenerationStatus: Real-time generation progress
- LiveContentView: SSE streaming content display
- RegenerateBookDialog: Confirm and reset book for regeneration

### State Management:
- useBooks: CRUD operations for books (Supabase)
- useBookGeneration: Generation state machine
- useAuth: Authentication state
- useTurnstile: CAPTCHA integration
- React Query for server state

## 10. Content Safety

- DOMPurify for HTML sanitization (src/lib/sanitize.ts)
- Safe content validation (src/lib/safeContent.ts)
- Input sanitization before database writes
- Prompt injection detection in edge functions

## 11. PDF Export

- Uses jsPDF library
- Generates formatted A4 PDF with title page + chapters
- Blob-based download (bypasses iframe restrictions)
- Available when book status is "completed"

## 12. Required Secrets (Edge Function Environment)

- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID
- TURNSTILE_SECRET_KEY
- LOVABLE_API_KEY (for Lovable AI proxy)
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
