# Module 1 — Canvas IS the Book Setup (replace the old wizard)

You're right: the Canvas is supposed to be **the** book-creation experience, not a tab that appears after a book exists. The current `CreateBookEngine` (6-step Type/Details/Voice/Controls/Advanced/Front Matter wizard with AI automation) gets deleted. Clicking "New Book" opens the Canvas Setup flow directly. AI is restricted to **a single Socratic helper** that asks questions, never writes content, and stops after 3 uses per book.

---

## What you'll see

```text
New Book ─▶ Step 1: Book Setup
              Title · Genre · Tone · Historical Time Period · AI Creativity (0–3)

           Step 2: Story Summary (manual)
              10 numbered bullet inputs (min 10, no max)
              "Next" disabled until 10 non-empty bullets exist
              [Ask AI a guiding question] button (shared 3-use counter)

           Step 3: Global Timeline Board
              Each bullet → draggable color-coded Story Arc card
              Default colors: 1 Setup · 2-3 Inciting · 4-6 Rising · 7 Climax · 8-9 Fall · 10 Resolution
              User reorders, recolors, edits text. Must click "Approve order".

           Step 4: Chapter Matrix
              User types chapter titles manually. "+ Add chapter".
              Per chapter: [Ask AI a guiding question] (same shared counter)
              No auto-generated titles. No radios of AI titles.

           Step 5: Scene Cards (optional, click any chapter)
              100–120 word Plot box (manual, word counter)
              Draggable scene sub-cards
              [Ask AI a guiding question] (shared counter)

           [Create Book]  → writes books row with full `canvas` jsonb
                         → opens the book straight into the Canvas view
```

---

## AI assist rule (your spec, locked in code)

One helper component, `AskAIGuide`, used in every Canvas surface. Behavior:

- Three categories the user picks from: **Plot Ideas**, **Character Arcs**, **Worldbuilding**.
- Calls the `suggest-canvas` edge function with mode `"guiding_questions"`.
- Edge function returns **3 short questions only**, always referencing book title, genre, and the user's existing bullets/titles/scene context. Never returns story content.
- A counter `canvas.aiAssistUsed` (0–3) persists on the book. Once it hits 3, every Ask AI button across the Canvas is disabled with the message "AI guidance used (3/3) — the rest is yours."
- Server-side guard in `suggest-canvas`: refuses any request when `aiAssistUsed >= 3`, and refuses the legacy modes (`story_summary`, `chapter_titles`, `story_arc_colors`) entirely — those are removed.

System prompt enforces: "Reply with exactly 3 short, open-ended questions. Never propose plot, characters, prose, or titles. Reference the user's title, genre, and existing bullets."

---

## Data shape (no new column, extends existing `books.canvas`)

```ts
canvas = {
  setup: { title, genre, tone, historicalEra, aiCreativity },  // tone/era enums kept simple
  storySummary: [ { id, text } ],            // min 10 to leave step 2
  storyArc:     [ { id, text, color } ],     // 1-to-1 from bullets, user can reorder/recolor
  chapters:     [ { id, title, plot, scenes:[{id,title,note}] } ],
  aiAssistUsed: 0,                           // 0..3
  updatedAt
}
```

Existing books without a `canvas` get an empty-state inside the Canvas view ("This book pre-dates the Canvas. Start a new book to use it, or fill the Canvas manually."). No backfill.

---

## Files to add

- `src/components/canvas/CanvasSetupWizard.tsx` — the new 5-step modal/page that replaces `CreateBookEngine`. Owns local draft state until "Create Book", then inserts the row.
- `src/components/canvas/AskAIGuide.tsx` — shared "Ask AI a guiding question" popover (category picker + 3 questions display + uses-left counter).
- `src/components/canvas/GlobalTimelineBoard.tsx` — step 3 board (reuses `StoryArcLane` internals but with the approve-and-continue gate).
- `src/components/canvas/SceneCardsPanel.tsx` — step 5 inline panel (or reuses `ChapterDetailDrawer` minus its AI buttons).

## Files to change

- `src/components/CreateBookEngine.tsx` — **delete**.
- All call sites of `<CreateBookEngine />` (dashboard "New Book" button, anywhere else) → open `<CanvasSetupWizard />` instead.
- `src/components/BookDetailView.tsx` — drop the Canvas/Manuscript tabs. Canvas becomes the default view of an opened book; a small "Manuscript" link inside the Canvas opens the chapter writing surface when the user is ready to draft prose.
- `src/components/canvas/StorySummaryList.tsx` — replace "Draft with AI" button with `<AskAIGuide />`. Enforce min-10 visually (numbered slots 1–10 always shown).
- `src/components/canvas/CanvasPage.tsx` — remove "Summary → Arc cards" auto button; arc is always derived 1-to-1 at step-2-to-3 transition. Keep editing afterward.
- `src/components/canvas/ChapterMatrix.tsx` — remove AI title suggestions / radios. Add `<AskAIGuide />` per chapter.
- `src/components/canvas/ChapterDetailDrawer.tsx` — remove any AI plot-direction auto-generation; add manual plot word counter (target 100–120). Add `<AskAIGuide />`.
- `src/hooks/useCanvas.ts` — add `incrementAiAssist()` helper; expose `aiAssistUsed`. Add a `createCanvasBook(initialCanvas)` helper used by the wizard's final step (single insert into `books`).
- `src/types/book.ts` — drop wizard-only enums no longer used (`AutomationLevel`, `DepthLevel`, etc.) **only if** nothing else imports them; otherwise leave the types alone and just stop using them in UI. Add `aiAssistUsed: number` to `StoryCanvas`. Add `historicalEra` + `aiCreativity` to `CanvasSetup`.
- `supabase/functions/suggest-canvas/index.ts` — remove old modes; add `guiding_questions` mode. Validate `aiAssistUsed < 3` by re-reading `books.canvas` server-side (so the cap can't be bypassed from the client). Returns `{ questions: string[3] }` only.

## Files NOT touched

- `generate-content`, `generate-outline`, `generate-intro`, manuscript writing UI, billing, profiles, RLS, migrations. The Canvas is a planning artifact; chapter prose generation stays wherever it lives today and is reached via the small "Manuscript" link from inside the Canvas.

---

## Out of scope (next modules)

- Scene-level text generation, continuity audit, fork chapters, sprints, heatmap, theme/typography suite.
- Backfilling old books' outline data into `canvas`.
- Replacing the manuscript writing surface itself.

---

## Build order

1. Types + `useCanvas` extensions (`aiAssistUsed`, era/creativity).
2. `suggest-canvas` rewrite (only `guiding_questions`, server-side cap).
3. `AskAIGuide` shared component.
4. `CanvasSetupWizard` (steps 1–4 first, step 5 reuses drawer).
5. Wire dashboard "New Book" → wizard; delete `CreateBookEngine`.
6. Simplify `BookDetailView` (Canvas is default, Manuscript becomes a link).
7. Smoke test: create a book end-to-end, verify all 10 bullets required, drag arc, add chapters manually, AI counter caps at 3, reload restores everything.
