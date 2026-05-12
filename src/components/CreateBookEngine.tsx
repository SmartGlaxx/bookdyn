import { useState, useMemo, useRef, useEffect } from "react";
import { sanitizeText } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle, Settings2, Palette, BookOpen, Sliders, Check, FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookType,
  BookCategory,
  POV,
  ToneLevel,
  CreateBookInput,
  BOOK_TYPE_INFO,
  BOOK_CATEGORIES,
  POV_OPTIONS,
  TONE_OPTIONS,
  AUTOMATION_OPTIONS,
  DEPTH_OPTIONS,
  TEMPORAL_ERA_OPTIONS,
  TIMELINE_OPTIONS,
  SPATIAL_SCOPE_OPTIONS,
  AUDIENCE_OPTIONS,
  BOOK_TYPE_AUDIENCES,
  GENRE_PRESETS,
  BOOK_TYPE_GENRES,
  ENABLED_BOOK_TYPES,
  WORD_COUNT_PRESETS,
  TEASER_STYLE_OPTIONS,
  getDefaultControls,
  AutomationLevel,
  DepthLevel,
  TemporalEra,
  TimelineStructure,
  SpatialScope,
  TeaserStyle,
  VISUAL_BOOK_TYPES,
  BOOK_TEMPLATES,
  FrontMatterSelection,
  FRONT_MATTER_LABELS,
  getDefaultFrontMatter,
  Book,
} from "@/types/book";
import { TemplateSelector } from "@/components/TemplateSelector";
import { SeriesPicker } from "@/components/SeriesPicker";
import { useTurbo } from "@/hooks/useTurbo";

interface CreateBookEngineProps {
  onClose: () => void;
  onCreate: (input: CreateBookInput) => void;
  existingBooks?: Book[];
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_META = [
  { title: "Type", icon: BookOpen, color: "from-primary/80 to-primary" },
  { title: "Details", icon: Sparkles, color: "from-amber-glow/80 to-primary" },
  { title: "Voice", icon: Palette, color: "from-primary to-accent" },
  { title: "Controls", icon: Sliders, color: "from-accent to-primary" },
  { title: "Advanced", icon: Settings2, color: "from-primary/80 to-primary" },
  { title: "Front Matter", icon: FileText, color: "from-amber-glow/80 to-primary" },
];

const CreateBookEngine = ({ onClose, onCreate, existingBooks = [] }: CreateBookEngineProps) => {
  const [step, setStep] = useState<Step>(1);
  const { canUseAutoDraft: canAutoDraft } = useTurbo();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<BookCategory>("fiction");
  // Series flow state (only used for fiction-serial)
  const [serialChoice, setSerialChoice] = useState<"none" | "new" | "continue">("none");
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  const [parentBook, setParentBook] = useState<Book | null>(null);
  const [frontMatter, setFrontMatter] = useState<FrontMatterSelection>(getDefaultFrontMatter("novel"));
  const [parentSeriesId, setParentSeriesId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreateBookInput>>({
    bookType: "novel",
    language: "English",
    pov: "third-person-limited",
    toneProfile: {
      primary: "conversational",
      intensity: 5,
      formality: 5,
      emotionalIntensity: 5,
      humorLevel: 3,
      authorityLevel: 5,
    },
    controls: { ...getDefaultControls("novel"), automationLevel: "" as AutomationLevel, depthLevel: "" as DepthLevel, temporalContext: { era: "" as TemporalEra, timelineStructure: "" as TimelineStructure }, structureControls: { ...getDefaultControls("novel").structureControls, chapterCount: "" as any, sectionsPerChapterMode: "" as any } },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const updateForm = <K extends keyof CreateBookInput>(key: K, value: CreateBookInput[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateControls = (key: keyof CreateBookInput["controls"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      controls: { ...prev.controls!, [key]: value },
    }));
  };

  const updateToneProfile = (key: keyof CreateBookInput["toneProfile"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      toneProfile: { ...prev.toneProfile!, [key]: value },
    }));
  };

  const updateTemporalContext = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      controls: {
        ...prev.controls!,
        temporalContext: { ...prev.controls!.temporalContext, [key]: value },
      },
    }));
  };

  const updateStructureControls = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      controls: {
        ...prev.controls!,
        structureControls: { ...prev.controls!.structureControls, [key]: value },
      },
    }));
  };

  const handleBookTypeChange = (type: BookType) => {
    updateForm("bookType", type);
    // Image Generation is temporarily disabled across the app for the test launch.
    updateForm("controls", { ...getDefaultControls(type), imageGeneration: false, automationLevel: "" as AutomationLevel, depthLevel: "" as DepthLevel, temporalContext: { era: "" as TemporalEra, timelineStructure: "" as TimelineStructure }, structureControls: { ...getDefaultControls(type).structureControls, chapterCount: "" as any, sectionsPerChapterMode: "" as any } });
    setFrontMatter(getDefaultFrontMatter(type));
    const allowed = BOOK_TYPE_AUDIENCES[type];
    if (formData.audience && allowed && !allowed.includes(formData.audience)) {
      updateForm("audience", "");
    }
    // Reset series flow if type changes away from fiction-serial
    if (type !== "fiction-serial") {
      setSerialChoice("none");
      setParentBook(null);
      setParentSeriesId(null);
    } else {
      setSerialChoice("none");
    }
    // Auto-select first template for visual book types, clear for others
    if (VISUAL_BOOK_TYPES.includes(type)) {
      const firstTemplate = BOOK_TEMPLATES.find(t => t.bookType === type);
      if (firstTemplate) updateControls("selectedTemplateId", firstTemplate.id);
      // Smooth scroll to template section after render
      setTimeout(() => {
        document.getElementById("template-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      updateControls("selectedTemplateId", undefined);
    }
  };

  const isVisualBookType = VISUAL_BOOK_TYPES.includes(formData.bookType || "novel");
  const isSerial = formData.bookType === "fiction-serial";

  /** When a parent book is picked: pre-fill EVERYTHING (editable). */
  const handlePickParent = (source: Book) => {
    setParentBook(source);
    setParentSeriesId(source.seriesId || source.id);
    setShowSeriesPicker(false);
    setSerialChoice("continue");
    setFormData((prev) => ({
      ...prev,
      // Reset title — user names the new book
      title: "",
      subtitle: undefined,
      // Copy everything else, fully editable
      bookType: "fiction-serial",
      theme: source.theme,
      genre: source.genre,
      language: source.language,
      audience: source.audience,
      pov: source.pov,
      toneProfile: source.toneProfile,
      controls: source.controls,
    }));
    setFrontMatter(source.frontMatter?.selection || getDefaultFrontMatter("fiction-serial"));
  };

  const filteredBookTypes = useMemo(() => {
    return Object.entries(BOOK_TYPE_INFO).filter(
      ([_, info]) => info.category === selectedCategory
    ) as [BookType, (typeof BOOK_TYPE_INFO)[BookType]][];
  }, [selectedCategory]);

  const currentCategory = formData.bookType ? BOOK_TYPE_INFO[formData.bookType].category : "fiction";

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.bookType;
      case 2: return !!formData.title && !!formData.theme && !!formData.audience;
      case 3: return !!formData.pov && !!formData.toneProfile?.primary;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleSubmit = () => {
    if (!canProceed()) return;
    // Sanitize user-entered text fields before submission
    const sanitized = {
      ...formData,
      title: sanitizeText((formData.title || "").trim()).substring(0, 200),
      theme: sanitizeText((formData.theme || "").trim()).substring(0, 1000),
      subtitle: formData.subtitle ? sanitizeText(formData.subtitle.trim()).substring(0, 300) : undefined,
      seriesId: parentSeriesId || undefined,
      parentBookId: parentBook?.id,
      frontMatter: { selection: frontMatter },
    } as CreateBookInput;
    onCreate(sanitized);
  };

  const stepAnim = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.25 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:mx-[8rem] h-[80dvh] sm:h-auto sm:max-h-[85vh] flex flex-col bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/50">
          {/* Drag indicator on mobile */}
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-semibold text-foreground">New Book</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEP_META.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isDone) setStep((i + 1) as Step);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  <span className="hidden xs:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {/* ───── Step 1: Book Type ───── */}
              {step === 1 && (
                <motion.div key="step1" {...stepAnim} className="space-y-4">
                  {/* Category chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(BOOK_CATEGORIES) as [BookCategory, (typeof BOOK_CATEGORIES)[BookCategory]][]).map(
                      ([cat, info]) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-[11px] py-1 px-3 rounded-full transition-all ${
                            selectedCategory === cat
                              ? "bg-primary text-primary-foreground font-medium shadow-sm"
                              : "bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
                          }`}
                        >
                          {info.label}
                        </button>
                      )
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {BOOK_CATEGORIES[selectedCategory].description}
                  </p>

                  {/* Book type grid */}
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
                  >
                    {filteredBookTypes.map(([type, info]) => {
                      const isSelected = formData.bookType === type;
                      const isDisabled = !ENABLED_BOOK_TYPES.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => !isDisabled && handleBookTypeChange(type)}
                          disabled={isDisabled}
                          aria-disabled={isDisabled}
                          title={isDisabled ? "Coming soon" : undefined}
                          className={`group relative rounded-xl p-3 text-left transition-all border ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : isDisabled
                                ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-3.5 h-3.5 text-primary" />
                            </div>
                          )}
                          {isDisabled && (
                            <div className="absolute top-1.5 right-1.5">
                              <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                Soon
                              </span>
                            </div>
                          )}
                          <span className="text-lg block mb-1">{info.icon}</span>
                          <div className="font-medium text-xs text-foreground leading-tight">{info.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {info.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Template selection for visual book types */}
                  {isVisualBookType && formData.bookType && (
                    <div id="template-section">
                      <TemplateSelector
                        bookType={formData.bookType}
                        selectedTemplateId={formData.controls?.selectedTemplateId}
                        onSelect={(id) => updateControls("selectedTemplateId", id)}
                      />
                    </div>
                  )}

                  {/* Serialized fiction sub-flow */}
                  {isSerial && (
                    <div className="mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        Serialized Fiction
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Start a new series, or continue from one of your existing books. Continuing copies all
                        the source book's settings (you can still edit anything) and links the new book into the same series.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setSerialChoice("new"); setParentBook(null); setParentSeriesId(null); }}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            serialChoice === "new" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="font-medium text-xs">Start a new series</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Configure everything from scratch.</div>
                        </button>
                        <button
                          onClick={() => setShowSeriesPicker(true)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            serialChoice === "continue" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="font-medium text-xs">Continue from existing book</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {parentBook ? `From: ${parentBook.title}` : "Pick any novel or series book."}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ───── Step 2: Book Details ───── */}
              {step === 2 && (
                <motion.div key="step2" {...stepAnim} className="space-y-4">
                  <FieldGroup label="Book Title *">
                    <Input
                      placeholder="Enter your book title"
                      value={formData.title || ""}
                      onChange={(e) => updateForm("title", e.target.value)}
                    />
                  </FieldGroup>

                  <FieldGroup label="Subtitle" optional>
                    <Input
                      placeholder="A subtitle or tagline"
                      value={formData.subtitle || ""}
                      onChange={(e) => updateForm("subtitle", e.target.value)}
                    />
                  </FieldGroup>

                  <FieldGroup label="Theme / Subject *">
                    <Textarea
                      placeholder="Describe the main theme, subject matter, or premise"
                      value={formData.theme || ""}
                      onChange={(e) => updateForm("theme", e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </FieldGroup>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Genre">
                      <Select value={formData.genre || ""} onValueChange={(v) => updateForm("genre", v)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {(formData.bookType && BOOK_TYPE_GENRES[formData.bookType]
                            ? BOOK_TYPE_GENRES[formData.bookType]!
                            : GENRE_PRESETS[currentCategory]
                          ).map((genre) => (
                            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>

                    <FieldGroup label="Audience *">
                      <Select value={formData.audience || ""} onValueChange={(v) => updateForm("audience", v)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {AUDIENCE_OPTIONS
                            .filter((option) => {
                              const allowedAudiences = formData.bookType ? BOOK_TYPE_AUDIENCES[formData.bookType] : null;
                              return !allowedAudiences || allowedAudiences.includes(option.value);
                            })
                            .map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Depth" tooltip="Controls how detailed the content will be">
                      <Select
                        value={formData.controls?.depthLevel || ""}
                        onValueChange={(v) => updateControls("depthLevel", v as DepthLevel)}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {DEPTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div>
                                <div>{opt.label}</div>
                                <div className="text-xs text-muted-foreground">{opt.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>

                    <FieldGroup label="Automation" tooltip="Controls generation flow.">
                      <Select
                        value={formData.controls?.automationLevel || ""}
                        onValueChange={(v) => {
                          if (v === "auto-draft" && !canAutoDraft) return;
                          updateControls("automationLevel", v as AutomationLevel);
                        }}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {AUTOMATION_OPTIONS
                            .filter((opt) => opt.value !== "auto-draft" || canAutoDraft)
                            .map((opt) => (
                              <SelectItem 
                                key={opt.value} 
                                value={opt.value}
                              >
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      {opt.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <FieldGroup label="Language" tooltip="The language the book will be written in">
                    <Select
                      value={formData.language || "English"}
                      onValueChange={(v) => updateForm("language", v)}
                    >
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select language" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {[
                          "English","French","Spanish","German","Portuguese",
                          "Chinese","Japanese","Russian","Hindi","Arabic"
                        ].map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </motion.div>
              )}

              {/* ───── Step 3: Voice & Tone ───── */}
              {step === 3 && (
                <motion.div key="step3" {...stepAnim} className="space-y-5">
                  <div className="space-y-2.5">
                    <SectionLabel label="Point of View" tooltip="Controls narrative distance and reader immersion" />
                    <div className="grid grid-cols-2 gap-2">
                      {POV_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateForm("pov", option.value)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            formData.pov === option.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="font-medium text-xs">{option.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs">Primary Tone</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONE_OPTIONS.map((option) => (
                        <Tooltip key={option.value}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={formData.toneProfile?.primary === option.value ? "default" : "outline"}
                              className="cursor-pointer px-2.5 py-1 text-[11px]"
                              onClick={() => updateToneProfile("primary", option.value)}
                            >
                              {option.emoji} {option.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{option.description}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs">Secondary Tone <span className="text-muted-foreground">(optional)</span></Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONE_OPTIONS.filter((t) => t.value !== formData.toneProfile?.primary).map((option) => (
                        <Badge
                          key={option.value}
                          variant={formData.toneProfile?.secondary === option.value ? "amber" : "outline"}
                          className="cursor-pointer px-2.5 py-1 text-[11px]"
                          onClick={() =>
                            updateToneProfile(
                              "secondary",
                              formData.toneProfile?.secondary === option.value ? undefined : option.value
                            )
                          }
                        >
                          {option.emoji} {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50 space-y-4">
                    <CompactSlider label="Formality" tooltip="How formal vs. casual" value={formData.toneProfile?.formality || 5} onChange={(v) => updateToneProfile("formality", v)} left="Casual" right="Formal" />
                    <CompactSlider label="Emotion" tooltip="Level of emotional expression" value={formData.toneProfile?.emotionalIntensity || 5} onChange={(v) => updateToneProfile("emotionalIntensity", v)} left="Restrained" right="Intense" />
                    <CompactSlider label="Humor" tooltip="How much humor and wit" value={formData.toneProfile?.humorLevel || 3} onChange={(v) => updateToneProfile("humorLevel", v)} left="Serious" right="Playful" />
                    <CompactSlider label="Authority" tooltip="How authoritative the voice is" value={formData.toneProfile?.authorityLevel || 5} onChange={(v) => updateToneProfile("authorityLevel", v)} left="Humble" right="Expert" />
                  </div>
                </motion.div>
              )}

              {/* ───── Step 4: Dynamism Controls ───── */}
              {step === 4 && (
                <motion.div key="step4" {...stepAnim} className="space-y-4">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <Sliders className="w-3.5 h-3.5 text-primary inline mr-1.5 -mt-0.5" />
                      These controls adapt based on your book type. Fiction affects plot and characters; non-fiction affects ideas and frameworks.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <CompactSlider label="Velocity" tooltip="Pacing of plot/idea progression" value={formData.controls?.velocity || 5} onChange={(v) => updateControls("velocity", v)} left="Slow & Deep" right="Fast & Dynamic" />
                    <CompactSlider label="Scope" tooltip="Controls the depth of detail" value={formData.controls?.scope || 5} onChange={(v) => updateControls("scope", v)} left="Concise" right="Expansive" />
                    <CompactSlider label="Entity Complexity" tooltip="Depth of characters/concepts" value={formData.controls?.entityComplexity || 5} onChange={(v) => updateControls("entityComplexity", v)} left="Simple" right="Complex" />
                    <CompactSlider label="Perspective" tooltip="Parallel threads that connect" value={formData.controls?.perspectiveMultiplexing || 3} onChange={(v) => updateControls("perspectiveMultiplexing", v)} left="Single Focus" right="Multi-Thread" />
                    <CompactSlider label="Creativity" tooltip="Creative license level" value={formData.controls?.creativity || 5} onChange={(v) => updateControls("creativity", v)} left="Conservative" right="Experimental" />
                    <CompactSlider label="Hook Frequency" tooltip="How often hooks and shifts appear" value={formData.controls?.hookFrequency || 5} onChange={(v) => updateControls("hookFrequency", v)} left="Contemplative" right="Rapid-Fire" />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <SectionLabel label="Divergence" tooltip="Allows story threads to diverge before converging" />
                    <Switch
                      checked={formData.controls?.divergenceAllowed}
                      onCheckedChange={(v) => updateControls("divergenceAllowed", v)}
                    />
                  </div>
                </motion.div>
              )}

              {/* ───── Step 5: Advanced Settings ───── */}
              {step === 5 && (
                <motion.div key="step5" {...stepAnim} className="space-y-5">
                  {/* Temporal Context */}
                  <Section emoji="⏳" title="Temporal Context">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup label="Era" tooltip="When the book takes place">
                        <Select
                          value={formData.controls?.temporalContext?.era || ""}
                          onValueChange={(v) => updateTemporalContext("era", v as TemporalEra)}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-60">
                            {TEMPORAL_ERA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldGroup>

                      <FieldGroup label="Timeline" tooltip="How time flows in the narrative">
                        <Select
                          value={formData.controls?.temporalContext?.timelineStructure || ""}
                          onValueChange={(v) => updateTemporalContext("timelineStructure", v as TimelineStructure)}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {TIMELINE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                    </div>
                  </Section>

                  {/* Spatial Scope */}
                  <Section emoji="🌍" title="Spatial Scope">
                    <div className="flex flex-wrap gap-1.5">
                      {SPATIAL_SCOPE_OPTIONS.map((opt) => (
                        <Tooltip key={opt.value}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={formData.controls?.spatialScope === opt.value ? "default" : "outline"}
                              className="cursor-pointer px-2.5 py-1 text-[11px]"
                              onClick={() => updateControls("spatialScope", opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{opt.description}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </Section>

                  {/* Structure */}
                  <Section emoji="📐" title="Structure">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup label="Chapter Count">
                        <Select
                          value={formData.controls?.structureControls?.chapterCount || ""}
                          onValueChange={(v) => updateStructureControls("chapterCount", v)}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="flexible">Flexible</SelectItem>
                            <SelectItem value="fixed">Fixed Number</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.controls?.structureControls?.chapterCount === "fixed" && (
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            className="mt-2 text-xs"
                            placeholder="Target chapters"
                            value={formData.controls?.structureControls?.targetChapters || 10}
                            onChange={(e) => updateStructureControls("targetChapters", parseInt(e.target.value))}
                          />
                        )}
                      </FieldGroup>

                      <FieldGroup label="Sections/Chapter" tooltip="How many sections each chapter contains">
                        <Select
                          value={formData.controls?.structureControls?.sectionsPerChapterMode || ""}
                          onValueChange={(v) => updateStructureControls("sectionsPerChapterMode", v)}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="flexible">Flexible</SelectItem>
                            <SelectItem value="fixed">Fixed Number</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.controls?.structureControls?.sectionsPerChapterMode === "fixed" && (
                          <Input
                            type="number"
                            min={2}
                            max={10}
                            className="mt-2 text-xs"
                            placeholder="Sections per chapter"
                            value={formData.controls?.structureControls?.sectionsPerChapter || 4}
                            onChange={(e) =>
                              updateStructureControls("sectionsPerChapter", Math.max(2, Math.min(10, parseInt(e.target.value) || 4)))
                            }
                          />
                        )}
                      </FieldGroup>
                    </div>

                    <ToggleRow
                      label="Chapter Titles"
                      tooltip="Whether each chapter must have a descriptive title"
                      checked={formData.controls?.structureControls?.titlesRequired ?? true}
                      onChange={(v) => updateStructureControls("titlesRequired", v)}
                    />
                  </Section>

                  {/* Teasers */}
                  <Section emoji="✨" title="Section Teasers">
                    <div className="grid grid-cols-2 gap-2">
                      {TEASER_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateControls("teaserStyle", opt.value as TeaserStyle)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            formData.controls?.teaserStyle === opt.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="font-medium text-xs">{opt.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                            {opt.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Section>

                  {/* Word Count */}
                  <Section emoji="📏" title="Target Word Count">
                    <div className="flex flex-wrap gap-1.5">
                      {WORD_COUNT_PRESETS.map((preset) => (
                        <Tooltip key={preset.value}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={
                                formData.controls?.structureControls?.targetWordCount === preset.value
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer px-2.5 py-1 text-[11px]"
                              onClick={() => updateStructureControls("targetWordCount", preset.value)}
                            >
                              {preset.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{preset.description}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Banned words */}
                    <div className="mt-4">
                      <Label className="text-xs">Words to Exclude <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        placeholder="e.g. suddenly, very, literally — comma separated"
                        className="mt-1.5 text-xs"
                        value={(formData.controls?.bannedWords || []).join(", ")}
                        onChange={(e) => {
                          const list = e.target.value
                            .split(/[,\n]/)
                            .map((w) => sanitizeText(w.trim()))
                            .filter((w) => w.length > 0 && w.length <= 50)
                            .slice(0, 50);
                          updateControls("bannedWords", list);
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        These words will be avoided in the generated text. Separate with commas.
                      </p>
                    </div>
                  </Section>

                  {/* Generation Options */}
                  <Section emoji="⚡" title="Generation Options">
                    {/* Image Generation temporarily disabled for the test launch.
                        Re-enable by restoring the ToggleRow + Image Frequency slider here. */}
                    <ToggleRow
                      label="Auto-Resume"
                      tooltip="Continue generation after interruptions"
                      checked={formData.controls?.autoResume}
                      onChange={(v) => updateControls("autoResume", v)}
                    />
                    {["novel", "fiction-serial", "short-story", "biography", "memoir", "drama"].includes(formData.bookType || "") && (
                      <ToggleRow
                        label="Cliffhanger Intro"
                        tooltip="After the book is finished, generate a short cliffhanger snippet — drawn from a key scene — that opens the book and compels readers to keep reading."
                        checked={!!formData.controls?.includeIntro}
                        onChange={(v) => updateControls("includeIntro", v)}
                      />
                    )}
                  </Section>
                </motion.div>
              )}

              {/* ───── Step 6: Front Matter & Summary ───── */}
              {step === 6 && (
                <motion.div key="step6" {...stepAnim} className="space-y-4">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <FileText className="w-3.5 h-3.5 text-primary inline mr-1.5 -mt-0.5" />
                      Pick which front-matter pages to include. Copyright and Table of Contents are
                      generated automatically from your details. Preface, Introduction, and Prologue are
                      drafted by AI <em>after</em> the book is finished, so the details match what was actually written.
                      A one-page Book Summary is built quietly in the background as you write and placed at the back of the book.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(FRONT_MATTER_LABELS) as (keyof FrontMatterSelection)[]).map((key) => {
                      const meta = FRONT_MATTER_LABELS[key];
                      const checked = !!frontMatter[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFrontMatter((p) => ({ ...p, [key]: !p[key] }))}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                            checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                            checked ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs">{meta.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{meta.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {parentBook && (
                    <div className="p-3 rounded-xl border border-amber-glow/30 bg-amber-glow/5 text-[11px] text-muted-foreground">
                      <strong className="text-foreground">Continuing from:</strong> {parentBook.title}. The new
                      book will be linked into the same series. The previous book's summary will guide outline generation.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 && setStep((s) => (s - 1) as Step)}
            disabled={step === 1}
            className="text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
              Cancel
            </Button>
            {step < 6 ? (
              <Button size="sm" onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed()} className="text-xs">
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button variant="hero" size="sm" onClick={handleSubmit} disabled={!canProceed()} className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Create Book
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Helper Components ─── */

const FieldGroup = ({
  label,
  tooltip,
  optional,
  children,
}: {
  label: string;
  tooltip?: string;
  optional?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5">
      <Label className="text-xs">{label}</Label>
      {optional && <span className="text-[10px] text-muted-foreground">(optional)</span>}
      {tooltip && (
        <Tooltip>
          <TooltipTrigger className="flex-shrink-0">
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
    {children}
  </div>
);

const SectionLabel = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <div className="flex items-center gap-1.5">
    <Label className="text-xs">{label}</Label>
    <Tooltip>
      <TooltipTrigger className="flex-shrink-0">
        <HelpCircle className="w-3 h-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  </div>
);

const Section = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm flex items-center gap-1.5">
      <span className="text-base">{emoji}</span>
      {title}
    </h4>
    {children}
  </div>
);

const ToggleRow = ({
  label,
  tooltip,
  checked,
  onChange,
}: {
  label: string;
  tooltip: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-1">
    <SectionLabel label={label} tooltip={tooltip} />
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const CompactSlider = ({
  label,
  tooltip,
  value,
  onChange,
  left,
  right,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <SectionLabel label={label} tooltip={tooltip} />
      <span className="text-[11px] font-medium text-primary tabular-nums">{value}/10</span>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} max={10} min={1} step={1} className="py-1" />
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  </div>
);

export default CreateBookEngine;
