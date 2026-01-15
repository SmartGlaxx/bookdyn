import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Download,
  Settings,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  Layers,
  Tv,
  BookText,
  Scroll,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Book, 
  BOOK_TYPE_INFO, 
  POV_OPTIONS, 
  TONE_OPTIONS,
} from "@/types/book";
import { useBookGeneration } from "@/hooks/useBookGeneration";
import { useBooks } from "@/hooks/useBooks";
import { GenerationStatus } from "@/components/GenerationStatus";
import { LiveContentView } from "@/components/LiveContentView";
import { CharacterGallery } from "@/components/CharacterGallery";
import { ChapterView } from "@/components/ChapterView";

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
}

const statusConfig: Record<
  "pending" | "writing" | "completed",
  { icon: typeof Circle; color: string; animate?: boolean }
> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  writing: { icon: Loader2, color: "text-primary", animate: true },
  completed: { icon: CheckCircle2, color: "text-success" },
};

type ViewMode = "live" | "chapter" | "full" | "characters";

const BookDetailView = ({ book, onBack }: BookDetailViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const { updateBook } = useBooks();
  
  const {
    state: generationState,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
  } = useBookGeneration(book, { onUpdateBook: updateBook });

  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  const povOption = POV_OPTIONS.find((p) => p.value === book.pov);
  const toneOption = TONE_OPTIONS.find((t) => t.value === book.toneProfile.primary);

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
  const { phase } = generationState;
  const isGenerating = phase === "writing" || phase === "generating-outline" || phase === "generating-image" || phase === "summarizing" || phase === "generating-characters";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isComplete = phase === "completed" || book.status === "completed";
  const canStart = book.status === "planning" || book.status === "ready_to_write" || (isIdle && !isComplete);
  
  const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
  const hasCharacters = book.outline?.characters && book.outline.characters.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
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
              {canStart && (
                <Button variant="hero" onClick={startGeneration}>
                  <Play className="w-4 h-4" />
                  {book.outline ? "Continue" : "Start"} Generation
                </Button>
              )}
              {isGenerating && (
                <>
                  <Button variant="outline" onClick={pauseGeneration}>
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                  <Button variant="ghost" size="icon" onClick={stopGeneration}>
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              )}
              {isPaused && (
                <Button variant="hero" onClick={resumeGeneration}>
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              {isComplete && (
                <Button variant="hero">
                  <Download className="w-4 h-4" />
                  Export Book
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6">
        {/* Generation Status */}
        {(isGenerating || isPaused || generationState.phase !== "idle") && (
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GenerationStatus 
              phase={generationState.phase}
              currentChapter={generationState.currentChapter}
              currentSubsection={generationState.currentSubsection}
              totalChapters={generationState.totalChapters}
              totalSubsections={generationState.totalSubsections}
            />
          </motion.div>
        )}

        <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Main content area - Live View */}
          <div className="lg:col-span-3 flex flex-col h-full">
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex flex-col h-full">
              <TabsList className="w-fit mb-4">
                <TabsTrigger value="live" className="gap-2">
                  <Tv className="w-4 h-4" />
                  Live View
                </TabsTrigger>
                <TabsTrigger value="chapter" className="gap-2">
                  <BookText className="w-4 h-4" />
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="full" className="gap-2">
                  <Scroll className="w-4 h-4" />
                  Full View
                </TabsTrigger>
                {hasCharacters && (
                  <TabsTrigger value="characters" className="gap-2">
                    <Users className="w-4 h-4" />
                    Characters
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 min-h-0">
                {viewMode === "characters" && hasCharacters ? (
                  <ScrollArea className="h-full rounded-xl border bg-card p-6">
                    <CharacterGallery 
                      characters={book.outline!.characters!}
                      visualStyleGuide={book.outline!.visualStyleGuide}
                    />
                  </ScrollArea>
                ) : viewMode === "chapter" ? (
                  <ChapterView book={book} />
                ) : (
                  <LiveContentView 
                    book={book}
                    generationState={generationState}
                    viewMode={viewMode === "characters" ? "live" : viewMode}
                  />
                )}
              </div>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 overflow-y-auto">
            {/* Progress Card */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-sm">Progress</h3>
                    <p className="text-xs text-muted-foreground">
                      {book.outline?.chapters.length || 0} chapters · {book.wordCount.toLocaleString()} words
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-serif font-bold text-primary">{progress}%</div>
                  </div>
                </div>
                <Progress value={progress} variant="accent" className="h-2" />
              </CardContent>
            </Card>

            {/* Chapters outline */}
            {book.outline && book.outline.chapters.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Outline
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {book.outline.chapters.map((chapter, idx) => {
                        const StatusIcon = statusConfig[chapter.status].icon;
                        return (
                          <div 
                            key={chapter.id}
                            className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                              idx === generationState.currentChapter && isGenerating
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted"
                            }`}
                          >
                            <StatusIcon
                              className={`w-4 h-4 ${statusConfig[chapter.status].color} ${
                                statusConfig[chapter.status].animate ? "animate-spin" : ""
                              }`}
                            />
                            <span className="truncate flex-1">
                              {chapter.chapterNumber}. {chapter.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Book Details */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{typeInfo.icon} {typeInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audience</span>
                  <span className="font-medium truncate ml-2">{book.audience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">POV</span>
                  <span className="font-medium">{povOption?.label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tone</span>
                  <Badge variant="amber" className="text-xs">
                    {toneOption?.emoji} {toneOption?.label}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Images</span>
                  <Badge variant={book.controls.imageGeneration ? "success" : "secondary"} className="text-xs">
                    {book.controls.imageGeneration ? "On" : "Off"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Controls Summary */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <ControlBar label="Velocity" value={book.controls.velocity} />
                <ControlBar label="Creativity" value={book.controls.creativity} />
                <ControlBar label="Complexity" value={book.controls.entityComplexity} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const ControlBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}/10</span>
    </div>
    <Progress value={value * 10} className="h-1" />
  </div>
);

export default BookDetailView;
