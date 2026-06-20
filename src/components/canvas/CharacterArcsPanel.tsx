import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  CharacterArcCard, CharacterTrait, CanvasSetup, PRESET_CHARACTER_TRAITS,
} from "@/types/book";
import { Plus, Trash2, Users, Sparkles, ChevronDown } from "lucide-react";
import { NameSuggester } from "./NameSuggester";
import { cn } from "@/lib/utils";

interface Props {
  bookId?: string;
  setup: CanvasSetup;
  bullets: string[];
  arcs: CharacterArcCard[];
  onAdd: (seed?: Partial<CharacterArcCard>) => void;
  onUpdate: (id: string, patch: Partial<CharacterArcCard>) => void;
  onRemove: (id: string) => void;
  onAddTrait?: (charId: string, label: string) => void;
  onUpdateTrait?: (charId: string, traitId: string, patch: Partial<CharacterTrait>) => void;
  onRemoveTrait?: (charId: string, traitId: string) => void;
}

const MIN_TRAIT_WORDS = 20;

function wordCount(s: string) {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function CharacterArcsPanel({
  setup, arcs, onAdd, onUpdate, onRemove,
  onAddTrait, onUpdateTrait, onRemoveTrait,
}: Props) {
  // Internal trait CRUD — works whether parent supplies dedicated handlers or not.
  const addTrait = (charId: string, label: string) => {
    if (onAddTrait) return onAddTrait(charId, label);
    const char = arcs.find((a) => a.id === charId);
    if (!char) return;
    onUpdate(charId, {
      traits: [...(char.traits ?? []), { id: newId(), label, description: "" }],
    });
  };
  const updateTrait = (charId: string, traitId: string, patch: Partial<CharacterTrait>) => {
    if (onUpdateTrait) return onUpdateTrait(charId, traitId, patch);
    const char = arcs.find((a) => a.id === charId);
    if (!char) return;
    onUpdate(charId, {
      traits: (char.traits ?? []).map((t) => (t.id === traitId ? { ...t, ...patch } : t)),
    });
  };
  const removeTrait = (charId: string, traitId: string) => {
    if (onRemoveTrait) return onRemoveTrait(charId, traitId);
    const char = arcs.find((a) => a.id === charId);
    if (!char) return;
    onUpdate(charId, { traits: (char.traits ?? []).filter((t) => t.id !== traitId) });
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 mt-1 text-amber-glow" />
          <div>
            <h2 className="font-serif font-semibold text-lg">Character Arcs</h2>
            <p className="text-xs text-muted-foreground max-w-prose">
              Add a card per main character. Pick from preset traits or add your own. Each trait needs at least {MIN_TRAIT_WORDS} words of description — written by you. AI only suggests names.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onAdd()}>
          <Plus className="w-4 h-4 mr-1" /> Add character
        </Button>
      </div>

      {arcs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No characters yet.
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
                  className="h-9 text-sm font-medium"
                />
                <NameSuggester
                  kind="character"
                  bookTitle={setup.title}
                  genre={setup.genre}
                  onPick={(name) => onUpdate(a.id, { name })}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9" title="Suggest names">
                      <Sparkles className="w-4 h-4 text-amber-glow" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost" size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(a.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Personality traits ({(a.traits ?? []).length})
                  </span>
                  <TraitPicker
                    selected={(a.traits ?? []).map((t) => t.label)}
                    onPick={(label) => addTrait(a.id, label)}
                  />
                </div>

                {(a.traits ?? []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic py-2">
                    Pick or add traits to start describing this character.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(a.traits ?? []).map((t) => {
                      const wc = wordCount(t.description);
                      const ok = wc >= MIN_TRAIT_WORDS;
                      return (
                        <li key={t.id} className="rounded-lg border border-border/70 bg-card/30 p-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={t.label}
                              onChange={(e) => updateTrait(a.id, t.id, { label: e.target.value })}
                              placeholder="Trait"
                              className="h-7 text-xs font-medium"
                            />
                            <span className={cn("text-[10px] tabular-nums", ok ? "text-emerald-400" : "text-muted-foreground")}>
                              {wc}/{MIN_TRAIT_WORDS}w
                            </span>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTrait(a.id, t.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <Textarea
                            value={t.description}
                            onChange={(e) => updateTrait(a.id, t.id, { description: e.target.value })}
                            placeholder={`Describe how this trait shows up — minimum ${MIN_TRAIT_WORDS} words, no upper limit.`}
                            rows={3}
                            className="mt-2 text-sm resize-y"
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TraitPicker({
  selected, onPick,
}: { selected: string[]; onPick: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const isSel = (label: string) =>
    selected.some((s) => s.trim().toLowerCase() === label.trim().toLowerCase());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          Add trait <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Preset traits — pick any
        </div>
        <ul className="max-h-56 overflow-y-auto space-y-1 pr-1">
          {PRESET_CHARACTER_TRAITS.map((label) => {
            const sel = isSel(label);
            return (
              <li key={label}>
                <button
                  disabled={sel}
                  onClick={() => { onPick(label); }}
                  className={cn(
                    "w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60",
                    sel && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Checkbox checked={sel} className="pointer-events-none" />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border mt-2 pt-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Custom trait
          </div>
          <div className="flex gap-1.5">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. Reckless devotion"
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onPick(custom.trim());
                  setCustom("");
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => { if (custom.trim()) { onPick(custom.trim()); setCustom(""); } }}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}