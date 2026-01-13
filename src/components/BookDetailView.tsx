import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Settings,
  BookOpen,
  ChevronRight,
  FileText,
  CheckCircle2,
  Circle,
  Loader2,
  Globe,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Book, 
  BOOK_TYPE_INFO, 
  POV_OPTIONS, 
  TONE_OPTIONS,
  AUTOMATION_OPTIONS,
  DEPTH_OPTIONS,
  TEMPORAL_ERA_OPTIONS,
  SPATIAL_SCOPE_OPTIONS,
} from "@/types/book";

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
  onStartGeneration: () => void;
}

const statusConfig: Record<
  "pending" | "writing" | "completed",
  { icon: typeof Circle; color: string; animate?: boolean }
> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  writing: { icon: Loader2, color: "text-primary", animate: true },
  completed: { icon: CheckCircle2, color: "text-success" },
};

const BookDetailView = ({ book, onBack, onStartGeneration }: BookDetailViewProps) => {
  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  const povOption = POV_OPTIONS.find((p) => p.value === book.pov);
  const toneOption = TONE_OPTIONS.find((t) => t.value === book.toneProfile.primary);
  const secondaryToneOption = book.toneProfile.secondary 
    ? TONE_OPTIONS.find((t) => t.value === book.toneProfile.secondary)
    : null;
  const automationOption = AUTOMATION_OPTIONS.find((a) => a.value === book.controls.automationLevel);
  const depthOption = DEPTH_OPTIONS.find((d) => d.value === book.controls.depthLevel);
  const eraOption = TEMPORAL_ERA_OPTIONS.find((e) => e.value === book.controls.temporalContext?.era);
  const spatialOption = SPATIAL_SCOPE_OPTIONS.find((s) => s.value === book.controls.spatialScope);

  const calculateProgress = () => {
    if (!book.outline) return 0;
    const total = book.outline.chapters.reduce((acc, ch) => acc + ch.subsections.length, 0);
    const completed = book.outline.chapters.reduce(
      (acc, ch) => acc + ch.subsections.filter((s) => s.status === "completed").length,
      0
    );
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const progress = calculateProgress();
  const isGenerating = book.status === "writing";
  const canGenerate = book.status === "ready_to_write" || book.status === "paused";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <h1 className="text-xl font-serif font-semibold">{book.title}</h1>
                </div>
                {book.subtitle && (
                  <p className="text-sm text-muted-foreground">{book.subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canGenerate && (
                <Button variant="hero" onClick={onStartGeneration}>
                  <Play className="w-4 h-4" />
                  Start Generation
                </Button>
              )}
              {isGenerating && (
                <Button variant="outline">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content - Chapters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress overview */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Overall Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {book.outline?.chapters.length || 0} chapters · {book.wordCount.toLocaleString()} words
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-serif font-bold text-primary">{progress}%</div>
                    <p className="text-sm text-muted-foreground">complete</p>
                  </div>
                </div>
                <Progress value={progress} variant="accent" className="h-2" />
              </CardContent>
            </Card>

            {/* Chapters list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Chapters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {book.outline?.chapters && book.outline.chapters.length > 0 ? (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {book.outline.chapters.map((chapter, idx) => {
                        const StatusIcon = statusConfig[chapter.status].icon;
                        const chapterProgress =
                          chapter.subsections.length > 0
                            ? Math.round(
                                (chapter.subsections.filter((s) => s.status === "completed").length /
                                  chapter.subsections.length) *
                                  100
                              )
                            : 0;

                        return (
                          <motion.div
                            key={chapter.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group"
                          >
                            <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <StatusIcon
                                    className={`w-5 h-5 ${statusConfig[chapter.status].color} ${
                                      statusConfig[chapter.status].animate ? "animate-spin" : ""
                                    }`}
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
                                        Chapter {chapter.chapterNumber}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {chapter.subsections.length} sections
                                      </Badge>
                                    </div>
                                    <h4 className="font-medium mt-1">
                                      {chapter.title || `Untitled Chapter ${chapter.chapterNumber}`}
                                    </h4>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">{chapterProgress}%</div>
                                  <Progress value={chapterProgress} className="w-20 h-1 mt-1" />
                                </div>
                              </div>

                              {/* Subsections preview */}
                              {chapter.subsections.length > 0 && (
                                <div className="mt-3 pt-3 border-t space-y-1">
                                  {chapter.subsections.slice(0, 3).map((sub) => {
                                    const SubIcon = statusConfig[sub.status].icon;
                                    return (
                                      <div
                                        key={sub.id}
                                        className="flex items-center gap-2 text-sm text-muted-foreground"
                                      >
                                        <SubIcon className={`w-3 h-3 ${statusConfig[sub.status].color}`} />
                                        <span className="line-clamp-1">{sub.title}</span>
                                      </div>
                                    );
                                  })}
                                  {chapter.subsections.length > 3 && (
                                    <p className="text-xs text-muted-foreground pl-5">
                                      +{chapter.subsections.length - 3} more sections
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No chapters yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start the generation process to create your book outline and chapters.
                    </p>
                    {book.status === "planning" && (
                      <Button onClick={onStartGeneration}>
                        <Play className="w-4 h-4 mr-2" />
                        Begin Planning
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Book details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Type</label>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {typeInfo.icon} {typeInfo.label}
                  </p>
                </div>
                <Separator />
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Theme</label>
                  <p className="text-sm mt-1">{book.theme}</p>
                </div>
                {book.genre && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">Genre</label>
                      <p className="font-medium mt-1">{book.genre}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Audience</label>
                  <p className="font-medium mt-1">{book.audience}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Point of View</label>
                  <p className="font-medium mt-1">{povOption?.label}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Tone</label>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="amber">
                      {toneOption?.emoji} {toneOption?.label}
                    </Badge>
                    {secondaryToneOption && (
                      <Badge variant="outline">
                        {secondaryToneOption.emoji} {secondaryToneOption.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Depth:</span>
                    <span className="ml-1 font-medium">{depthOption?.label}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="ml-1 font-medium">{automationOption?.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Dynamism Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ControlDisplay label="Velocity" value={book.controls.velocity} />
                <ControlDisplay label="Scope" value={book.controls.scope} />
                <ControlDisplay label="Creativity" value={book.controls.creativity} />
                <ControlDisplay label="Entity Complexity" value={book.controls.entityComplexity} />
                <ControlDisplay label="Perspective Multiplexing" value={book.controls.perspectiveMultiplexing} />
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span>Divergence</span>
                  <Badge variant={book.controls.divergenceAllowed ? "amber" : "secondary"}>
                    {book.controls.divergenceAllowed ? "Allowed" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Context & Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Era</span>
                  <span className="font-medium">{eraOption?.label || "Contemporary"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="font-medium capitalize">
                    {book.controls.temporalContext?.timelineStructure || "Linear"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spatial Scope</span>
                  <span className="font-medium">{spatialOption?.label || "Regional"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>Image Generation</span>
                  <Badge variant={book.controls.imageGeneration ? "success" : "secondary"}>
                    {book.controls.imageGeneration ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-Resume</span>
                  <Badge variant={book.controls.autoResume ? "success" : "secondary"}>
                    {book.controls.autoResume ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {book.status === "completed" && (
              <Button variant="hero" className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export Book
              </Button>
            )}
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const ControlDisplay = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}/10</span>
    </div>
    <Progress value={value * 10} className="h-1.5" />
  </div>
);

export default BookDetailView;
