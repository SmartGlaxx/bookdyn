import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Play, Pause, Square, Download, Settings, CheckCircle2, Circle, Loader2, BookText, Users, Pencil, Check, X, RefreshCw, FileText, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import BookSettings from "@/components/BookSettings";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, BOOK_TYPE_INFO, POV_OPTIONS, TONE_OPTIONS } from "@/types/book";
import { useBookGeneration } from "@/hooks/useBookGeneration";
import { useBooks } from "@/hooks/useBooks";
import { useTurbo } from "@/hooks/useTurbo";
import { GenerationStatus } from "@/components/GenerationStatus";
import { LiveContentView } from "@/components/LiveContentView";
import { CharacterGallery } from "@/components/CharacterGallery";
import { ChapterView } from "@/components/ChapterView";
import { RegenerateBookDialog } from "@/components/RegenerateBookDialog";
import { ApprovalGate } from "@/components/ApprovalGate";
import { TurboTracker } from "@/components/TurboTracker";
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

type ViewMode = "chapter" | "full" | "characters" | "progress";

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
  const turbo = useTurbo();
  const {
    state: generationState,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
    generateOutline,
    generateChapter,
    approveAndContinue,
  } = useBookGeneration(book, { 
    onUpdateBook: updateBook,
    onActivityRecorded: turbo.recordActivity,
  });

  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  const hasCharacters = book.outline?.characters && book.outline.characters.length > 0;
  const automationLevel = book.controls?.automationLevel || "guided";

  const { phase } = generationState;
  const isGenerating = phase === "writing" || phase === "generating-outline" || phase === "generating-image" || phase === "summarizing" || phase === "generating-characters";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isComplete = phase === "completed" || book.status === "completed";
  const isAwaitingApproval = phase === "awaiting-approval";
  const hasOutline = !!book.outline && book.outline.chapters.length > 0;
  const canStart = !hasOutline && (book.status === "planning" || book.status === "ready_to_write" || isIdle);
  const canGenerateChapter = hasOutline && !isGenerating && !isComplete;
  const isChildrensBook = book.bookType === "children" || book.bookType === "comic";

  // Find next incomplete chapter
  const nextIncompleteChapter = book.outline?.chapters.findIndex(ch => ch.status !== "completed") ?? -1;

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

  const handleStartFullGeneration = () => {
    if (automationLevel === "auto-draft" && !turbo.canUseAutoDraft) {
      toast.error("Auto Draft requires Turbo unlock. Maintain a 30-day streak and write 100K+ words.");
      return;
    }
    startGeneration();
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
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingSubtitle(true)}>
                  <p className="text-sm text-muted-foreground">{book.subtitle || "Add subtitle..."}</p>
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
              {/* Co-pilot actions */}
              {!hasOutline && canStart && (
                <Button variant="hero" size="sm" onClick={generateOutline}>
                  <FileText className="w-4 h-4" />
                  Generate Outline
                </Button>
              )}

              {canGenerateChapter && nextIncompleteChapter >= 0 && !isAwaitingApproval && (
                <Button variant="hero" size="sm" onClick={() => generateChapter(nextIncompleteChapter)}>
                  <Play className="w-4 h-4" />
                  Write Chapter {nextIncompleteChapter + 1}
                </Button>
              )}

              {/* Full generation only for semi-auto and auto-draft */}
              {hasOutline && !isGenerating && !isComplete && !isAwaitingApproval && 
               (automationLevel === "semi-auto" || automationLevel === "auto-draft") && (
                <Button variant="outline" size="sm" onClick={handleStartFullGeneration}>
                  <Zap className="w-4 h-4" />
                  {automationLevel === "auto-draft" ? "Auto Draft" : "Generate All"}
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
              {(isComplete || book.outline) && !isGenerating && !isAwaitingApproval && (
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
        {/* Generation Status */}
        {(isGenerating || isPaused || isAwaitingApproval) && generationState.phase !== "completed" && (
          <motion.div className="mb-2 px-4 md:px-0" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <GenerationStatus
              phase={generationState.phase}
              currentChapter={generationState.currentChapter}
              currentSubsection={generationState.currentSubsection}
              totalChapters={generationState.totalChapters}
              totalSubsections={generationState.totalSubsections}
            />
          </motion.div>
        )}

        {/* Approval Gate */}
        {isAwaitingApproval && generationState.approvalRequest && (
          <motion.div className="mb-4 px-4 md:px-0" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <ApprovalGate
              type={generationState.approvalRequest.type}
              title={generationState.approvalRequest.title}
              onApprove={approveAndContinue}
              onEdit={() => toast.info("Edit the content in the chapter view, then approve to continue.")}
              onRegenerate={() => {
                const req = generationState.approvalRequest;
                if (req?.chapterIndex !== undefined) {
                  generateChapter(req.chapterIndex);
                }
              }}
            />
          </motion.div>
        )}

        <div className="h-[calc(100vh-theme(spacing.20))]">
          <div className="flex flex-col h-full min-h-0">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex flex-col h-full min-h-0">
              <TabsList className="w-fit mb-4 shrink-0 sticky top-0 z-10 mx-4 md:mx-0">
                <TabsTrigger value="chapter" className="gap-2">
                  <BookText className="w-4 h-4" />
                  Chapters
                </TabsTrigger>
                {hasCharacters && (
                  <TabsTrigger value="characters" className="gap-2">
                    <Users className="w-4 h-4" />
                    Characters
                  </TabsTrigger>
                )}
                <TabsTrigger value="progress" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Progress
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === "characters" && hasCharacters ? (
                  <ScrollArea className="h-full rounded-xl border bg-card p-6">
                    <CharacterGallery characters={book.outline!.characters!} visualStyleGuide={book.outline!.visualStyleGuide} />
                  </ScrollArea>
                ) : viewMode === "progress" ? (
                  <ScrollArea className="h-full rounded-xl border bg-card p-6">
                    <TurboTracker
                      streakDays={turbo.streakDays}
                      streakProgress={turbo.streakProgress}
                      totalWordsWritten={turbo.totalWordsWritten}
                      wordsProgress={turbo.wordsProgress}
                      turboUnlocked={turbo.turboUnlocked}
                      turboWordsRemaining={turbo.turboWordsRemaining}
                      turboWordsCapacity={turbo.turboWordsCapacity}
                      turboWordsProgress={turbo.turboWordsProgress}
                      streakGoal={turbo.STREAK_GOAL}
                      wordsGoal={turbo.WORDS_GOAL}
                      plan={turbo.plan}
                    />
                  </ScrollArea>
                ) : (
                  <ChapterView 
                    book={book} 
                    onGenerateChapter={canGenerateChapter && !isAwaitingApproval ? generateChapter : undefined}
                  />
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
