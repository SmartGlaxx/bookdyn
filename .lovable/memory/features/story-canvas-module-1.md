---
name: Story Canvas (Module 1)
description: Dual-layer card timeline — Story Arc cards + Chapter Matrix + pinned plot — author-driven, AI only suggests
type: feature
---
Stored in `books.canvas` jsonb. Shape: `{ setup, storySummary[], storyArc[{id,text,color}], chapters[{id,title,titleSuggestions,plot,scenes[]}] }`.
Single hook `useCanvas(bookId, book.canvas)` owns state with 500ms debounced save to `books.canvas`.
Components under `src/components/canvas/`: CanvasPage, BookSetupCard, StorySummaryList, StoryArcLane, ChapterMatrix, ChapterDetailDrawer, SortableCard.
DnD via @dnd-kit/core + @dnd-kit/sortable (horizontal for arc/chapters, vertical for scenes).
AI suggestions through edge function `suggest-canvas` (modes: story_summary, chapter_titles). verify_jwt=false, validates Bearer+apikey, uses Lovable AI gateway with `google/gemini-2.5-flash`. Never auto-fills user content — returns JSON the client decides to keep.
Rendered as the **Canvas** tab in `BookDetailView`, default for books without an outline.