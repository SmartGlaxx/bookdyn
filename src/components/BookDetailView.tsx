import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Play, Pause, Square, Download, Settings, BookText, Pencil, Check, X, RefreshCw, FileText, Zap, ChevronDown, Search, Pen, Replace, BookOpen } from "lucide-react";
import { AutomationLevel } from "@/types/book";
import { Input } from "@/components/ui/input";
import BookSettings from "@/components/BookSettings";
import { Button } from "@/components/ui/button";
import { Book, BOOK_TYPE_INFO } from "@/types/book";
import { useBookGeneration } from "@/hooks/useBookGeneration";
import { useBooks } from "@/hooks/useBooks";
import { useTurbo } from "@/hooks/useTurbo";
import { GenerationStatus } from "@/components/GenerationStatus";
import { Separator } from "@/components/ui/separator";

import { ChapterView } from "@/components/ChapterView";
import { RegenerateBookDialog } from "@/components/RegenerateBookDialog";
import { WritingModeSelector } from "@/components/WritingModeSelector";
import { ApprovalGate } from "@/components/ApprovalGate";
import { AppSidebar } from "@/components/AppSidebar";
import { TestimonialModal } from "@/components/TestimonialModal";
import { BookSearchPanel } from "@/components/BookSearchPanel";
import { exportBookToPdf } from "@/lib/exportPdf";
import { exportBookToEpub } from "@/lib/exportEpub";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
}

const BookDetailView = ({ book, onBack }: BookDetailViewProps) => {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [editSubtitle, setEditSubtitle] = useState(book.subtitle || "");
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNavigateChapter, setSearchNavigateChapter] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const firstChapterTrackedRef = useRef(false);

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

  useEffect(() => {
    if (!user || firstChapterTrackedRef.current) return;
    const hasCompletedChapter = book.outline?.chapters?.some(ch => ch.status === "completed");
    if (!hasCompletedChapter) return;
    firstChapterTrackedRef.current = true;

    (async () => {
      try {
        await supabase.rpc("mark_first_chapter_completed", { _user_id: user.id });
        const { data: profile } = await supabase
          .from("profiles")
          .select("testimonial_prompted")
          .eq("id", user.id)
          .single();
        if (profile && !profile.testimonial_prompted) {
          setTimeout(() => setShowTestimonial(true), 2000);
        }
      } catch (err) {
        console.error("First chapter tracking error:", err);
      }
    })();
  }, [user, book.outline?.chapters]);

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

  const automationLevel = book.controls?.automationLevel || "guided";

  const handleModeChange = (mode: AutomationLevel) => {
    updateBook(book.id, {
      controls: { ...book.controls, automationLevel: mode },
    });
  };

  const { phase } = generationState;
  const isGenerating = phase === "writing" || phase === "generating-outline" || phase === "generating-image" || phase === "summarizing" || phase === "generating-characters";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isComplete = phase === "completed" || book.status === "completed";
  const isAwaitingApproval = phase === "awaiting-approval";
  const hasOutline = !!book.outline && book.outline.chapters.length > 0;
  const canStart = !hasOutline && (book.status === "planning" || book.status === "ready_to_write" || isIdle);
  const canGenerateChapter = hasOutline && !isGenerating && !isComplete;
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

  const handleExportPdf = async () => {
    try {
      await exportBookToPdf(book);
      toast.success("PDF exported successfully");
    } catch (err) {
      toast.error("Failed to export PDF");
      console.error(err);
    }
  };

  const handleExportEpub = async () => {
    try {
      await exportBookToEpub(book);
      toast.success("EPUB exported successfully");
    } catch (err) {
      toast.error("Failed to export EPUB");
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
      {/* Unified header — mirrors Navigation layout */}
      <header className="sticky top-0 z-40 glass border-b border-border" style={{ height: 64 }}>
        <div className="container max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* Left: back + title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground h-10 w-10 hover:opacity-90 hover:text-primary-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>

              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
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
                <div
                  className="flex items-center gap-2 group cursor-pointer min-w-0 flex-1"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <h1 className="font-serif font-bold text-xl truncate">{book.title}</h1>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              )}
            </div>

            {/* Right: action buttons + sidebar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop action buttons */}
              {!hasOutline && canStart && (
                <Button variant="hero" size="sm" onClick={generateOutline} className="hidden sm:inline-flex">
                  <FileText className="w-4 h-4" />
                  Generate Outline
                </Button>
              )}

              {canGenerateChapter && nextIncompleteChapter >= 0 && !isAwaitingApproval && (
                <>
                  {/* Desktop: full button */}
                  <Button variant="hero" size="sm" onClick={() => generateChapter(nextIncompleteChapter)} className="hidden sm:inline-flex">
                    <Play className="w-4 h-4" />
                    Write Chapter {nextIncompleteChapter + 1}
                  </Button>
                  {/* Mobile: dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="hero" size="icon" className="sm:hidden">
                        <Play className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => generateChapter(nextIncompleteChapter)}>
                        <Play className="w-4 h-4 mr-2" />
                        Write Chapter {nextIncompleteChapter + 1}
                      </DropdownMenuItem>
                      {hasOutline && !isComplete && !isAwaitingApproval &&
                        (automationLevel === "semi-auto" || automationLevel === "auto-draft") && (
                        <DropdownMenuItem onClick={handleStartFullGeneration}>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate All
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {hasOutline && !isGenerating && !isComplete && !isAwaitingApproval &&
                (automationLevel === "semi-auto" || automationLevel === "auto-draft") && (
                <Button variant="outline" size="sm" onClick={handleStartFullGeneration} className="hidden sm:inline-flex">
                  <Zap className="w-4 h-4" />
                  {automationLevel === "auto-draft" ? "Auto Draft" : "Generate All"}
                </Button>
              )}

              {isGenerating && (
                <>
                  <Button variant="outline" size="sm" onClick={pauseGeneration}>
                    <Pause className="w-4 h-4" />
                    <span className="hidden sm:inline">Pause</span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportEpub}>
                      <BookText className="w-4 h-4 mr-2" />
                      Export as EPUB
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User sidebar */}
              <AppSidebar>
                <div className="px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Writing Mode</span>
                  <WritingModeSelector
                    value={automationLevel}
                    onChange={handleModeChange}
                    disabled={isGenerating}
                  />
                </div>
                <Separator className="my-1" />
                {hasOutline && (
                  <div className="px-2 py-1">
                    <button
                      onClick={() => setShowSearch(s => !s)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Search className="w-4 h-4" />
                      Find & Replace
                    </button>
                  </div>
                )}
                {isComplete && (
                  <div className="px-2 py-1 space-y-0.5">
                    <button
                      onClick={handleExportPdf}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <FileText className="w-4 h-4" />
                      Export as PDF
                    </button>
                    <button
                      onClick={handleExportEpub}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <BookText className="w-4 h-4" />
                      Export as EPUB
                    </button>
                  </div>
                )}
                {(isComplete || book.outline) && !isGenerating && !isAwaitingApproval && (
                  <div className="px-2 py-1">
                    <button
                      onClick={() => setShowRegenDialog(true)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left text-destructive"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Book
                    </button>
                  </div>
                )}
                <div className="px-2 py-1">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <Settings className="w-4 h-4" />
                    Book Settings
                  </button>
                </div>
              </AppSidebar>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl mx-auto px-0 md:px-4 pt-3 pb-4 md:pb-6">
        <AnimatePresence>
          {showSearch && hasOutline && (
            <div className="mb-3 px-4 md:px-0">
              <BookSearchPanel
                book={book}
                onUpdateBook={updateBook}
                onClose={() => { setShowSearch(false); setSearchQuery(""); }}
                onNavigateToChapter={(idx) => setSearchNavigateChapter(idx)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            </div>
          )}
        </AnimatePresence>

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

        {isAwaitingApproval && generationState.approvalRequest && (
          <motion.div className="mb-4 px-4 md:px-0" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <ApprovalGate
              type={generationState.approvalRequest.type}
              title={generationState.approvalRequest.title}
              onApprove={approveAndContinue}
              onRegenerate={() => {
                const req = generationState.approvalRequest;
                if (req?.chapterIndex !== undefined) {
                  generateChapter(req.chapterIndex);
                }
              }}
            />
          </motion.div>
        )}

        <div className="flex-1 min-h-0">
          <ChapterView
            book={book}
            onGenerateChapter={canGenerateChapter && !isAwaitingApproval ? generateChapter : undefined}
            onUpdateBook={updateBook}
            automationLevel={automationLevel}
            searchQuery={showSearch ? searchQuery : ""}
            navigateToChapter={searchNavigateChapter}
            onNavigateHandled={() => setSearchNavigateChapter(null)}
          />
        </div>
      </main>

      <RegenerateBookDialog
        open={showRegenDialog}
        onOpenChange={setShowRegenDialog}
        bookTitle={book.title}
        onConfirm={handleRegenerate}
      />

      <TestimonialModal
        open={showTestimonial}
        onOpenChange={setShowTestimonial}
      />
    </motion.div>
  );
};

export default BookDetailView;
