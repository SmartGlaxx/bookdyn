import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StorySummaryBullet, CanvasSetup } from "@/types/book";
import { Plus, Trash2 } from "lucide-react";
import { AskAIGuide } from "./AskAIGuide";
import { cn } from "@/lib/utils";

interface Props {
  bookId: string;
  setup: CanvasSetup;
  bullets: StorySummaryBullet[];
  onAdd: () => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  /** AI assist counter (0–3) and increment callback. */
  aiAssistUsed: number;
  onAiAssistUsed: () => void;
}

export function StorySummaryList({
  bookId, setup, bullets, onAdd, onUpdate, onRemove, aiAssistUsed, onAiAssistUsed,
}: Props) {
  const filled = bullets.filter((b) => b.text.trim().length > 0).length;

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="font-serif font-semibold text-lg">Story Summary</h2>
          <p className="text-xs text-muted-foreground">
            Write at least 10 short bullets describing the whole story — opening to resolution. This is your work.
          </p>
          <p className={cn("text-[11px] mt-1", filled >= 10 ? "text-emerald-400" : "text-muted-foreground")}>
            {filled} / 10 minimum
          </p>
        </div>
        <AskAIGuide
          used={aiAssistUsed}
          bookId={bookId}
          onUsed={onAiAssistUsed}
          getContext={() => ({
            title: setup.title,
            genre: setup.genre,
            tone: setup.tone,
            historicalEra: setup.historicalEra,
            bullets: bullets.map((b) => b.text).filter(Boolean),
          })}
        />
      </div>

      <ol className="space-y-2">
        {bullets.map((b, i) => (
          <li key={b.id} className="flex gap-2 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-muted/60 text-xs flex items-center justify-center font-medium text-muted-foreground mt-2">
              {i + 1}
            </span>
            <Textarea
              value={b.text}
              onChange={(e) => onUpdate(b.id, e.target.value)}
              placeholder="A short bullet…"
              rows={1}
              className="min-h-[2.5rem] resize-y"
            />
            <Button variant="ghost" size="icon" className="shrink-0 mt-1 text-muted-foreground hover:text-destructive" onClick={() => onRemove(b.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ol>

      <Button variant="ghost" size="sm" className="mt-3" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1" /> Add bullet
      </Button>
    </section>
  );
}