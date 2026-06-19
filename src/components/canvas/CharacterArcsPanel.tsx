import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharacterArcCard, CanvasSetup } from "@/types/book";
import { Plus, Trash2, Users } from "lucide-react";
import { AskAIGuide } from "./AskAIGuide";

interface Props {
  bookId?: string;
  setup: CanvasSetup;
  bullets: string[];
  arcs: CharacterArcCard[];
  onAdd: (seed?: Partial<CharacterArcCard>) => void;
  onUpdate: (id: string, patch: Partial<CharacterArcCard>) => void;
  onRemove: (id: string) => void;
  aiAssistUsed: number;
  onAiAssistUsed: () => void;
}

export function CharacterArcsPanel({
  bookId, setup, bullets, arcs, onAdd, onUpdate, onRemove, aiAssistUsed, onAiAssistUsed,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 mt-1 text-amber-glow" />
          <div>
            <h2 className="font-serif font-semibold text-lg">Character Arcs</h2>
            <p className="text-xs text-muted-foreground">
              Reference cards for each main character's transformation. You write the paragraphs — AI only offers questions and short label ideas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AskAIGuide
            used={aiAssistUsed}
            bookId={bookId}
            onUsed={onAiAssistUsed}
            onlyCategory="character"
            label="Ask AI"
            onInsertPhrase={(phrase) => onAdd({ arcLabel: phrase })}
            getContext={() => ({
              title: setup.title,
              genre: setup.genre,
              tone: setup.tone,
              historicalEra: setup.historicalEra,
              bullets,
            })}
          />
          <Button variant="outline" size="sm" onClick={() => onAdd()}>
            <Plus className="w-4 h-4 mr-1" /> Add character
          </Button>
        </div>
      </div>

      {arcs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No characters yet. Add a card and describe their wound, want, and the change they undergo.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {arcs.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={a.name}
                  onChange={(e) => onUpdate(a.id, { name: e.target.value })}
                  placeholder="Character name"
                  className="h-8 text-sm font-medium"
                />
                <Button
                  variant="ghost" size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(a.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Input
                value={a.arcLabel}
                onChange={(e) => onUpdate(a.id, { arcLabel: e.target.value })}
                placeholder="Arc label (e.g. Hidden guilt → Rising courage)"
                className="h-8 mt-2 text-xs"
              />
              <Textarea
                value={a.description}
                onChange={(e) => onUpdate(a.id, { description: e.target.value })}
                placeholder="Describe the arc in your own words — wound, want, turning point, change."
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