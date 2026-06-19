import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorldElementCard, CanvasSetup } from "@/types/book";
import { Plus, Trash2, Globe } from "lucide-react";
import { AskAIGuide } from "./AskAIGuide";

interface Props {
  bookId?: string;
  setup: CanvasSetup;
  bullets: string[];
  elements: WorldElementCard[];
  onAdd: (seed?: Partial<WorldElementCard>) => void;
  onUpdate: (id: string, patch: Partial<WorldElementCard>) => void;
  onRemove: (id: string) => void;
  aiAssistUsed: number;
  onAiAssistUsed: () => void;
}

export function WorldbuildingPanel({
  bookId, setup, bullets, elements, onAdd, onUpdate, onRemove, aiAssistUsed, onAiAssistUsed,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 mt-1 text-amber-glow" />
          <div>
            <h2 className="font-serif font-semibold text-lg">Worldbuilding</h2>
            <p className="text-xs text-muted-foreground">
              Reference cards for locations, cultures, and rules of your world. You write the detail — AI only suggests questions and short labels.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AskAIGuide
            used={aiAssistUsed}
            bookId={bookId}
            onUsed={onAiAssistUsed}
            onlyCategory="world"
            label="Ask AI"
            onInsertPhrase={(phrase) => onAdd({ label: phrase })}
            getContext={() => ({
              title: setup.title,
              genre: setup.genre,
              tone: setup.tone,
              historicalEra: setup.historicalEra,
              bullets,
            })}
          />
          <Button variant="outline" size="sm" onClick={() => onAdd()}>
            <Plus className="w-4 h-4 mr-1" /> Add element
          </Button>
        </div>
      </div>

      {elements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No world elements yet. Add locations, cultures, or rules that shape your story.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {elements.map((w) => (
            <li key={w.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={w.label}
                  onChange={(e) => onUpdate(w.id, { label: e.target.value })}
                  placeholder="Label (e.g. Desert outpost)"
                  className="h-8 text-sm font-medium"
                />
                <Button
                  variant="ghost" size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(w.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Input
                value={w.kind ?? ""}
                onChange={(e) => onUpdate(w.id, { kind: e.target.value })}
                placeholder="Kind (location · culture · rule · technology)"
                className="h-8 mt-2 text-xs"
              />
              <Textarea
                value={w.description}
                onChange={(e) => onUpdate(w.id, { description: e.target.value })}
                placeholder="Describe this element in your own words — what it looks like, how it shapes the story."
                rows={4}
                className="mt-2 text-sm resize-y"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}