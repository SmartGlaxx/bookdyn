import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Play, Pause, Square, Download, Settings, CheckCircle2, Circle, Loader2, BookText, Users, Pencil, Check, X, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import BookSettings from "@/components/BookSettings";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, BOOK_TYPE_INFO, POV_OPTIONS, TONE_OPTIONS } from "@/types/book";
import { useBookGeneration } from "@/hooks/useBookGeneration";
import { useBooks } from "@/hooks/useBooks";
import { GenerationStatus } from "@/components/GenerationStatus";
import { LiveContentView } from "@/components/LiveContentView";
import { CharacterGallery } from "@/components/CharacterGallery";
import { ChapterView } from "@/components/ChapterView";
import { RegenerateBookDialog } from "@/components/RegenerateBookDialog";
import { exportBookToPdf } from "@/lib/exportPdf";
import { toast } from "sonner";

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
}

const statusConfig: Record<"pending" | "writing" | "completed", {
  icon: typeof Circle;
  color: string;
  animate?: boolean;
}> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  writing: { icon: Loader2, color: "text-primary", animate: true },
  completed: { icon: CheckCircle2, color: "text-success" },
};

type ViewMode = "chapter" | "full" | "characters";

const BookDetailView = ({ book, onBack }: BookDetailViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("chapter");
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [editSubtitle, setEditSubtitle] = useState(book.subtitle || "");
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingSubtitle && subtitleInputRef.current) {
      subtitleInputRef.current.focus();
      subtitleInputRef.current.select();
    }
  }, [isEditingSubtitle]);

  const { updateBook } = useBooks();
  const {
    state: generationState,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
  } = useBookGeneration(book, { onUpdateBook: updateBook });

  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  const hasCharacters = book.outline?.characters && book.outline.characters.length > 0;

  const { phase } = generationState;
  const isGenerating = phase === "writing" || phase === "generating-outline" || phase === "generating-image" || phase === "summarizing" || phase === "generating-characters";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isComplete = phase === "completed" || book.status === "completed";
  const canStart = book.status === "planning" || book.status === "ready_to_write" || (isIdle && !isComplete);
  const isChildrensBook = book.bookType === "children" || book.bookType === "comic";

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateBook(book.id, { title: editTitle.trim() });
      setIsEditingTitle(false);
    }
  };

  const handleCancelTitle = () => {
    setEditTitle(book.title);
    setIsEditingTitle(false);
  };

  const handleSaveSubtitle = () => {
    updateBook(book.id, { subtitle: editSubtitle.trim() || undefined });
    setIsEditingSubtitle(false);
  };

  const handleCancelSubtitle = () => {
    setEditSubtitle(book.subtitle || "");
    setIsEditingSubtitle(false);
  };

  const handleRegenerate = () => {
    updateBook(book.id, {
      outline: null as any,
      status: "planning",
      currentChapterIndex: 0,
      currentSubsectionIndex: 0,
      wordCount: 0,
    });
    toast.success("Book reset for regeneration", {
      description: "All content has been cleared. Settings are preserved.",
    });
  };

  const handleExportPdf = () => {
    try {
      exportBookToPdf(book);
      toast.success("PDF exported successfully");
    } catch (err) {
      toast.error("Failed to export PDF");
      console.error(err);
    }
  };

  if (showSettings) {
    return <BookSettings book={book} onBack={() => setShowSettings(false)} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container max-w-7xl mx-auto px-4 py-3">
          {/* Title row */}
          <div className="mb-1 flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelTitle();
                  }}
                  className="text-xl font-serif font-semibold h-auto py-1"
                />
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleSaveTitle}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleCancelTitle}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-xl font-serif font-semibold">{book.title}</h1>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Subtitle row */}
          {!isEditingTitle && (
            <div className="mb-2">
              {isEditingSubtitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={subtitleInputRef}
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSubtitle();
                      if (e.key === "Escape") handleCancelSubtitle();
                    }}
                    placeholder="Add a subtitle..."
                    className="text-sm h-auto py-1"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={handleSaveSubtitle}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={handleCancelSubtitle}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setIsEditingSubtitle(true)}
                >
                  <p className="text-sm text-muted-foreground">
                    {book.subtitle || "Add subtitle..."}
                  </p>
                  <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex items-center gap-2">
              {canStart && (
                <Button variant="hero" size="sm" onClick={startGeneration}>
                  <Play className="w-4 h-4" />
                  {book.outline ? "Continue" : "Start"} Generation
                </Button>
              )}
              {isGenerating && (
                <>
                  <Button variant="outline" size="sm" onClick={pauseGeneration}>
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                  <Button variant="ghost" size="icon" onClick={stopGeneration}>
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              )}
              {isPaused && (
                <Button variant="hero" size="sm" onClick={resumeGeneration}>
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              {isComplete && (
                <>
                  <Button variant="ghost" className="hidden sm:inline-flex gap-2" onClick={handleExportPdf}>
                    <Download className="w-4 h-4" />
                    Export PDF
                  </Button>
                  <Button variant="ghost" size="icon" className="sm:hidden" onClick={handleExportPdf}>
                    <Download className="w-4 h-4" />
                  </Button>
                </>
              )}
              {(isComplete || book.outline) && !isGenerating && (
                <Button variant="ghost" size="icon" onClick={() => setShowRegenDialog(true)} title="Regenerate book">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl mx-auto px-0 md:px-4 pb-4 md:pb-6">
        {(isGenerating || isPaused || generationState.phase !== "idle") && (
          <motion.div className="mb-6 px-4 md:px-0" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <GenerationStatus
              phase={generationState.phase}
              currentChapter={generationState.currentChapter}
              currentSubsection={generationState.currentSubsection}
              totalChapters={generationState.totalChapters}
              totalSubsections={generationState.totalSubsections}
            />
          </motion.div>
        )}

        <div className="h-[calc(100vh-theme(spacing.20))]">
          <div className="flex flex-col h-full min-h-0">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex flex-col h-full min-h-0">
              <TabsList className={cn(
                "w-fit mb-4 shrink-0 sticky top-0 z-10 mx-4 md:mx-0",
                !hasCharacters ? "bg-background text-background border-transparent shadow-none" : "bg-background"
              )}>
                <TabsTrigger value="chapter" className={cn("gap-2", !hasCharacters && "pointer-events-none text-background data-[state=active]:text-background data-[state=active]:shadow-none bg-transparent")}>
                  <BookText className="w-4 h-4" />
                  Chapters
                </TabsTrigger>
                {hasCharacters && (
                  <TabsTrigger value="characters" className="gap-2">
                    <Users className="w-4 h-4" />
                    Characters
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === "characters" && hasCharacters ? (
                  <ScrollArea className="h-full rounded-xl border bg-card p-6">
                    <CharacterGallery characters={book.outline!.characters!} visualStyleGuide={book.outline!.visualStyleGuide} />
                  </ScrollArea>
                ) : (
                  <ChapterView book={book} />
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </main>

      <RegenerateBookDialog
        open={showRegenDialog}
        onOpenChange={setShowRegenDialog}
        bookTitle={book.title}
        onConfirm={handleRegenerate}
      />
    </motion.div>
  );
};

export default BookDetailView;
