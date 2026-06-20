import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  kind: "character" | "location";
  bookTitle?: string;
  genre?: string;
  trigger?: React.ReactNode;
  /** Called when the user clicks a suggested name. */
  onPick: (name: string) => void;
}

/** Modal that asks a few questions then lists generated name suggestions.
 *  Independent of the 3/book guiding-question cap (names are unlimited). */
export function NameSuggester({ kind, bookTitle, genre, trigger, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  // Character fields
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [nationality, setNationality] = useState("");
  const [personality, setPersonality] = useState("");
  const [convey, setConvey] = useState("");

  // Location fields
  const [region, setRegion] = useState("");
  const [climate, setClimate] = useState("");
  const [culture, setCulture] = useState("");
  const [size, setSize] = useState("");
  const [vibe, setVibe] = useState("");

  const ask = async () => {
    setLoading(true);
    setNames([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload =
        kind === "character"
          ? { mode: "name_suggestions", kind, title: bookTitle, genre, gender, age, nationality, personality, convey }
          : { mode: "name_suggestions", kind, title: bookTitle, genre, region, climate, culture, size, vibe };
      const { data, error } = await supabase.functions.invoke("suggest-canvas", {
        body: payload,
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      const list = (data as { names?: string[] })?.names ?? [];
      if (!list.length) throw new Error("No names returned");
      setNames(list);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to get name ideas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Suggest names
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-lg"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="font-serif">
                  {kind === "character" ? "Character name suggestions" : "Location name suggestions"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Answer a few quick questions. Names are unlimited and don't count toward the 3 AI guide questions.
                </DialogDescription>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {kind === "character" ? (
              <>
                <Field label="Gender">
                  <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="female / male / nonbinary" />
                </Field>
                <Field label="Age">
                  <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 34" />
                </Field>
                <Field label="Nationality / culture">
                  <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Yoruba, Norse, Japanese…" />
                </Field>
                <Field label="Personality">
                  <Input value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="stoic, witty, devout…" />
                </Field>
                <Field label="What the name should convey (optional)" full>
                  <Input value={convey} onChange={(e) => setConvey(e.target.value)} placeholder="e.g. quiet menace, lost royalty" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Region / continent">
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Mediterranean coast, central plains…" />
                </Field>
                <Field label="Climate">
                  <Input value={climate} onChange={(e) => setClimate(e.target.value)} placeholder="arid, temperate, frozen…" />
                </Field>
                <Field label="Dominant culture">
                  <Input value={culture} onChange={(e) => setCulture(e.target.value)} placeholder="Roman-inspired, nomadic…" />
                </Field>
                <Field label="Size">
                  <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="hamlet, port city, capital…" />
                </Field>
                <Field label="Vibe (optional)" full>
                  <Input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="haunted, prosperous, lawless" />
                </Field>
              </>
            )}
          </div>

          <Button onClick={ask} disabled={loading} variant="hero" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Generate suggestions
          </Button>

          {names.length > 0 && (
            <div className="border-t border-border pt-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Tap a name to use it
              </div>
              <div className="flex flex-wrap gap-1.5">
                {names.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => { onPick(n); setOpen(false); }}
                    className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-muted/60"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </label>
  );
}