import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CanvasChapter, CanvasScene } from "@/types/book";
import { SortableCard } from "./SortableCard";
import { Plus, Trash2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskAIGuide } from "./AskAIGuide";

interface Props {
  chapter: CanvasChapter | null;
  onClose: () => void;
  onUpdate: (patch: Partial<CanvasChapter>) => void;
  onSetScenes: (scenes: CanvasScene[]) => void;
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, patch: Partial<CanvasScene>) => void;
  onRemoveScene: (sceneId: string) => void;
  bookId?: string;
  setupTitle?: string;
  setupGenre?: string;
  setupTone?: string;
  setupEra?: string;
  bullets?: string[];
  aiAssistUsed: number;
  onAiAssistUsed: () => void;
}

export function ChapterDetailDrawer({
  chapter, onClose, onUpdate, onSetScenes, onAddScene, onUpdateScene, onRemoveScene,
  bookId, setupTitle, setupGenre, setupTone, setupEra, bullets,
  aiAssistUsed, onAiAssistUsed,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const wc = chapter ? wordCount(chapter.plot) : 0;
  const wcOk = wc >= 100 && wc <= 120;

  const handleEnd = (e: DragEndEvent) => {
    if (!chapter) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapter.scenes.findIndex((s) => s.id === active.id);
    const newI = chapter.scenes.findIndex((s) => s.id === over.id);
    if (oldI < 0 || newI < 0) return;
    onSetScenes(arrayMove(chapter.scenes, oldI, newI));
  };

  return (
    <Sheet open={!!chapter} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        {chapter && (
          <>
            <SheetHeader>
              <SheetTitle className="font-serif flex items-center justify-between gap-2">
                <span>Chapter detail</span>
                <AskAIGuide
                  used={aiAssistUsed}
                  bookId={bookId}
                  onUsed={onAiAssistUsed}
                  label="Ask AI"
                  getContext={() => ({
                    title: setupTitle,
                    genre: setupGenre,
                    tone: setupTone,
                    historicalEra: setupEra,
                    bullets,
                    focusChapterTitle: chapter.title,
                    chapterPlot: chapter.plot,
                    scenes: chapter.scenes.map((s) => s.title).filter(Boolean),
                  })}
                />
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={chapter.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  className="mt-1 font-medium"
                />
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Pin className="w-3.5 h-3.5 text-amber-glow" />
                  <span className="text-xs font-medium text-amber-glow">Pinned plot</span>
                  <span className={cn("ml-auto text-[11px]", wcOk ? "text-emerald-400" : "text-muted-foreground")}>
                    {wc} / 100–120 words
                  </span>
                </div>
                <Textarea
                  value={chapter.plot}
                  onChange={(e) => onUpdate({ plot: e.target.value })}
                  rows={6}
                  placeholder="What this chapter must accomplish. 100–120 words."
                  className="bg-transparent resize-y"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Scenes</span>
                  <Button variant="outline" size="sm" onClick={onAddScene}>
                    <Plus className="w-4 h-4 mr-1" /> Add scene
                  </Button>
                </div>

                {chapter.scenes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No scenes yet. Add one to start sequencing.</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
                    <SortableContext items={chapter.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <ul className="space-y-2">
                        {chapter.scenes.map((s, i) => (
                          <SortableCard key={s.id} id={s.id} className="bg-card/40">
                            <div className="p-3 pl-9 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scene {i + 1}</span>
                                <Button
                                  variant="ghost" size="icon"
                                  className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => onRemoveScene(s.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <Input
                                value={s.title}
                                onChange={(e) => onUpdateScene(s.id, { title: e.target.value })}
                                placeholder="Scene title"
                                className="mt-1 h-8 text-sm"
                              />
                              <Textarea
                                value={s.note ?? ""}
                                onChange={(e) => onUpdateScene(s.id, { note: e.target.value })}
                                placeholder="Optional notes (beat, POV, location)…"
                                rows={2}
                                className="mt-2 text-xs resize-y"
                              />
                            </div>
                          </SortableCard>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function wordCount(s: string): number {
  const t = (s ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}