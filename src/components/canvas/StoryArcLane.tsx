import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { StoryArcCard, StoryArcColor } from "@/types/book";
import { SortableCard } from "./SortableCard";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Palette } from "lucide-react";
import { ARC_COLOR_CLASS, ARC_COLORS } from "@/hooks/useCanvas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  cards: StoryArcCard[];
  onReorder: (next: StoryArcCard[]) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<StoryArcCard>) => void;
  onRemove: (id: string) => void;
}

export function StoryArcLane({ cards, onReorder, onAdd, onUpdate, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(cards, oldIndex, newIndex));
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-semibold text-lg">Story Arc</h2>
          <p className="text-xs text-muted-foreground">Drag to reorder. Color each beat so the arc reads at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add beat
        </Button>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No beats yet. Add your first or convert the summary above into arc cards.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth">
              {cards.map((c) => (
                <SortableCard
                  key={c.id}
                  id={c.id}
                  className={cn("min-w-[200px] max-w-[220px] shrink-0 border-2", ARC_COLOR_CLASS[c.color])}
                >
                  <div className="p-3 pt-7">
                    <Textarea
                      value={c.text}
                      onChange={(e) => onUpdate(c.id, { text: e.target.value })}
                      rows={3}
                      className="bg-transparent border-0 focus-visible:ring-0 resize-none text-sm p-0 min-h-[4.5rem]"
                      placeholder="Beat description"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Palette className="w-3 h-3 mr-1" /> {c.color}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-2" align="start">
                          <div className="grid grid-cols-1 gap-1">
                            {ARC_COLORS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => onUpdate(c.id, { color: opt.value as StoryArcColor })}
                                className={cn(
                                  "text-left text-xs px-2 py-1.5 rounded-md border",
                                  ARC_COLOR_CLASS[opt.value],
                                  c.color === opt.value && "ring-2 ring-foreground/30",
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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