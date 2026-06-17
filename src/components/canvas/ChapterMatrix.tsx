import { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CanvasChapter, StoryArcCard } from "@/types/book";
import { SortableCard } from "./SortableCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Sparkles, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export function ChapterMatrix({
  bookId, arc, chapters, onReorder, onAdd, onUpdate, onRemove, onSeedFromArc, onOpenChapter,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapters.findIndex((c) => c.id === active.id);
    const newI = chapters.findIndex((c) => c.id === over.id);
    if (oldI < 0 || newI < 0) return;
    onReorder(arrayMove(chapters, oldI, newI));
  };

  const suggestTitles = async (ch: CanvasChapter, idx: number) => {
    if (suggestingFor) return;
    setSuggestingFor(ch.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("suggest-canvas", {
        body: {
          mode: "chapter_titles",
          bookId,
          payload: {
            arc: arc.map((a) => ({ text: a.text, color: a.color })),
            chapterIndex: idx,
            currentTitle: ch.title,
            plot: ch.plot,
          },
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      const titles = (data as { titles?: string[] })?.titles ?? [];
      if (!titles.length) throw new Error("No titles returned");
      onUpdate(ch.id, { titleSuggestions: titles.slice(0, 3), selectedSuggestionIndex: null });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to fetch suggestions");
    } finally {
      setSuggestingFor(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h2 className="font-serif font-semibold text-lg">Chapter Matrix</h2>
          <p className="text-xs text-muted-foreground">Manual titles. AI only suggests — you decide.</p>
        </div>
        <div className="flex gap-2">
          {chapters.length === 0 && arc.length > 0 && (
            <Button variant="outline" size="sm" onClick={onSeedFromArc}>
              Seed from arc
            </Button>
          )}
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

                    {ch.titleSuggestions && ch.titleSuggestions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Suggestions</div>
                        <RadioGroup
                          value={ch.selectedSuggestionIndex?.toString() ?? ""}
                          onValueChange={(v) => {
                            const i = parseInt(v, 10);
                            const t = ch.titleSuggestions?.[i];
                            if (t) onUpdate(ch.id, { title: t, selectedSuggestionIndex: i });
                          }}
                          className="gap-1"
                        >
                          {ch.titleSuggestions.map((t, i) => (
                            <label
                              key={i}
                              className="flex items-start gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded-md px-1.5 py-1"
                            >
                              <RadioGroupItem value={i.toString()} className="mt-0.5" />
                              <span className="leading-tight">{t}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => suggestTitles(ch, idx)}
                        disabled={suggestingFor === ch.id}
                      >
                        {suggestingFor === ch.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1" />
                        )}
                        Suggest titles
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChapter(ch.id)} aria-label="Open chapter">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(ch.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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