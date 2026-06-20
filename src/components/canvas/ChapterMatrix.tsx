import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CanvasChapter, StoryArcCard } from "@/types/book";
import { SortableCard } from "./SortableCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { AskAIGuide } from "./AskAIGuide";

interface Props {
  bookId: string;
  arc: StoryArcCard[];
  chapters: CanvasChapter[];
  onReorder: (next: CanvasChapter[]) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CanvasChapter>) => void;
  onRemove: (id: string) => void;
  onSeedFromArc: () => void;
  onOpenChapter: (id: string) => void;
  /** Setup snapshot (title, genre, tone, era) for AI guiding-question context. */
  setupTitle?: string;
  setupGenre?: string;
  setupTone?: string;
  setupEra?: string;
  aiAssistUsed: number;
  onAiAssistUsed: () => void;
}

export function ChapterMatrix({
  bookId, arc, chapters, onReorder, onAdd, onUpdate, onRemove, onSeedFromArc, onOpenChapter,
  setupTitle, setupGenre, setupTone, setupEra, aiAssistUsed, onAiAssistUsed,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapters.findIndex((c) => c.id === active.id);
    const newI = chapters.findIndex((c) => c.id === over.id);
    if (oldI < 0 || newI < 0) return;
    onReorder(arrayMove(chapters, oldI, newI));
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h2 className="font-serif font-semibold text-lg">Chapter Matrix</h2>
          <p className="text-xs text-muted-foreground">Type your chapter titles. No AI-generated titles — this is your book.</p>
        </div>
        <div className="flex gap-2">
          {chapters.length === 0 && arc.length > 0 && (
            <Button variant="outline" size="sm" onClick={onSeedFromArc}>
              Seed from arc
            </Button>
          )}
          <AskAIGuide
            used={aiAssistUsed}
            bookId={bookId}
            onUsed={onAiAssistUsed}
            onlyCategory="plot"
            getContext={() => ({
              title: setupTitle,
              genre: setupGenre,
              tone: setupTone,
              historicalEra: setupEra,
              bullets: arc.map((a) => a.text).filter(Boolean),
              chapterTitles: chapters.map((c) => c.title).filter(Boolean),
            })}
          />
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add chapter
          </Button>
        </div>
      </div>

      {chapters.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No chapters yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
          <SortableContext items={chapters.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {chapters.map((ch, idx) => (
                <SortableCard key={ch.id} id={ch.id} className="min-w-[260px] max-w-[280px] shrink-0">
                  <div className="p-3 pt-7">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ch {idx + 1}</div>
                    <Input
                      value={ch.title}
                      onChange={(e) => onUpdate(ch.id, { title: e.target.value })}
                      placeholder="Chapter title"
                      className="h-8 text-sm font-medium"
                    />

                    <div className="flex items-center justify-end mt-3 gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onOpenChapter(ch.id)}>
                        Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(ch.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {ch.scenes.length > 0 && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {ch.scenes.length} scene{ch.scenes.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}