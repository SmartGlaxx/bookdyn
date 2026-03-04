import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle, Settings2, Palette, BookOpen, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  GENRE_PRESETS,
  WORD_COUNT_PRESETS,
  getDefaultControls,
  AutomationLevel,
  DepthLevel,
  TemporalEra,
  TimelineStructure,
  SpatialScope,
} from "@/types/book";

interface CreateBookWizardProps {
  onClose: () => void;
  onCreate: (input: CreateBookInput) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const CreateBookWizard = ({ onClose, onCreate }: CreateBookWizardProps) => {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<BookCategory>("fiction");
  const [formData, setFormData] = useState<Partial<CreateBookInput>>({
    bookType: "novel",
    pov: "third-person-limited",
    toneProfile: { 
      primary: "conversational", 
      intensity: 5,
      formality: 5,
      emotionalIntensity: 5,
      humorLevel: 3,
      authorityLevel: 5,
    },
    controls: getDefaultControls("novel"),
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
    // Apply default controls for the new book type
    updateForm("controls", getDefaultControls(type));
  };

  const filteredBookTypes = useMemo(() => {
    return Object.entries(BOOK_TYPE_INFO).filter(
      ([_, info]) => info.category === selectedCategory
    ) as [BookType, typeof BOOK_TYPE_INFO[BookType]][];
  }, [selectedCategory]);

  const currentCategory = formData.bookType ? BOOK_TYPE_INFO[formData.bookType].category : "fiction";

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
      case 5:
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
    "Dynamism Controls",
    "Advanced Settings",
  ];

  const stepIcons = [
    <BookOpen className="w-4 h-4" />,
    <Sparkles className="w-4 h-4" />,
    <Palette className="w-4 h-4" />,
    <Sliders className="w-4 h-4" />,
    <Settings2 className="w-4 h-4" />,
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
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="elevated" className="overflow-hidden flex flex-col max-h-[90vh]">
          <CardHeader className="relative pb-4 border-b flex-shrink-0">
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
                {stepIcons[step - 1]}
              </div>
              <div>
                <CardTitle>Create New Book</CardTitle>
                <CardDescription>Step {step} of 5 — {stepTitles[step - 1]}</CardDescription>
              </div>
            </div>

            {/* Progress indicators */}
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Book Type Selection */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Category Tabs */}
                    <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as BookCategory)}>
                      <div className="overflow-x-auto -mx-2 px-2 pb-2">
                        <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 h-auto gap-1">
                          {(Object.entries(BOOK_CATEGORIES) as [BookCategory, typeof BOOK_CATEGORIES[BookCategory]][]).map(
                            ([cat, info]) => (
                              <TabsTrigger 
                                key={cat} 
                                value={cat} 
                                className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0"
                              >
                                {info.label.split(" ")[0]}
                              </TabsTrigger>
                            )
                          )}
                        </TabsList>
                      </div>

                      {(Object.keys(BOOK_CATEGORIES) as BookCategory[]).map((cat) => (
                        <TabsContent key={cat} value={cat} className="mt-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            {BOOK_CATEGORIES[cat].description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredBookTypes.map(([type, info]) => (
                              <button
                                key={type}
                                onClick={() => handleBookTypeChange(type)}
                                className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                                  formData.bookType === type
                                    ? "border-primary bg-primary/5 shadow-md"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="text-2xl mb-2">{info.icon}</div>
                                <div className="font-medium text-sm">{info.label}</div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {info.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </motion.div>
                )}

                {/* Step 2: Book Details */}
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
                        <Label>Genre</Label>
                        <Select
                          value={formData.genre || ""}
                          onValueChange={(v) => updateForm("genre", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select genre" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {GENRE_PRESETS[currentCategory].map((genre) => (
                              <SelectItem key={genre} value={genre}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Target Audience *</Label>
                        <Select
                          value={formData.audience || ""}
                          onValueChange={(v) => updateForm("audience", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {AUDIENCE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip 
                          label="Desired Depth" 
                          tooltip="Controls how detailed and comprehensive the content will be"
                        />
                        <Select
                          value={formData.controls?.depthLevel || "intermediate"}
                          onValueChange={(v) => updateControls("depthLevel", v as DepthLevel)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                      </div>

                      <div className="space-y-2">
                        <LabelWithTooltip 
                          label="Automation Level" 
                          tooltip="How much control you want vs. autonomous generation"
                        />
                        <Select
                          value={formData.controls?.automationLevel || "semi-autonomous"}
                          onValueChange={(v) => updateControls("automationLevel", v as AutomationLevel)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {AUTOMATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div>
                                  <div>{opt.label}</div>
                                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Voice & Tone */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <LabelWithTooltip 
                        label="Point of View" 
                        tooltip="Controls narrative distance and reader immersion"
                      />
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
                          <Tooltip key={option.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={
                                  formData.toneProfile?.primary === option.value
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer px-4 py-2 text-sm"
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

                    <div className="space-y-3">
                      <Label>Secondary Tone (Optional)</Label>
                      <div className="flex flex-wrap gap-2">
                        {TONE_OPTIONS.filter(t => t.value !== formData.toneProfile?.primary).map((option) => (
                          <Badge
                            key={option.value}
                            variant={
                              formData.toneProfile?.secondary === option.value
                                ? "amber"
                                : "outline"
                            }
                            className="cursor-pointer px-3 py-1.5 text-xs"
                            onClick={() => updateToneProfile("secondary", 
                              formData.toneProfile?.secondary === option.value ? undefined : option.value
                            )}
                          >
                            {option.emoji} {option.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Tone Profile Sliders */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <ControlSlider
                        label="Formality"
                        tooltip="How formal vs. casual the writing style should be"
                        value={formData.toneProfile?.formality || 5}
                        onChange={(v) => updateToneProfile("formality", v)}
                        leftLabel="Casual"
                        rightLabel="Formal"
                      />
                      <ControlSlider
                        label="Emotional Intensity"
                        tooltip="The level of emotional expression in the writing"
                        value={formData.toneProfile?.emotionalIntensity || 5}
                        onChange={(v) => updateToneProfile("emotionalIntensity", v)}
                        leftLabel="Restrained"
                        rightLabel="Intense"
                      />
                      <ControlSlider
                        label="Humor Level"
                        tooltip="How much humor and wit to include"
                        value={formData.toneProfile?.humorLevel || 3}
                        onChange={(v) => updateToneProfile("humorLevel", v)}
                        leftLabel="Serious"
                        rightLabel="Playful"
                      />
                      <ControlSlider
                        label="Authority Level"
                        tooltip="How authoritative and commanding the voice should be"
                        value={formData.toneProfile?.authorityLevel || 5}
                        onChange={(v) => updateToneProfile("authorityLevel", v)}
                        leftLabel="Humble"
                        rightLabel="Expert"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Dynamism Controls */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        Narrative & Conceptual Controls
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        These controls adapt based on your book type. Fiction settings affect plot and characters; non-fiction affects ideas and frameworks.
                      </p>
                    </div>

                    <ControlSlider
                      label="Velocity"
                      tooltip="Fiction: pacing of plot, tension, events. Non-fiction: rate of idea progression. Higher values mean faster progression and more frequent shifts."
                      value={formData.controls?.velocity || 5}
                      onChange={(v) => updateControls("velocity", v)}
                      leftLabel="Slow & Deep"
                      rightLabel="Fast & Dynamic"
                    />

                    <ControlSlider
                      label="Scope"
                      tooltip="Controls the depth of detail. Higher values include more descriptive content, backstory, and exploration."
                      value={formData.controls?.scope || 5}
                      onChange={(v) => updateControls("scope", v)}
                      leftLabel="Concise"
                      rightLabel="Expansive"
                    />

                    <ControlSlider
                      label="Entity Complexity"
                      tooltip="Fiction: number and depth of characters, arcs, motivations. Non-fiction: concepts, frameworks, case studies. Higher values introduce more independent entities or ideas."
                      value={formData.controls?.entityComplexity || 5}
                      onChange={(v) => updateControls("entityComplexity", v)}
                      leftLabel="Simple"
                      rightLabel="Complex"
                    />

                    <ControlSlider
                      label="Perspective Multiplexing"
                      tooltip="Allows parallel threads that eventually connect. Fiction: multiple viewpoints, parallel timelines. Non-fiction: parallel arguments, case comparisons."
                      value={formData.controls?.perspectiveMultiplexing || 3}
                      onChange={(v) => updateControls("perspectiveMultiplexing", v)}
                      leftLabel="Single Focus"
                      rightLabel="Multi-Thread"
                    />

                    <ControlSlider
                      label="Creativity"
                      tooltip="Controls creative license. Higher values allow more unexpected interpretations, metaphors, and stylistic choices."
                      value={formData.controls?.creativity || 5}
                      onChange={(v) => updateControls("creativity", v)}
                      leftLabel="Conservative"
                      rightLabel="Experimental"
                    />

                    <ControlSlider
                      label="Hook Frequency"
                      tooltip="How often hooks appear — scene changes, revelations, new characters, dialogue shifts, or action beats. High = every paragraph is a cut. Low = slower, more contemplative. For narrative types, this enforces anti-rumination: no dwelling on a single scene or thought for too long."
                      value={formData.controls?.hookFrequency || 5}
                      onChange={(v) => updateControls("hookFrequency", v)}
                      leftLabel="Contemplative"
                      rightLabel="Rapid-Fire"
                    />

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Label>Divergence Allowed</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            When enabled, allows story threads or concepts to diverge before converging, creating richer narratives.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={formData.controls?.divergenceAllowed}
                        onCheckedChange={(v) => updateControls("divergenceAllowed", v)}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Advanced Settings */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Temporal Context */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-lg">⏳</span>
                        Temporal Context
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <LabelWithTooltip 
                            label="Era" 
                            tooltip="Defines when the book takes place"
                          />
                          <Select
                            value={formData.controls?.temporalContext?.era || "contemporary"}
                            onValueChange={(v) => updateTemporalContext("era", v as TemporalEra)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50 max-h-60">
                              {TEMPORAL_ERA_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <LabelWithTooltip 
                            label="Timeline Structure" 
                            tooltip="How time flows in the narrative"
                          />
                          <Select
                            value={formData.controls?.temporalContext?.timelineStructure || "linear"}
                            onValueChange={(v) => updateTemporalContext("timelineStructure", v as TimelineStructure)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {TIMELINE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Spatial Scope */}
                    <div className="space-y-3">
                      <LabelWithTooltip 
                        label="Spatial Scope" 
                        tooltip="Controls how widely the book moves across places or contexts"
                      />
                      <div className="flex flex-wrap gap-2">
                        {SPATIAL_SCOPE_OPTIONS.map((opt) => (
                          <Tooltip key={opt.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={
                                  formData.controls?.spatialScope === opt.value
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer px-3 py-1.5"
                                onClick={() => updateControls("spatialScope", opt.value)}
                              >
                                {opt.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{opt.description}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Structure Controls */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-lg">📐</span>
                        Structure Controls
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Chapter Count</Label>
                          <Select
                            value={formData.controls?.structureControls?.chapterCount || "flexible"}
                            onValueChange={(v) => updateStructureControls("chapterCount", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="flexible">Flexible</SelectItem>
                              <SelectItem value="fixed">Fixed Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.controls?.structureControls?.chapterCount === "fixed" && (
                          <div className="space-y-2">
                            <Label>Target Chapters</Label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={formData.controls?.structureControls?.targetChapters || 10}
                              onChange={(e) => updateStructureControls("targetChapters", parseInt(e.target.value))}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label>Chapter Titles Required</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Whether each chapter must have a descriptive title
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={formData.controls?.structureControls?.titlesRequired ?? true}
                          onCheckedChange={(v) => updateStructureControls("titlesRequired", v)}
                        />
                      </div>
                    </div>

                    {/* Target Word Count */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-lg">📏</span>
                        Target Word Count
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {WORD_COUNT_PRESETS.map((preset) => (
                          <Tooltip key={preset.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={
                                  formData.controls?.structureControls?.targetWordCount === preset.value
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer px-3 py-1.5"
                                onClick={() => updateStructureControls("targetWordCount", preset.value)}
                              >
                                {preset.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{preset.description}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Generation Options */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        Generation Options
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label>Image Generation</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Automatically generate illustrations, diagrams, charts, and visual aids based on content
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
                            <TooltipContent className="max-w-xs">
                              Automatically continue generation after interruptions or failures
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
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between p-6 border-t bg-muted/30 flex-shrink-0">
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
              {step < 5 ? (
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

// Helper Components
const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <div className="flex items-center gap-2">
    <Label>{label}</Label>
    <Tooltip>
      <TooltipTrigger>
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  </div>
);

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
      <span className="text-sm font-medium text-primary">{value}/10</span>
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
