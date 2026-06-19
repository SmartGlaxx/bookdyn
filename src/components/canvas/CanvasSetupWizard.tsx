import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreateBookInput, BookType, TemporalEra, BOOK_TYPE_INFO, ENABLED_BOOK_TYPES,
  BOOK_TYPE_AUDIENCES, AUDIENCE_OPTIONS, getDefaultControls, getDefaultFrontMatter,
  TONE_OPTIONS, TEMPORAL_ERA_OPTIONS, StoryCanvas, StoryArcCard, StoryArcColor,
  CanvasChapter, ToneProfile, ToneLevel, EMPTY_CANVAS, CharacterArcCard, WorldElementCard,
} from "@/types/book";
import { ARC_COLOR_CLASS, ARC_COLORS } from "@/hooks/useCanvas";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, Loader2, Pin,
  GripVertical, X,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { SortableCard } from "./SortableCard";
import { AskAIGuide } from "./AskAIGuide";
import { CharacterArcsPanel } from "./CharacterArcsPanel";
import { WorldbuildingPanel } from "./WorldbuildingPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEP_LABELS: Record<Step, string> = {
  1: "Book Setup",
  2: "Story Summary",
  3: "Story Arc",
  4: "Characters",
  5: "World",
  6: "Chapter Matrix",
};

const DEFAULT_ARC_COLORS: StoryArcColor[] = [
  "setup", "setup",
  "rising", "rising", "rising",
  "midpoint",
  "climax",
  "fall", "fall",
  "resolution",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateBookInput) => Promise<void> | void;
  isCreating?: boolean;
}

export function CanvasSetupWizard({ open, onClose, onCreate, isCreating }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [title, setTitle] = useState("");
  const [bookType, setBookType] = useState<BookType>("novel");
  const [genre, setGenre] = useState("");
  const [tone, setTone] = useState<ToneLevel>("conversational");
  const [era, setEra] = useState<TemporalEra>("contemporary");
  const [aiCreativity, setAiCreativity] = useState(5);

  // Step 2
  const [bullets, setBullets] = useState(
    Array.from({ length: 10 }, () => ({ id: newId(), text: "" })),
  );

  // Step 3 (derived from bullets on first entry)
  const [arc, setArc] = useState<StoryArcCard[]>([]);
  const [arcInit, setArcInit] = useState(false);

  // Step 4
  const [chapters, setChapters] = useState<CanvasChapter[]>([]);
  const [chaptersInit, setChaptersInit] = useState(false);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  // Steps 4 & 5 — characters and world (optional but encouraged)
  const [characterArcs, setCharacterArcs] = useState<CharacterArcCard[]>([]);
  const [worldElements, setWorldElements] = useState<WorldElementCard[]>([]);

  // AI counter (client mirror — server-enforced once book exists)
  const [aiUsed, setAiUsed] = useState(0);

  const filledBullets = bullets.filter((b) => b.text.trim().length > 0);
  const canAdvance: Record<Step, boolean> = {
    1: title.trim().length > 0 && genre.trim().length > 0,
    2: filledBullets.length >= 10,
    3: arc.length >= 10,
    4: true, // optional
    5: true, // optional
    6: chapters.length > 0 && chapters.every((c) => c.title.trim().length > 0),
  };

  const goNext = () => {
    if (!canAdvance[step]) return;
    if (step === 2 && !arcInit) {
      setArc(
        filledBullets.map((b, i) => ({
          id: newId(),
          text: b.text.trim(),
          color: DEFAULT_ARC_COLORS[i] ?? "neutral",
        })),
      );
      setArcInit(true);
    }
    if (step === 5 && !chaptersInit) {
      setChapters(
        arc.map((a, i) => ({
          id: newId(),
          title: `Chapter ${i + 1}`,
          plot: "",
          scenes: [],
        })),
      );
      setChaptersInit(true);
    }
    setStep((s) => (Math.min(6, (s as number) + 1) as Step));
  };

  const goBack = () => setStep((s) => (Math.max(1, (s as number) - 1) as Step));

  const finalize = async () => {
    if (!canAdvance[6]) return;

    const canvas: StoryCanvas = {
      ...EMPTY_CANVAS,
      setup: {
        title: title.trim(),
        genre: genre.trim(),
        bookType,
        tone,
        historicalEra: era,
        aiCreativity,
      },
      storySummary: filledBullets.map((b) => ({ id: b.id, text: b.text.trim() })),
      storyArc: arc,
      characterArcs,
      worldElements,
      chapters,
      aiAssistUsed: aiUsed,
      updatedAt: new Date().toISOString(),
    };

    // Sensible defaults for legacy book fields the rest of the app still reads.
    const audiences = BOOK_TYPE_AUDIENCES[bookType] ?? [];
    const audience = audiences[0] ?? AUDIENCE_OPTIONS[0].value;
    const controls = {
      ...getDefaultControls(bookType),
      creativity: Math.max(1, Math.min(10, Math.round((aiCreativity / 10) * 10))) || 5,
      temporalContext: {
        era,
        timelineStructure: "linear" as const,
      },
      automationLevel: "guided" as const, // manual-first
    };
    const toneProfile: ToneProfile = {
      primary: tone,
      intensity: 5,
      formality: 5,
      emotionalIntensity: 5,
      humorLevel: 4,
      authorityLevel: 5,
    };

    const theme = filledBullets[0]?.text.trim().slice(0, 200) || title.trim();

    const input: CreateBookInput = {
      title: title.trim(),
      bookType,
      theme,
      genre: genre.trim(),
      language: "English",
      audience,
      pov: "third-person-limited",
      toneProfile,
      controls,
      frontMatter: { selection: getDefaultFrontMatter(bookType) },
      canvas,
    };

    try {
      await onCreate(input);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create book");
    }
  };

  const setupCtx = useMemo(() => ({
    title, genre, tone, historicalEra: era,
    bullets: filledBullets.map((b) => b.text.trim()),
    chapterTitles: chapters.map((c) => c.title),
  }), [title, genre, tone, era, filledBullets, chapters]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="font-serif text-xl">Create a New Book</DialogTitle>
              <DialogDescription className="text-xs">
                Author-driven setup. AI only asks questions — never writes for you.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Stepper step={step} />
        </DialogHeader>

        <div className="px-6 py-5">
          {step === 1 && (
            <Step1
              title={title} setTitle={setTitle}
              bookType={bookType} setBookType={setBookType}
              genre={genre} setGenre={setGenre}
              tone={tone} setTone={setTone}
              era={era} setEra={setEra}
              aiCreativity={aiCreativity} setAiCreativity={setAiCreativity}
            />
          )}
          {step === 2 && (
            <Step2
              bullets={bullets}
              setBullets={setBullets}
              filledCount={filledBullets.length}
              aiUsed={aiUsed}
              onAiUsed={() => setAiUsed((n) => Math.min(3, n + 1))}
              getContext={() => setupCtx}
            />
          )}
          {step === 3 && (
            <Step3
              arc={arc}
              setArc={setArc}
              aiUsed={aiUsed}
              onAiUsed={() => setAiUsed((n) => Math.min(3, n + 1))}
              getContext={() => setupCtx}
            />
          )}
          {step === 4 && (
            <CharacterArcsPanel
              setup={{ title, genre, tone, historicalEra: era }}
              bullets={filledBullets.map((b) => b.text.trim())}
              arcs={characterArcs}
              onAdd={(seed) => setCharacterArcs((prev) => [...prev, {
                id: newId(),
                name: seed?.name ?? "",
                arcLabel: seed?.arcLabel ?? "",
                description: seed?.description ?? "",
              }])}
              onUpdate={(id, patch) => setCharacterArcs((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a))}
              onRemove={(id) => setCharacterArcs((prev) => prev.filter((a) => a.id !== id))}
              aiAssistUsed={aiUsed}
              onAiAssistUsed={() => setAiUsed((n) => Math.min(3, n + 1))}
            />
          )}
          {step === 5 && (
            <WorldbuildingPanel
              setup={{ title, genre, tone, historicalEra: era }}
              bullets={filledBullets.map((b) => b.text.trim())}
              elements={worldElements}
              onAdd={(seed) => setWorldElements((prev) => [...prev, {
                id: newId(),
                label: seed?.label ?? "",
                kind: seed?.kind ?? "",
                description: seed?.description ?? "",
              }])}
              onUpdate={(id, patch) => setWorldElements((prev) => prev.map((w) => w.id === id ? { ...w, ...patch } : w))}
              onRemove={(id) => setWorldElements((prev) => prev.filter((w) => w.id !== id))}
              aiAssistUsed={aiUsed}
              onAiAssistUsed={() => setAiUsed((n) => Math.min(3, n + 1))}
            />
          )}
          {step === 6 && (
            <Step4
              chapters={chapters}
              setChapters={setChapters}
              openChapterId={openChapterId}
              setOpenChapterId={setOpenChapterId}
              aiUsed={aiUsed}
              onAiUsed={() => setAiUsed((n) => Math.min(3, n + 1))}
              getContext={() => setupCtx}
            />
          )}
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-6 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {step === 2 && `${filledBullets.length} / 10 bullets filled`}
            {step === 3 && `${arc.length} arc cards`}
            {step === 4 && `${characterArcs.length} character${characterArcs.length === 1 ? "" : "s"} (optional)`}
            {step === 5 && `${worldElements.length} world element${worldElements.length === 1 ? "" : "s"} (optional)`}
            {step === 6 && `${chapters.length} chapters · ${chapters.filter((c) => c.title.trim()).length} titled`}
          </div>
          {step < 6 ? (
            <Button onClick={goNext} disabled={!canAdvance[step]} variant="hero">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finalize} disabled={!canAdvance[6] || isCreating} variant="hero">
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating…</>
              ) : (
                <><Check className="w-4 h-4 mr-1" /> Create Book</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 mt-3 text-[11px]">
      {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center font-medium",
              s === step ? "bg-amber-glow text-background"
                : s < step ? "bg-emerald-500/30 text-emerald-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {s < step ? <Check className="w-3 h-3" /> : s}
          </span>
          <span className={cn("hidden sm:inline", s === step ? "text-foreground" : "text-muted-foreground")}>
            {STEP_LABELS[s]}
          </span>
          {s < 6 && <span className="text-muted-foreground/40">›</span>}
        </li>
      ))}
    </ol>
  );
}

// ---------- STEP 1 ----------
function Step1(props: {
  title: string; setTitle: (v: string) => void;
  bookType: BookType; setBookType: (v: BookType) => void;
  genre: string; setGenre: (v: string) => void;
  tone: ToneLevel; setTone: (v: ToneLevel) => void;
  era: TemporalEra; setEra: (v: TemporalEra) => void;
  aiCreativity: number; setAiCreativity: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        A few essentials. You can edit any of these later from inside the book.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title *">
          <Input
            value={props.title}
            onChange={(e) => props.setTitle(e.target.value)}
            placeholder="Working title"
            autoFocus
          />
        </Field>
        <Field label="Book Type *">
          <Select value={props.bookType} onValueChange={(v) => props.setBookType(v as BookType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENABLED_BOOK_TYPES.map((bt) => {
                const info = BOOK_TYPE_INFO[bt];
                return (
                  <SelectItem key={bt} value={bt}>
                    {info.icon} {info.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Genre *">
          <Input
            value={props.genre}
            onChange={(e) => props.setGenre(e.target.value)}
            placeholder="Literary, thriller, romance…"
          />
        </Field>
        <Field label="Tone">
          <Select value={props.tone} onValueChange={(v) => props.setTone(v as ToneLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Historical Time Period">
          <Select value={props.era} onValueChange={(v) => props.setEra(v as TemporalEra)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPORAL_ERA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={`AI Creativity (${props.aiCreativity}/10)`}>
          <div className="pt-3">
            <Slider
              min={0}
              max={10}
              step={1}
              value={[props.aiCreativity]}
              onValueChange={(v) => props.setAiCreativity(v[0])}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Affects how playful the AI's guiding questions are. AI never writes story content.
            </p>
          </div>
        </Field>
      </div>
    </div>
  );
}

// ---------- STEP 2 ----------
function Step2(props: {
  bullets: { id: string; text: string }[];
  setBullets: (next: { id: string; text: string }[]) => void;
  filledCount: number;
  aiUsed: number;
  onAiUsed: () => void;
  getContext: () => Record<string, unknown>;
}) {
  const update = (id: string, text: string) =>
    props.setBullets(props.bullets.map((b) => (b.id === id ? { ...b, text } : b)));
  const add = () => props.setBullets([...props.bullets, { id: newId(), text: "" }]);
  const remove = (id: string) => {
    if (props.bullets.length <= 10) {
      toast.info("You need at least 10 bullets — clear the text instead.");
      return;
    }
    props.setBullets(props.bullets.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif font-semibold text-lg">Story Summary</h3>
          <p className="text-sm text-muted-foreground">
            Write at least 10 short bullets that sketch the whole story — opening to resolution. Your words, your direction.
          </p>
          <p className={cn("text-xs mt-1", props.filledCount >= 10 ? "text-emerald-400" : "text-muted-foreground")}>
            {props.filledCount} / 10 filled
          </p>
        </div>
        <AskAIGuide
          used={props.aiUsed}
          onUsed={props.onAiUsed}
          getContext={() => props.getContext() as never}
        />
      </div>

      <ol className="space-y-2">
        {props.bullets.map((b, i) => (
          <li key={b.id} className="flex items-start gap-2">
            <span className={cn(
              "shrink-0 w-7 h-7 rounded-full text-xs flex items-center justify-center font-medium mt-1",
              b.text.trim() ? "bg-emerald-500/20 text-emerald-300" : "bg-muted/60 text-muted-foreground",
            )}>
              {i + 1}
            </span>
            <Textarea
              value={b.text}
              onChange={(e) => update(b.id, e.target.value)}
              rows={1}
              placeholder={i < 10 ? `Bullet ${i + 1} — what happens here?` : "Optional extra bullet…"}
              className="min-h-[2.5rem] resize-y"
            />
            <Button
              variant="ghost" size="icon"
              className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
              onClick={() => remove(b.id)}
              aria-label="Remove bullet"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add another bullet
      </Button>
    </div>
  );
}

// ---------- STEP 3 ----------
function Step3(props: {
  arc: StoryArcCard[];
  setArc: (next: StoryArcCard[]) => void;
  aiUsed: number;
  onAiUsed: () => void;
  getContext: () => Record<string, unknown>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = props.arc.findIndex((c) => c.id === active.id);
    const newI = props.arc.findIndex((c) => c.id === over.id);
    if (oldI < 0 || newI < 0) return;
    props.setArc(arrayMove(props.arc, oldI, newI));
  };
  const update = (id: string, patch: Partial<StoryArcCard>) =>
    props.setArc(props.arc.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif font-semibold text-lg">Global Timeline Board</h3>
          <p className="text-sm text-muted-foreground">
            Each bullet is now a draggable, color-coded card. Reorder, recolor, edit. Approve when the arc reads right.
          </p>
        </div>
        <AskAIGuide
          used={props.aiUsed}
          onUsed={props.onAiUsed}
          getContext={() => props.getContext() as never}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={props.arc.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2">
            {props.arc.map((c, i) => (
              <SortableCard
                key={c.id}
                id={c.id}
                className={cn("min-w-[220px] max-w-[240px] shrink-0 border-2", ARC_COLOR_CLASS[c.color])}
              >
                <div className="p-3 pt-7">
                  <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">Beat {i + 1}</div>
                  <Textarea
                    value={c.text}
                    onChange={(e) => update(c.id, { text: e.target.value })}
                    rows={3}
                    className="bg-transparent border-0 focus-visible:ring-0 resize-none text-sm p-0 min-h-[4.5rem]"
                  />
                  <div className="mt-2">
                    <Select value={c.color} onValueChange={(v) => update(c.id, { color: v as StoryArcColor })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ARC_COLORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- STEP 4 ----------
function Step4(props: {
  chapters: CanvasChapter[];
  setChapters: (next: CanvasChapter[]) => void;
  openChapterId: string | null;
  setOpenChapterId: (id: string | null) => void;
  aiUsed: number;
  onAiUsed: () => void;
  getContext: () => Record<string, unknown>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = props.chapters.findIndex((c) => c.id === active.id);
    const newI = props.chapters.findIndex((c) => c.id === over.id);
    if (oldI < 0 || newI < 0) return;
    props.setChapters(arrayMove(props.chapters, oldI, newI));
  };

  const update = (id: string, patch: Partial<CanvasChapter>) =>
    props.setChapters(props.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = () =>
    props.setChapters([
      ...props.chapters,
      { id: newId(), title: `Chapter ${props.chapters.length + 1}`, plot: "", scenes: [] },
    ]);
  const remove = (id: string) => props.setChapters(props.chapters.filter((c) => c.id !== id));

  const openChapter = props.chapters.find((c) => c.id === props.openChapterId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif font-semibold text-lg">Chapter Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Type your chapter titles. Click a chapter to write its 100–120 word plot and add scene cards.
          </p>
        </div>
        <div className="flex gap-2">
          <AskAIGuide
            used={props.aiUsed}
            onUsed={props.onAiUsed}
            getContext={() => props.getContext() as never}
          />
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="w-4 h-4 mr-1" /> Add chapter
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={props.chapters.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2">
            {props.chapters.map((ch, i) => (
              <SortableCard key={ch.id} id={ch.id} className="min-w-[240px] max-w-[260px] shrink-0">
                <div className="p-3 pt-7">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ch {i + 1}</div>
                  <Input
                    value={ch.title}
                    onChange={(e) => update(ch.id, { title: e.target.value })}
                    placeholder="Chapter title"
                    className="h-8 text-sm font-medium"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {ch.plot ? `${wordCount(ch.plot)}w plot` : "no plot yet"}
                      {ch.scenes.length > 0 && ` · ${ch.scenes.length} scene${ch.scenes.length === 1 ? "" : "s"}`}
                    </span>
                    <Button
                      variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
                      onClick={() => props.setOpenChapterId(ch.id)}
                    >
                      Open
                    </Button>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 absolute top-1 right-1 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(ch.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {openChapter && (
        <SceneEditor
          chapter={openChapter}
          onClose={() => props.setOpenChapterId(null)}
          onUpdate={(patch) => update(openChapter.id, patch)}
          aiUsed={props.aiUsed}
          onAiUsed={props.onAiUsed}
          getContext={props.getContext}
        />
      )}
    </div>
  );
}

function SceneEditor({
  chapter, onClose, onUpdate, aiUsed, onAiUsed, getContext,
}: {
  chapter: CanvasChapter;
  onClose: () => void;
  onUpdate: (patch: Partial<CanvasChapter>) => void;
  aiUsed: number;
  onAiUsed: () => void;
  getContext: () => Record<string, unknown>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapter.scenes.findIndex((s) => s.id === active.id);
    const newI = chapter.scenes.findIndex((s) => s.id === over.id);
    if (oldI < 0 || newI < 0) return;
    onUpdate({ scenes: arrayMove(chapter.scenes, oldI, newI) });
  };

  const wc = wordCount(chapter.plot);
  const wcOk = wc >= 100 && wc <= 120;

  return (
    <div className="mt-2 rounded-2xl border border-border bg-card/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <Label className="font-serif text-sm">Editing: {chapter.title || "Untitled chapter"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <AskAIGuide
            used={aiUsed}
            onUsed={onAiUsed}
            label="Ask AI"
            getContext={() => ({
              ...(getContext() as Record<string, unknown>),
              focusChapterTitle: chapter.title,
              chapterPlot: chapter.plot,
              scenes: chapter.scenes.map((s) => s.title).filter(Boolean),
            })}
          />
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Pin className="w-3.5 h-3.5 text-amber-glow" />
          <span className="text-xs font-medium text-amber-glow">Pinned plot (manual)</span>
          <span className={cn("ml-auto text-[11px]", wcOk ? "text-emerald-400" : "text-muted-foreground")}>
            {wc} / 100–120 words
          </span>
        </div>
        <Textarea
          value={chapter.plot}
          onChange={(e) => onUpdate({ plot: e.target.value })}
          rows={5}
          placeholder="What this chapter must accomplish. 100–120 words."
          className="bg-transparent resize-y"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Scenes</span>
          <Button
            variant="outline" size="sm"
            onClick={() => onUpdate({ scenes: [...chapter.scenes, { id: newId(), title: "New scene" }] })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add scene
          </Button>
        </div>
        {chapter.scenes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No scenes yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={chapter.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {chapter.scenes.map((s, i) => (
                  <SortableCard key={s.id} id={s.id} className="bg-card/40">
                    <div className="p-3 pl-9 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scene {i + 1}</span>
                        <Button
                          variant="ghost" size="icon"
                          className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onUpdate({ scenes: chapter.scenes.filter((sc) => sc.id !== s.id) })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={s.title}
                        onChange={(e) => onUpdate({
                          scenes: chapter.scenes.map((sc) => sc.id === s.id ? { ...sc, title: e.target.value } : sc),
                        })}
                        placeholder="Scene title"
                        className="mt-1 h-8 text-sm"
                      />
                      <Textarea
                        value={s.note ?? ""}
                        onChange={(e) => onUpdate({
                          scenes: chapter.scenes.map((sc) => sc.id === s.id ? { ...sc, note: e.target.value } : sc),
                        })}
                        rows={2}
                        placeholder="Optional notes (beat, POV, location)…"
                        className="mt-2 text-xs resize-y"
                      />
                    </div>
                  </SortableCard>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
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

function wordCount(s: string): number {
  const t = (s ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}