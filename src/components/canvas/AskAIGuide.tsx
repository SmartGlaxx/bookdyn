import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2, Lightbulb, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Category = "plot" | "character" | "world";

interface Context {
  title?: string;
  genre?: string;
  tone?: string;
  historicalEra?: string;
  bullets?: string[];
  chapterTitles?: string[];
  chapterPlot?: string;
  scenes?: string[];
  focusChapterTitle?: string;
}

interface Props {
  /** Number of AI questions already used on this book (0–3). */
  used: number;
  /** Optional book id — when present, server enforces the cap & persists the counter. */
  bookId?: string;
  /** Snapshot of the user's current canvas data so questions are specific. */
  getContext: () => Context;
  /** Called after a successful request so the client mirrors the counter. */
  onUsed: () => void;
  /** Compact button variant for inline placement. */
  size?: "sm" | "default";
  label?: string;
  /** If set, only this category is available — hides the picker. */
  onlyCategory?: Category;
  /** Invoked when the user clicks a suggested 2–3 word phrase chip. */
  onInsertPhrase?: (phrase: string, category: Category) => void;
}

const CATEGORY_META: { value: Category; label: string; icon: typeof Lightbulb; hint: string }[] = [
  { value: "plot", label: "Plot Ideas", icon: Lightbulb, hint: "Conflict, stakes, cause & effect" },
  { value: "character", label: "Character Arcs", icon: Users, hint: "Motivation, wounds, transformation" },
  { value: "world", label: "Worldbuilding", icon: Globe, hint: "Setting, rules, cultural texture" },
];

export function AskAIGuide({
  used, bookId, getContext, onUsed, size = "sm", label, onlyCategory, onInsertPhrase,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Category | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [phrases, setPhrases] = useState<string[] | null>(null);
  const [activeCat, setActiveCat] = useState<Category | null>(null);

  const remaining = Math.max(0, 3 - (used || 0));
  const disabled = remaining <= 0;

  const ask = async (category: Category) => {
    if (loading || disabled) return;
    setLoading(category);
    setActiveCat(category);
    setQuestions(null);
    setPhrases(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ctx = getContext();
      const { data, error } = await supabase.functions.invoke("suggest-canvas", {
        body: { mode: "guiding_questions", bookId, category, context: ctx },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      const qs = (data as { questions?: string[] })?.questions ?? [];
      const phs = (data as { phrases?: string[] })?.phrases ?? [];
      if (!qs.length) throw new Error("No questions returned");
      setQuestions(qs);
      setPhrases(phs);
      onUsed();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to get guidance";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuestions(null); setPhrases(null); setActiveCat(null); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("gap-1.5", disabled && "opacity-60")}
          title={disabled ? "AI guidance used (3/3) — the rest is yours." : "Ask AI for a guiding question"}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{label ?? "Ask AI a guiding question"}</span>
          <span className="text-[10px] text-muted-foreground ml-1">{remaining}/3</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        {disabled ? (
          <p className="text-xs text-muted-foreground">
            AI guidance used (3/3) — the rest is yours. The Canvas is meant to be your work.
          </p>
        ) : !questions ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              The AI only asks questions — it will not write your story. Pick a category.
              <br />
              <span className="text-[11px]">{remaining} of 3 left for this book.</span>
            </p>
            <div className="grid gap-1.5">
              {CATEGORY_META.filter((m) => !onlyCategory || m.value === onlyCategory).map(({ value, label: catLabel, icon: Icon, hint }) => (
                <button
                  key={value}
                  onClick={() => ask(value)}
                  disabled={!!loading}
                  className="text-left p-2 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 flex items-start gap-2"
                >
                  {loading === value ? (
                    <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 mt-0.5 text-amber-glow shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{catLabel}</div>
                    <div className="text-[11px] text-muted-foreground">{hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-glow">
                {activeCat === "plot" ? "Plot questions" : activeCat === "character" ? "Character questions" : "World questions"}
              </span>
              <span className="text-[10px] text-muted-foreground">{Math.max(0, remaining - 1)}/3 left</span>
            </div>
            <ol className="space-y-2">
              {questions.map((q, i) => (
                <li key={i} className="text-sm leading-snug flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
            {phrases && phrases.length > 0 && activeCat && activeCat !== "plot" && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Micro-phrases (2–3 words)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {phrases.slice(0, 8).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onInsertPhrase?.(p, activeCat);
                        if (onInsertPhrase) setOpen(false);
                      }}
                      disabled={!onInsertPhrase}
                      className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-muted/50 disabled:opacity-60"
                      title={onInsertPhrase ? "Insert as card label" : "Reference only"}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {onInsertPhrase && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Click a phrase to start a card — you write the rest.
                  </p>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setOpen(false)}>
              Close
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}