import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookType,
  POV,
  ToneLevel,
  CreateBookInput,
  BOOK_TYPE_INFO,
  POV_OPTIONS,
  TONE_OPTIONS,
} from "@/types/book";

interface CreateBookWizardProps {
  onClose: () => void;
  onCreate: (input: CreateBookInput) => void;
}

type Step = 1 | 2 | 3 | 4;

const CreateBookWizard = ({ onClose, onCreate }: CreateBookWizardProps) => {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<Partial<CreateBookInput>>({
    bookType: "novel",
    pov: "third-person-limited",
    toneProfile: { primary: "conversational", intensity: 5 },
    controls: {
      velocity: 5,
      scope: 5,
      creativity: 5,
      imageGeneration: true,
      autoResume: true,
    },
  });

  const updateForm = <K extends keyof CreateBookInput>(
    key: K,
    value: CreateBookInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateControls = (key: keyof CreateBookInput["controls"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      controls: { ...prev.controls!, [key]: value },
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!formData.bookType;
      case 2:
        return !!formData.title && !!formData.theme && !!formData.audience;
      case 3:
        return !!formData.pov && !!formData.toneProfile?.primary;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (!canProceed()) return;
    onCreate(formData as CreateBookInput);
  };

  const stepTitles = [
    "Choose Book Type",
    "Book Details",
    "Voice & Tone",
    "Advanced Controls",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="relative pb-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Create New Book</CardTitle>
                <CardDescription>{stepTitles[step - 1]}</CardDescription>
              </div>
            </div>

            {/* Progress indicators */}
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  {(Object.entries(BOOK_TYPE_INFO) as [BookType, typeof BOOK_TYPE_INFO[BookType]][]).map(
                    ([type, info]) => (
                      <button
                        key={type}
                        onClick={() => updateForm("bookType", type)}
                        className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                          formData.bookType === type
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="text-3xl mb-2">{info.icon}</div>
                        <div className="font-medium text-sm">{info.label}</div>
                      </button>
                    )
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="title">Book Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter your book title"
                      value={formData.title || ""}
                      onChange={(e) => updateForm("title", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                    <Input
                      id="subtitle"
                      placeholder="A subtitle or tagline"
                      value={formData.subtitle || ""}
                      onChange={(e) => updateForm("subtitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme / Subject *</Label>
                    <Textarea
                      id="theme"
                      placeholder="Describe the main theme, subject matter, or premise of your book"
                      value={formData.theme || ""}
                      onChange={(e) => updateForm("theme", e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="genre">Genre (Optional)</Label>
                      <Input
                        id="genre"
                        placeholder="e.g., Fantasy, Romance"
                        value={formData.genre || ""}
                        onChange={(e) => updateForm("genre", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audience">Target Audience *</Label>
                      <Input
                        id="audience"
                        placeholder="e.g., Young adults, Professionals"
                        value={formData.audience || ""}
                        onChange={(e) => updateForm("audience", e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label>Point of View</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {POV_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateForm("pov", option.value)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            formData.pov === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Primary Tone</Label>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((option) => (
                        <Badge
                          key={option.value}
                          variant={
                            formData.toneProfile?.primary === option.value
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer px-4 py-2 text-sm"
                          onClick={() =>
                            updateForm("toneProfile", {
                              ...formData.toneProfile!,
                              primary: option.value,
                            })
                          }
                        >
                          {option.emoji} {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tone Intensity</Label>
                      <span className="text-sm text-muted-foreground">
                        {formData.toneProfile?.intensity}/10
                      </span>
                    </div>
                    <Slider
                      value={[formData.toneProfile?.intensity || 5]}
                      onValueChange={([v]) =>
                        updateForm("toneProfile", {
                          ...formData.toneProfile!,
                          intensity: v,
                        })
                      }
                      max={10}
                      min={1}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtle</span>
                      <span>Intense</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <ControlSlider
                    label="Velocity"
                    tooltip="Controls the pace of the narrative. Higher values create faster-paced content."
                    value={formData.controls?.velocity || 5}
                    onChange={(v) => updateControls("velocity", v)}
                    leftLabel="Slow"
                    rightLabel="Fast"
                  />
                  <ControlSlider
                    label="Scope"
                    tooltip="Controls the depth of detail. Higher values include more descriptive content."
                    value={formData.controls?.scope || 5}
                    onChange={(v) => updateControls("scope", v)}
                    leftLabel="Concise"
                    rightLabel="Detailed"
                  />
                  <ControlSlider
                    label="Creativity"
                    tooltip="Controls creative license. Higher values allow more creative interpretations."
                    value={formData.controls?.creativity || 5}
                    onChange={(v) => updateControls("creativity", v)}
                    leftLabel="Conservative"
                    rightLabel="Experimental"
                  />

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Image Generation</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Automatically generate illustrations, diagrams, and visuals
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={formData.controls?.imageGeneration}
                        onCheckedChange={(v) => updateControls("imageGeneration", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Auto-Resume</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Automatically continue generation after interruptions
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={formData.controls?.autoResume}
                        onCheckedChange={(v) => updateControls("autoResume", v)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          {/* Footer */}
          <div className="flex justify-between p-6 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={() => step > 1 && setStep((s) => (s - 1) as Step)}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={!canProceed()}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button variant="hero" onClick={handleSubmit} disabled={!canProceed()}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Create Book
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

const ControlSlider = ({
  label,
  tooltip,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <span className="text-sm text-muted-foreground">{value}/10</span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      max={10}
      min={1}
      step={1}
      className="py-2"
    />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  </div>
);

export default CreateBookWizard;
