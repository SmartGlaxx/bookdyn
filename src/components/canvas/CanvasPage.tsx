import { useState } from "react";
import { Book } from "@/types/book";
import { useCanvas } from "@/hooks/useCanvas";
import { BookSetupCard } from "./BookSetupCard";
import { StorySummaryList } from "./StorySummaryList";
import { StoryArcLane } from "./StoryArcLane";
import { ChapterMatrix } from "./ChapterMatrix";
import { ChapterDetailDrawer } from "./ChapterDetailDrawer";
import { Loader2 } from "lucide-react";

interface Props {
  book: Book;
}

export function CanvasPage({ book }: Props) {
  const c = useCanvas(book.id, book.canvas);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const openChapter = c.canvas.chapters.find((ch) => ch.id === openChapterId) ?? null;

  const aiUsed = c.canvas.aiAssistUsed ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-2xl">Story Canvas</h1>
          <p className="text-sm text-muted-foreground">Plan the book on cards. Move, color, edit — you stay in charge.</p>
        </div>
        <div className="flex items-center gap-2">
          {c.saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      <BookSetupCard value={c.canvas.setup} onChange={c.setSetup} />

      <StorySummaryList
        bookId={book.id}
        setup={c.canvas.setup}
        bullets={c.canvas.storySummary}
        onAdd={c.addSummaryBullet}
        onUpdate={c.updateSummaryBullet}
        onRemove={c.removeSummaryBullet}
        aiAssistUsed={aiUsed}
        onAiAssistUsed={c.incrementAiAssist}
      />

      <StoryArcLane
        cards={c.canvas.storyArc}
        onReorder={c.setArc}
        onAdd={() => c.addArcCard()}
        onUpdate={c.updateArcCard}
        onRemove={c.removeArcCard}
      />

      <ChapterMatrix
        bookId={book.id}
        arc={c.canvas.storyArc}
        chapters={c.canvas.chapters}
        onReorder={c.setChapters}
        onAdd={c.addChapter}
        onUpdate={c.updateChapter}
        onRemove={c.removeChapter}
        onSeedFromArc={c.seedChaptersFromArc}
        onOpenChapter={setOpenChapterId}
        setupTitle={c.canvas.setup.title}
        setupGenre={c.canvas.setup.genre}
        setupTone={c.canvas.setup.tone}
        setupEra={c.canvas.setup.historicalEra}
        aiAssistUsed={aiUsed}
        onAiAssistUsed={c.incrementAiAssist}
      />

      <ChapterDetailDrawer
        chapter={openChapter}
        onClose={() => setOpenChapterId(null)}
        onUpdate={(patch) => openChapter && c.updateChapter(openChapter.id, patch)}
        onSetScenes={(scenes) => openChapter && c.setScenes(openChapter.id, scenes)}
        onAddScene={() => openChapter && c.addScene(openChapter.id)}
        onUpdateScene={(sid, patch) => openChapter && c.updateScene(openChapter.id, sid, patch)}
        onRemoveScene={(sid) => openChapter && c.removeScene(openChapter.id, sid)}
        bookId={book.id}
        setupTitle={c.canvas.setup.title}
        setupGenre={c.canvas.setup.genre}
        setupTone={c.canvas.setup.tone}
        setupEra={c.canvas.setup.historicalEra}
        bullets={c.canvas.storySummary.map((b) => b.text)}
        aiAssistUsed={aiUsed}
        onAiAssistUsed={c.incrementAiAssist}
      />

    </div>
  );
}