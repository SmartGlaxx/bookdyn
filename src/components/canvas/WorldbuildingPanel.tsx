import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  WorldElementCard, CanvasSetup, PRESET_WORLD_SCENARIOS,
} from "@/types/book";
import { Plus, Trash2, Globe, Sparkles } from "lucide-react";
import { NameSuggester } from "./NameSuggester";
import { cn } from "@/lib/utils";

interface Props {
  bookId?: string;
  setup: CanvasSetup;
  bullets: string[];
  elements: WorldElementCard[];
  onAdd: (seed?: Partial<WorldElementCard>) => void;
  onUpdate: (id: string, patch: Partial<WorldElementCard>) => void;
  onRemove: (id: string) => void;
}

const MIN_KIND_WORDS = 20;
const MIN_DESC_WORDS = 40;

function wc(s: string) {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

export function WorldbuildingPanel({
  setup, elements, onAdd, onUpdate, onRemove,
}: Props) {
  const [presetKey, setPresetKey] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");

  const addFromPreset = () => {
    if (presetKey === "custom") {
      if (!customLabel.trim()) return;
      onAdd({ label: customLabel.trim(), presetKey: "custom" });
      setCustomLabel("");
      setPresetKey("");
      return;
    }
    const preset = PRESET_WORLD_SCENARIOS.find((p) => p.key === presetKey);
    if (!preset) return;
    onAdd({ label: preset.label, presetKey: preset.key });
    setPresetKey("");
  };

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 mt-1 text-amber-glow" />
          <div>
            <h2 className="font-serif font-semibold text-lg">Worldbuilding</h2>
            <p className="text-xs text-muted-foreground max-w-prose">
              Pick a world-type preset (or add your own), then describe it in your own words.
              Minimum {MIN_KIND_WORDS} words for the kind / context, and {MIN_DESC_WORDS} words for the full description. AI only suggests location names — not the worldbuilding itself.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={presetKey} onValueChange={setPresetKey}>
            <SelectTrigger className="h-9 text-xs w-[200px]">
              <SelectValue placeholder="Pick a world type…" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_WORLD_SCENARIOS.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
              <SelectItem value="custom">+ Custom world…</SelectItem>
            </SelectContent>
          </Select>
          {presetKey === "custom" && (
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Custom label"
              className="h-9 text-xs w-[180px]"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addFromPreset}
            disabled={!presetKey || (presetKey === "custom" && !customLabel.trim())}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {elements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No world elements yet. Pick a preset above to start.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {elements.map((w) => {
            const kwc = wc(w.kind ?? "");
            const dwc = wc(w.description);
            return (
              <li key={w.id} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={w.label}
                    onChange={(e) => onUpdate(w.id, { label: e.target.value })}
                    placeholder="Label (e.g. Desert kingdom)"
                    className="h-9 text-sm font-medium"
                  />
                  <NameSuggester
                    kind="location"
                    bookTitle={setup.title}
                    genre={setup.genre}
                    onPick={(name) => onUpdate(w.id, { label: name })}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-9 w-9" title="Suggest location names">
                        <Sparkles className="w-4 h-4 text-amber-glow" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(w.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Kind / context
                    </span>
                    <span className={cn("text-[10px] tabular-nums", kwc >= MIN_KIND_WORDS ? "text-emerald-400" : "text-muted-foreground")}>
                      {kwc}/{MIN_KIND_WORDS}w
                    </span>
                  </div>
                  <Textarea
                    value={w.kind ?? ""}
                    onChange={(e) => onUpdate(w.id, { kind: e.target.value })}
                    rows={3}
                    placeholder={`What kind of place is this? culture, technology, era. Minimum ${MIN_KIND_WORDS} words.`}
                    className="text-sm resize-y"
                  />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Full description
                    </span>
                    <span className={cn("text-[10px] tabular-nums", dwc >= MIN_DESC_WORDS ? "text-emerald-400" : "text-muted-foreground")}>
                      {dwc}/{MIN_DESC_WORDS}w
                    </span>
                  </div>
                  <Textarea
                    value={w.description}
                    onChange={(e) => onUpdate(w.id, { description: e.target.value })}
                    rows={5}
                    placeholder={`Describe geography, people, rules, conflicts. Minimum ${MIN_DESC_WORDS} words.`}
                    className="text-sm resize-y"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}