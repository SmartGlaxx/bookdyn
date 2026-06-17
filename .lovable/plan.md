# Module 1 — Dual-Layer Card Timeline

End-to-end build of the new creativity-canvas core: an author-driven Story Arc, a Chapter Matrix derived from it, and per-chapter Scene cards with a pinned plot. Everything is movable, color-coded, and the AI's role is to suggest — never to auto-fill.

This replaces the current auto-outline → auto-chapter flow for the new canvas. Existing automated generation paths stay intact behind the scenes but the primary UI surface becomes the card timeline.

---

## What the user gets

1. **Book Setup (lightweight)** — title, genre, target length, tone. No 10k-word generation kicked off.
2. **Story Summary (10 bullets)** — user writes (or asks AI to draft) 10 short bullets describing the whole story.
3. **Story Arc cards** — each bullet becomes a draggable, color-coded card on a horizontal timeline lane. User can reorder, recolor, edit text, add or remove cards.
4. **Chapter Matrix** — generated from the arc: a row of chapter cards. Each card has:
   - Manual title field (user-owned)
   - 3 AI title suggestions as radio chips ("Use this") — purely optional
   - A "scenes" stack underneath (initially empty)
5. **Per-chapter Scene cards** — inside each chapter the user adds scene sub-cards (drag to reorder). A pinned Plot box (100–120 words) sits above the scenes and travels with the chapter.
6. **Persistence** — everything saves to the book row as structured JSON; loads back exactly.

No section text is generated in this module. This is the planning canvas only. Generation continues to read from this structure in later modules.

---

## UX shape

```text
┌─ Book Setup ───────────────────────────────────────────────┐
│ Title  Genre  Length  Tone                                 │
└────────────────────────────────────────────────────────────┘

┌─ Story Summary (10 bullets) ───────────────────────────────┐
│ 1. ____  2. ____  …  [Draft with AI]                       │
└────────────────────────────────────────────────────────────┘

┌─ Story Arc ────────────────────────────────────────────────┐
│  [card] [card] [card] [card] …  ← drag to reorder          │
│  colors: setup/rising/climax/fall/resolution (user-pick)   │
└────────────────────────────────────────────────────────────┘

┌─ Chapter Matrix ───────────────────────────────────────────┐
│  Ch 1  Ch 2  Ch 3  …   [+ Add Chapter]                     │
│  each: [title input] [○ suggestion A ○ B ○ C]              │
│  click a chapter → opens Chapter Detail                    │
└────────────────────────────────────────────────────────────┘

┌─ Chapter Detail (drawer / page) ───────────────────────────┐
│ Title …                                                    │
│ ┌ Plot (pinned, 100–120 words) ────────────────────────┐   │
│ │ …                                                    │   │
│ └──────────────────────────────────────────────────────┘   │
│ Scenes:  [scene] [scene] [scene]  [+ Add scene]            │
│           ← drag to reorder                                │
└────────────────────────────────────────────────────────────┘
```

---

## Data model

One new jsonb column on `books` so we don't disturb existing generation fields:

- `canvas jsonb default '{}'::jsonb` — holds the entire Module-1 state.

Shape:

```text
canvas = {
  setup: { title, genre, length_target, tone },
  story_summary: [ { id, text } x 10 ],   // free-form, ordered
  story_arc: [ { id, text, color, order } ],
  chapters: [
    {
      id, order,
      title,                        // user-owned manual title
      title_suggestions: [s1,s2,s3],// AI-generated, optional
      plot: "",                     // pinned 100–120 word plot
      scenes: [ { id, order, title, note } ]
    }
  ],
  updated_at
}
```

Saved on debounce as the user edits. No schema migration beyond adding the column.

---

## Backend

- **Migration**: add `canvas jsonb default '{}'` on `public.books`. No new tables, no policy changes (existing book RLS already covers it).
- **Edge function `suggest-canvas`** (new, `verify_jwt = false`, Bearer + apikey validated in code):
  - Input: `{ mode: "story_summary" | "chapter_titles" | "story_arc_colors", bookId, payload }`
  - Uses Lovable AI gateway (no key) by default; DeepSeek fallback later.
  - `story_summary`: returns 10 short bullets from setup.
  - `chapter_titles`: for a given chapter index returns 3 candidate titles based on surrounding arc cards.
  - Output is JSON only; nothing is written to the DB — the client decides what to keep.

The existing `generate-outline`, `generate-content`, etc. are not touched in this module.

---

## Frontend

New components under `src/components/canvas/`:

- `CanvasPage.tsx` — top-level layout, loads/saves `canvas` jsonb.
- `BookSetupCard.tsx` — title/genre/length/tone form.
- `StorySummaryList.tsx` — 10 editable bullets + "Draft with AI" button.
- `StoryArcLane.tsx` — horizontal draggable cards, color picker per card.
- `ChapterMatrix.tsx` — row of chapter cards, manual title + 3 suggestion radios + "Add chapter".
- `ChapterDetailDrawer.tsx` — pinned plot textarea + scenes list with drag-reorder.
- `SortableCard.tsx` — shared dnd primitive.

Library: use `@dnd-kit/core` + `@dnd-kit/sortable` (small, already common; add via `bun add`).

State: a single `useCanvas(bookId)` hook that owns the `canvas` object, exposes mutation helpers, and debounces saves (500 ms) via the existing supabase client.

Integration:
- Add a new route or sub-view inside `BookDetailView` (a tab next to Main/Chapters/Characters called **Canvas**) that renders `CanvasPage`. Existing tabs stay as-is — generation flows continue to work.
- For now the Canvas tab is the default for new books; existing books keep their old default tab.

---

## Out of scope for this module

- Scene-level text generation (Module 3).
- Continuity audit against the pinned plot (Module 4).
- Fork chapter sandbox, Outtakes, sprints, heatmap, theme selector, typography suite, retractable sidebar.
- Migrating existing books' outline data into `canvas` (a one-way "Import outline → canvas" button can come later).

---

## Build order (single pass)

1. Migration: add `canvas` column.
2. `useCanvas` hook + types.
3. `BookSetupCard` + `StorySummaryList` (+ `suggest-canvas` edge fn for the AI draft).
4. `StoryArcLane` with dnd-kit and color picker.
5. `ChapterMatrix` with manual title + AI suggestions.
6. `ChapterDetailDrawer` with pinned plot + scenes.
7. Wire as **Canvas** tab inside `BookDetailView`; make it default for new books.
8. Smoke-test save/load round-trip and drag reorder.
