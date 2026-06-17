import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StorySummaryBullet, CanvasSetup } from "@/types/book";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  bookId: string;
  setup: CanvasSetup;
  bullets: StorySummaryBullet[];
  onAdd: () => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onReplaceAll: (next: StorySummaryBullet[]) => void;
}

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function StorySummaryList({ bookId, setup, bullets, onAdd, onUpdate, onRemove, onReplaceAll }: Props) {
  const [drafting, setDrafting] = useState(false);

  const draftWithAi = async () => {
    if (drafting) return;
    setDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("suggest-canvas", {
        body: { mode: "story_summary", bookId, payload: { setup } },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      const arr = (data as { bullets?: string[] })?.bullets ?? [];
      if (!arr.length) throw new Error("No bullets returned");
      onReplaceAll(arr.slice(0, 10).map((text) => ({ id: newId(), text })));
      toast.success("Draft summary ready — edit freely");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to draft summary");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="font-serif font-semibold text-lg">Story Summary</h2>
          <p className="text-xs text-muted-foreground">Ten short bullets that describe the whole story. Edit, add, remove freely.</p>
        </div>
        <Button variant="outline" size="sm" onClick={draftWithAi} disabled={drafting}>
          {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span className="hidden sm:inline ml-1">Draft with AI</span>
        </Button>
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