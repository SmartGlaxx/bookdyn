import { Input } from "@/components/ui/input";
import { CanvasSetup } from "@/types/book";

interface Props {
  value: CanvasSetup;
  onChange: (patch: Partial<CanvasSetup>) => void;
}

export function BookSetupCard({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <h2 className="font-serif font-semibold text-lg mb-4">Book Setup</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Title">
          <Input
            value={value.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Working title"
          />
        </Field>
        <Field label="Genre">
          <Input
            value={value.genre ?? ""}
            onChange={(e) => onChange({ genre: e.target.value })}
            placeholder="Literary, thriller, romance…"
          />
        </Field>
        <Field label="Target Length">
          <Input
            value={value.lengthTarget ?? ""}
            onChange={(e) => onChange({ lengthTarget: e.target.value })}
            placeholder="e.g. 60,000 words"
          />
        </Field>
        <Field label="Tone">
          <Input
            value={value.tone ?? ""}
            onChange={(e) => onChange({ tone: e.target.value })}
            placeholder="Lyrical, dry-witty…"
          />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}