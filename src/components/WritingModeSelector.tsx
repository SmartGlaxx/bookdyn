import { Pen, FileText, Zap, Rocket, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutomationLevel } from "@/types/book";
import { useTurbo } from "@/hooks/useTurbo";
import { cn } from "@/lib/utils";

interface WritingModeSelectorProps {
  value: AutomationLevel;
  onChange: (value: AutomationLevel) => void;
  disabled?: boolean;
}

const MODES = [
  {
    value: "guided" as const,
    label: "Guided Mode",
    description: "2–3 sentences at a time",
    helper: "Write sentence-by-sentence with full control",
    icon: Pen,
  },
  {
    value: "assisted" as const,
    label: "Assisted Mode",
    description: "1 paragraph per generation",
    helper: "Generate paragraphs with guidance",
    icon: FileText,
  },
  {
    value: "semi-auto" as const,
    label: "Semi-Auto Mode",
    description: "1 chapter per generation",
    helper: "Generate full chapters with review",
    icon: Zap,
  },
  {
    value: "auto-draft" as const,
    label: "Auto Draft Mode",
    description: "Full book generation",
    helper: "Generate entire book automatically (unlocked by progress)",
    icon: Rocket,
    locked: true,
  },
];

export function WritingModeSelector({ value, onChange, disabled }: WritingModeSelectorProps) {
  const turbo = useTurbo();
  const canAutoDraft = turbo.canUseAutoDraft;
  const activeMode = MODES.find((m) => m.value === value);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === "auto-draft" && !canAutoDraft) return;
        onChange(v as AutomationLevel);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-auto w-full text-xs py-2">
        <SelectValue>
          {activeMode && (
            <div className="flex items-center gap-2 text-left min-w-0">
              {(() => { const Icon = activeMode.icon; return <Icon className="w-3.5 h-3.5 shrink-0" />; })()}
              <div className="min-w-0">
                <div className="font-medium">{activeMode.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{activeMode.description}</div>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MODES
          .filter((mode) => mode.value !== "auto-draft" || canAutoDraft)
          .map((mode) => {
            const Icon = mode.icon;
            return (
            <SelectItem
              key={mode.value}
              value={mode.value}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" />
                <div className="text-left">
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-[10px] text-muted-foreground">{mode.description}</div>
                </div>
              </div>
            </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
}
