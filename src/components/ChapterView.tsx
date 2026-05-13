import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Book, Chapter as ChapterType, AutomationLevel, VISUAL_BOOK_TYPES, BOOK_TEMPLATES, ImageLayoutSlot, CharacterReference, CharacterLedgerEntry } from "@/types/book";
import { TemplateImage } from "@/components/TemplateImage";
import { useIsMobile } from "@/hooks/use-mobile";
import { ParagraphEditor } from "@/components/ParagraphEditor";
import { isRevealed, markRevealed, subscribeRevealed } from "@/lib/revealRegistry";
import { SequentialReveal } from "@/components/SequentialReveal";
import { GuidedWritingToolbar } from "@/components/GuidedWritingToolbar";
import { CharacterGallery } from "@/components/CharacterGallery";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, Circle, Loader2, FileText, ChevronDown, Play, Check, X, Users, User, Pencil, PanelLeftClose, PanelLeftOpen, Type, Minus, Plus, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type CanvasLayout = "novel" | "screenplay" | "digital";
type CanvasSpacing = "compact" | "standard" | "double";

interface ChapterViewProps {
  book: Book;
  onGenerateChapter?: (chapterIndex: number) => void;
  onUpdateBook?: (id: string, updates: Partial<Book>) => void;
  automationLevel?: AutomationLevel;
  searchQuery?: string;
  navigateToChapter?: number | null;
  onNavigateHandled?: () => void;
}

const statusConfig: Record<"pending" | "writing" | "completed", {
  icon: typeof Circle;
  color: string;
  label: string;
  animate?: boolean;
}> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "Pending" },
  writing: { icon: Loader2, color: "text-primary", label: "Writing", animate: true },
  completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
};

export function ChapterView({ book, onGenerateChapter, onUpdateBook, automationLevel = "guided", searchQuery, navigateToChapter, onNavigateHandled }: ChapterViewProps) {
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [manualAddState, setManualAddState] = useState<{ chapterIdx: number; subIdx: number; type: "text" | "dialogue" } | null>(null);
  const [manualText, setManualText] = useState("");
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [sidebarTab, setSidebarTab] = useState<"chapters" | "characters">("chapters");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chapters" | "characters" | "main">("main");
  const [mobileSelectedCharacterId, setMobileSelectedCharacterId] = useState<string | null>(null);
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");
  const editChapterRef = useRef<HTMLInputElement>(null);
  // Inline subsection title editing
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null);
  const [editSubTitle, setEditSubTitle] = useState("");
  // Manuscript typography suite (canvas-only)
  const [canvasLayout, setCanvasLayout] = useState<CanvasLayout>("novel");
  const [canvasFontSize, setCanvasFontSize] = useState<number>(16);
  const [canvasSpacing, setCanvasSpacing] = useState<CanvasSpacing>("standard");
  const canvasClass = cn(
    canvasLayout === "novel" && "canvas-novel",
    canvasLayout === "screenplay" && "canvas-screenplay",
    canvasLayout === "digital" && "canvas-digital",
    canvasSpacing === "compact" && "canvas-spacing-compact",
    canvasSpacing === "standard" && "canvas-spacing-standard",
    canvasSpacing === "double" && "canvas-spacing-double",
  );
  // Bumped each time a sequential reveal completes, to trigger a re-render
  // and swap that subsection from animated view to editable per-paragraph view.
  const [, setRevealTick] = useState(0);

  // Re-render whenever the reveal registry updates so queued subsections
  // can pick up where the previous one left off.
  useEffect(() => subscribeRevealed(() => setRevealTick((t) => t + 1)), []);

  const chapters = book.outline?.chapters || [];

  // Merge outline.characters (rich) with characterLedger entries (live, updated each section).
  // Ledger-only entries are converted into a summarized CharacterReference so the
  // Characters tab stays in sync as new characters appear during writing.
  const mergedCharacters: CharacterReference[] = (() => {
    const outlineChars = book.outline?.characters || [];
    const ledgerChars: CharacterLedgerEntry[] = book.characterLedger?.characters || [];
    const byKey = new Map<string, CharacterReference>();
    for (const c of outlineChars) byKey.set(c.name.trim().toLowerCase(), c);
    for (const lc of ledgerChars) {
      const key = lc.name.trim().toLowerCase();
      if (byKey.has(key)) continue;
      const summary = lc.identity?.[0] || lc.relationships?.[0] || lc.history?.[0] || "Tracked from the latest sections.";
      byKey.set(key, {
        id: lc.id,
        name: lc.name,
        description: summary,
        visualDescription: "",
        role: "supporting",
        identity: {
          fullName: lc.name,
          aliases: lc.aliases,
        } as any,
        personality: lc.identity && lc.identity.length > 0 ? ({ coreType: lc.identity.slice(0, 6).join("; ") } as any) : undefined,
        backstory: lc.history && lc.history.length > 0 ? ({ formativeEvents: lc.history.slice(0, 6).join("; ") } as any) : undefined,
        storyRole: {
          relationshipToMainCharacter: (lc.relationships && lc.relationships.slice(0, 4).join("; ")) || undefined,
          arc: Array.isArray(lc.lastSectionActivity) && lc.lastSectionActivity.length > 0
            ? `Latest: ${lc.lastSectionActivity.slice(0, 3).join("; ")}`
            : undefined,
        } as any,
      });
    }
    return Array.from(byKey.values());
  })();
  const hasCharacters = mergedCharacters.length > 0;
  const isVisualBook = VISUAL_BOOK_TYPES.includes(book.bookType);
  const selectedTemplate = book.controls?.selectedTemplateId
    ? BOOK_TEMPLATES.find(t => t.id === book.controls.selectedTemplateId)
    : null;
  const selectedCharacter = selectedCharacterId ? mergedCharacters.find(c => c.id === selectedCharacterId) : null;
  const isMobile = useIsMobile();
  const isLandscapeMobile = isMobile && windowHeight < 500;

  // Display Settings popover (typography suite) — shared between mobile and desktop headers.
  const renderDisplayPopover = (compact = false) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn("font-sans shrink-0", compact ? "h-8 w-8" : "gap-1.5")}
          title="Display Settings"
          aria-label="Display Settings"
        >
          <Type className="w-3.5 h-3.5" />
          {!compact && "Display"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 font-sans">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Layout</div>
            <div className="grid grid-cols-3 gap-1">
              {([
                { id: "novel", label: "Novel" },
                { id: "screenplay", label: "Script" },
                { id: "digital", label: "Digital" },
              ] as { id: CanvasLayout; label: string }[]).map((opt) => (
                <Button
                  key={opt.id}
                  variant={canvasLayout === opt.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8 px-2"
                  onClick={() => setCanvasLayout(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5">
              {canvasLayout === "novel" && "Published Novel — elegant serif"}
              {canvasLayout === "screenplay" && "Screenplay Typewriter — monospace"}
              {canvasLayout === "digital" && "Digital Essay — clean sans-serif"}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Font Size</div>
              <div className="text-xs text-muted-foreground tabular-nums">{canvasFontSize}px</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCanvasFontSize((s) => Math.max(14, s - 1))} disabled={canvasFontSize <= 14} aria-label="Decrease font size">
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${((canvasFontSize - 14) / (24 - 14)) * 100}%` }} />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCanvasFontSize((s) => Math.min(24, s + 1))} disabled={canvasFontSize >= 24} aria-label="Increase font size">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Line Spacing</div>
            <div className="grid grid-cols-3 gap-1">
              {([
                { id: "compact", label: "Compact" },
                { id: "standard", label: "Standard" },
                { id: "double", label: "Double" },
              ] as { id: CanvasSpacing; label: string }[]).map((opt) => (
                <Button key={opt.id} variant={canvasSpacing === opt.id ? "default" : "outline"} size="sm" className="text-xs h-8 px-2" onClick={() => setCanvasSpacing(opt.id)}>
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  useEffect(() => {
    if (editingChapterIdx !== null && editChapterRef.current) {
      editChapterRef.current.focus();
      editChapterRef.current.select();
    }
  }, [editingChapterIdx]);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigate to chapter from search panel
  useEffect(() => {
    if (navigateToChapter !== null && navigateToChapter !== undefined && navigateToChapter !== selectedChapter) {
      setSelectedChapter(navigateToChapter);
      if (isMobile) setExpandedChapter(navigateToChapter);
    }
    if (navigateToChapter !== null && navigateToChapter !== undefined) {
      onNavigateHandled?.();
    }
  }, [navigateToChapter]);

  // Highlight search matches in rendered text
  const highlightSearchInText = useCallback((text: string) => {
    if (!searchQuery || !searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-warning/40 text-foreground rounded-sm px-0.5">{part}</mark>
        : part
    );
  }, [searchQuery]);

  const handleSubsectionContentUpdate = useCallback((chapterIdx: number, subIdx: number, newContent: string) => {
    if (!onUpdateBook || !book.outline) return;
    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    updatedOutline.chapters[chapterIdx].subsections[subIdx].content = newContent;
    
    // Recalculate word count
    const totalWords = updatedOutline.chapters.reduce((acc: number, ch: any) => {
      return acc + ch.subsections.reduce((sAcc: number, sub: any) => {
        return sAcc + (sub.content?.split(/\s+/).filter(Boolean).length || 0);
      }, 0);
    }, 0);

    onUpdateBook(book.id, { outline: updatedOutline, wordCount: totalWords });
  }, [onUpdateBook, book.outline, book.id]);

  const handleSaveChapterTitle = useCallback((chapterIdx: number) => {
    if (!onUpdateBook || !book.outline || !editChapterTitle.trim()) return;
    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    updatedOutline.chapters[chapterIdx].title = editChapterTitle.trim();
    onUpdateBook(book.id, { outline: updatedOutline });
    setEditingChapterIdx(null);
  }, [onUpdateBook, book.outline, book.id, editChapterTitle]);

  const handleSaveSubTitle = useCallback((chapterIdx: number, subIdx: number) => {
    if (!onUpdateBook || !book.outline || !editSubTitle.trim()) return;
    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    updatedOutline.chapters[chapterIdx].subsections[subIdx].title = editSubTitle.trim();
    onUpdateBook(book.id, { outline: updatedOutline });
    setEditingSubKey(null);
  }, [onUpdateBook, book.outline, book.id, editSubTitle]);

  const handleDeleteSubContent = useCallback((chapterIdx: number, subIdx: number) => {
    if (!onUpdateBook || !book.outline) return;
    if (!window.confirm("Clear all content in this section? This cannot be undone.")) return;
    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    updatedOutline.chapters[chapterIdx].subsections[subIdx].content = "";
    updatedOutline.chapters[chapterIdx].subsections[subIdx].status = "pending";
    onUpdateBook(book.id, { outline: updatedOutline });
  }, [onUpdateBook, book.outline, book.id]);

  const handleRewriteSub = useCallback((chapterIdx: number, subIdx: number) => {
    if (!onUpdateBook || !book.outline) return;
    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    updatedOutline.chapters[chapterIdx].subsections[subIdx].content = "";
    updatedOutline.chapters[chapterIdx].subsections[subIdx].status = "pending";
    onUpdateBook(book.id, { outline: updatedOutline });
    onGenerateChapter?.(chapterIdx);
  }, [onUpdateBook, book.outline, book.id, onGenerateChapter]);

  if (!book.outline || chapters.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-lg mb-2">No Chapters Yet</h3>
          <p className="text-muted-foreground text-sm">Start generation to create your book's chapters</p>
        </CardContent>
      </Card>
    );
  }

  const currentChapter = chapters[selectedChapter];
  const completedSubsections = currentChapter.subsections.filter(s => s.status === "completed").length;
  const totalSubsections = currentChapter.subsections.length;
  const chapterProgress = totalSubsections > 0 ? Math.round(completedSubsections / totalSubsections * 100) : 0;

  const getWordCount = (chapter: ChapterType) => {
    return chapter.subsections.reduce((acc, sub) => {
      return acc + (sub.content?.split(/\s+/).filter(Boolean).length || 0);
    }, 0);
  };

  const renderParagraphs = (content: string, chapterIdx: number, subIdx: number, sub: any) => {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length === 0) return null;

    // Animate reveal only inside the chapter that is actively being written.
    // This keeps the effect tied to the live writing process instead of
    // replaying on older completed chapters when the user revisits them.
    const activeWritingChapter =
      book.status === "writing" &&
      chapters[chapterIdx]?.status === "writing" &&
      chapterIdx === book.currentChapterIndex;
    const shouldAnimate =
      activeWritingChapter &&
      book.currentSubsectionIndex > 0 &&
      sub.status === "completed" &&
      subIdx <= book.currentSubsectionIndex - 1 &&
      !isRevealed(sub.id);

    // Queue gate: a freshly-completed subsection must wait until every
    // earlier completed subsection in this chapter has finished its reveal.
    // This prevents section 2 from animating while section 1 is still
    // typing itself out.
    if (shouldAnimate) {
      const chapterSubs = chapters[chapterIdx]?.subsections || [];
        const previousStillAnimating = chapterSubs
          .slice(0, subIdx)
          .some(
            (prev: any, prevIdx: number) =>
              prev.status === "completed" &&
              prevIdx <= book.currentSubsectionIndex - 1 &&
              !isRevealed(prev.id),
          );
      if (previousStillAnimating) {
        // Hold this subsection back — render an invisible placeholder so
        // layout doesn't jump, but no text appears yet.
        return <div className="min-h-[1.5rem]" aria-hidden />;
      }
    }

    // While animating, render the WHOLE subsection as a single sequential
    // reveal so words appear one-after-another across all paragraphs (not
    // each paragraph fading in parallel). Once complete, swap to the
    // editable per-paragraph view.
    if (shouldAnimate) {
      return (
        <SequentialReveal
          content={content}
          intervalMs={60}
          fadeMs={350}
          onComplete={() => {
            markRevealed(sub.id);
            // Force a re-render so the next render path takes the
            // editable ParagraphEditor branch.
            setRevealTick((t) => t + 1);
          }}
        />
      );
    }

    return (
      <div className="space-y-3">
        {paragraphs.map((para, pIdx) => (
          <ParagraphEditor
            key={`${sub.id}-p${pIdx}`}
            paragraph={para}
            paragraphIndex={pIdx}
            subsectionId={sub.id}
            fullContent={content}
            bookId={book.id}
            bookTitle={book.title}
            chapterTitle={chapters[chapterIdx]?.title || ""}
            subsectionTitle={sub.title}
            language={book.language}
            onContentUpdate={(newContent) => handleSubsectionContentUpdate(chapterIdx, subIdx, newContent)}
            readOnly={!onUpdateBook}
            totalParagraphs={paragraphs.length}
            highlightText={searchQuery ? highlightSearchInText : undefined}
            animateReveal={false}
          />
        ))}
      </div>
    );
  };

  // Find the first empty (non-writing, non-completed) subsection across all chapters
  const firstEmptyLocation = (() => {
    for (let ci = 0; ci < chapters.length; ci++) {
      for (let si = 0; si < chapters[ci].subsections.length; si++) {
        const s = chapters[ci].subsections[si];
        if (!s.content && s.status !== "writing" && s.status !== "completed") {
          return { chapterIdx: ci, subIdx: si };
        }
      }
    }
    return null;
  })();

  const renderSubsectionContent = (sub: any, subIdx: number, chapterIdx: number) => {
    const isFirstEmpty = firstEmptyLocation?.chapterIdx === chapterIdx && firstEmptyLocation?.subIdx === subIdx;

    return (
    <div key={sub.id} className="mb-8 last:mb-0">
      {/* Subsection Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0">
          {editingSubKey === sub.id ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={editSubTitle}
                onChange={(e) => setEditSubTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveSubTitle(chapterIdx, subIdx);
                  if (e.key === "Escape") setEditingSubKey(null);
                }}
                className="font-medium text-lg h-auto py-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleSaveSubTitle(chapterIdx, subIdx)}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingSubKey(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <h3 className="font-medium text-lg truncate" title={sub.title}>{sub.title}</h3>
          )}
        </div>
        {sub.status === "writing" && <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums px-1.5 py-0.5 rounded bg-muted/60">
          {subIdx + 1}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Section actions">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingSubKey(sub.id); setEditSubTitle(sub.title); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleRewriteSub(chapterIdx, subIdx)}
              disabled={!onGenerateChapter}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Rewrite
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteSubContent(chapterIdx, subIdx)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image rendering with template-based layout */}
      {sub.imageUrl && isVisualBook && selectedTemplate ? (
        (() => {
          const layoutIdx = subIdx % selectedTemplate.layouts.length;
          const layout = selectedTemplate.layouts[layoutIdx];
          if (layout.wrapText && sub.content) {
            // Render image with text wrapped around it
            return (
              <div className="mb-4">
                <TemplateImage imageUrl={sub.imageUrl} alt={`Illustration for ${sub.title}`} layout={layout}>
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                    {renderParagraphs(sub.content, chapterIdx, subIdx, sub)}
                  </div>
                </TemplateImage>
                {sub.status === "completed" && onUpdateBook && (
                  <div className="mt-2 border-t border-dashed border-muted pt-2">
                    <GuidedWritingToolbar
                      bookId={book.id}
                      bookTitle={book.title}
                      chapterTitle={chapters[chapterIdx]?.title || ""}
                      subsectionTitle={sub.title}
            language={book.language}
                      currentContent={sub.content}
                      subsectionGoal={sub.goal}
                      showContinue={automationLevel === "guided"}
                      onContentAppend={(appendText) => handleSubsectionContentUpdate(chapterIdx, subIdx, sub.content + appendText)}
                      onContentReplace={(newContent) => handleSubsectionContentUpdate(chapterIdx, subIdx, newContent)}
                      onManualAdd={() => {
                        setManualAddState({ chapterIdx, subIdx, type: "text" });
                        setManualText("");
                        setTimeout(() => manualTextareaRef.current?.focus(), 50);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          }
          // Non-wrapping layout: image above text
          return (
            <>
              <TemplateImage imageUrl={sub.imageUrl} alt={`Illustration for ${sub.title}`} layout={layout} />
              {sub.content ? (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                    {renderParagraphs(sub.content, chapterIdx, subIdx, sub)}
                  </div>
                  {sub.status === "completed" && onUpdateBook && (
                    <div className="mt-2 border-t border-dashed border-muted pt-2">
                      <GuidedWritingToolbar
                        bookId={book.id}
                        bookTitle={book.title}
                        chapterTitle={chapters[chapterIdx]?.title || ""}
                        subsectionTitle={sub.title}
            language={book.language}
                        currentContent={sub.content}
                        subsectionGoal={sub.goal}
                        showContinue={automationLevel === "guided"}
                        onContentAppend={(appendText) => handleSubsectionContentUpdate(chapterIdx, subIdx, sub.content + appendText)}
                        onContentReplace={(newContent) => handleSubsectionContentUpdate(chapterIdx, subIdx, newContent)}
                        onManualAdd={() => {
                          setManualAddState({ chapterIdx, subIdx, type: "text" });
                          setManualText("");
                          setTimeout(() => manualTextareaRef.current?.focus(), 50);
                        }}
                      />
                    </div>
                  )}
                </>
              ) : sub.status === "writing" ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Writing content...</span>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-muted-foreground italic text-sm">No content yet for this section.</p>
                  {isFirstEmpty && onGenerateChapter && (
                    <Button variant="hero" size="sm" onClick={() => onGenerateChapter(chapterIdx)} className="gap-1.5">
                      <Play className="w-3.5 h-3.5" />
                      Generate Text
                    </Button>
                  )}
                </div>
              )}
            </>
          );
        })()
      ) : sub.imageUrl && isVisualBook ? (
        <motion.div className="mb-6 max-w-lg mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <AspectRatio ratio={16 / 9}>
            <img src={sub.imageUrl} alt={`Illustration for ${sub.title}`} className="rounded-xl object-cover w-full h-full shadow-lg" />
          </AspectRatio>
        </motion.div>
      ) : null}

      {/* Content with paragraph editing — only when NOT already rendered by template wrapping */}
      {(() => {
        const isTemplateWrapped = sub.imageUrl && isVisualBook && selectedTemplate && selectedTemplate.layouts[subIdx % selectedTemplate.layouts.length]?.wrapText;
        if (isTemplateWrapped) return null; // Already rendered above

        if (sub.content) {
          return (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                {renderParagraphs(sub.content, chapterIdx, subIdx, sub)}
              </div>
              {sub.status === "completed" && onUpdateBook && (
                <div className="mt-2 border-t border-dashed border-muted pt-2">
                  <GuidedWritingToolbar
                    bookId={book.id}
                    bookTitle={book.title}
                    chapterTitle={chapters[chapterIdx]?.title || ""}
                    subsectionTitle={sub.title}
            language={book.language}
                    currentContent={sub.content}
                    subsectionGoal={sub.goal}
                    showContinue={automationLevel === "guided"}
                    onContentAppend={(appendText) => {
                      handleSubsectionContentUpdate(chapterIdx, subIdx, sub.content + appendText);
                    }}
                    onContentReplace={(newContent) => {
                      handleSubsectionContentUpdate(chapterIdx, subIdx, newContent);
                    }}
                    onManualAdd={() => {
                      setManualAddState({ chapterIdx, subIdx, type: "text" });
                      setManualText("");
                      setTimeout(() => manualTextareaRef.current?.focus(), 50);
                    }}
                  />
                  {manualAddState?.chapterIdx === chapterIdx && manualAddState?.subIdx === subIdx && (
                    <div className="mt-2 space-y-2">
                       <Textarea
                         ref={manualTextareaRef}
                         value={manualText}
                         onChange={(e) => {
                           if (e.target.value.length <= 5000) setManualText(e.target.value);
                         }}
                         placeholder="Write your paragraph here..."
                         className="min-h-[80px] text-sm leading-relaxed"
                         maxLength={5000}
                         onKeyDown={(e) => {
                           if (e.key === "Escape") { setManualAddState(null); setManualText(""); }
                           if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                             const cleaned = sanitizeText(manualText.trim().replace(/\n{3,}/g, "\n\n")).substring(0, 5000);
                             if (cleaned) {
                               handleSubsectionContentUpdate(chapterIdx, subIdx, sub.content + "\n\n" + cleaned);
                               setManualAddState(null);
                               setManualText("");
                             }
                           }
                         }}
                       />
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                           <Button variant="hero" size="sm" onClick={() => {
                             const cleaned = sanitizeText(manualText.trim().replace(/\n{3,}/g, "\n\n")).substring(0, 5000);
                             if (cleaned) {
                               handleSubsectionContentUpdate(chapterIdx, subIdx, sub.content + "\n\n" + cleaned);
                               setManualAddState(null);
                               setManualText("");
                             }
                           }}>
                             <Check className="w-3.5 h-3.5" />
                             Add
                           </Button>
                           <Button variant="ghost" size="sm" onClick={() => { setManualAddState(null); setManualText(""); }}>
                             <X className="w-3.5 h-3.5" />
                             Cancel
                           </Button>
                           <span className="text-[11px] text-muted-foreground ml-2">⌘+Enter to add · Esc to cancel</span>
                         </div>
                         <span className={cn("text-[11px]", manualText.length > 4500 ? "text-destructive" : "text-muted-foreground")}>
                           {manualText.length}/5,000
                         </span>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        }
        
        if (sub.status === "writing") {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Writing content...</span>
            </div>
          );
        }
        
        return (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground italic text-sm">No content yet for this section.</p>
            {isFirstEmpty && onGenerateChapter && (
              <Button variant="hero" size="sm" onClick={() => onGenerateChapter(chapterIdx)} className="gap-1.5">
                <Play className="w-3.5 h-3.5" />
                Generate Text
              </Button>
            )}
          </div>
        );
      })()}

      {subIdx < (chapters[chapterIdx]?.subsections.length || 0) - 1 && <Separator className="mt-8" />}
    </div>
    );
  };

  // Mobile view - accordion style
  if (isMobile) {
    const mobileSelectedCharacter = mobileSelectedCharacterId
      ? mergedCharacters.find((c) => c.id === mobileSelectedCharacterId)
      : null;
    return (
      <div className="flex flex-col w-full overflow-x-hidden" style={{ height: "calc(100vh - 64px - 1rem)" }}>
        {/* 3-way mobile tab toggle: Chapters | Characters | Main */}
        <div className="shrink-0 border-b px-2 py-1.5">
          <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "chapters" | "characters" | "main")}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="chapters" className="flex-1 min-w-0 gap-1 text-xs px-1 truncate overflow-hidden whitespace-nowrap">
                <BookOpen className="w-3 h-3" />
                <span className="truncate">Chapters</span>
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex-1 min-w-0 gap-1 text-xs px-1 truncate overflow-hidden whitespace-nowrap" disabled={!hasCharacters}>
                <Users className="w-3 h-3" />
                <span className="truncate">Characters</span>
              </TabsTrigger>
              <TabsTrigger value="main" className="flex-1 min-w-0 gap-1 text-xs px-1 truncate overflow-hidden whitespace-nowrap">
                <FileText className="w-3 h-3" />
                <span className="truncate">Main</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Compact mobile chapter header — only shown under Main tab */}
        {mobileTab === "main" && (
        <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-2 py-2 flex items-center gap-1.5" style={{ maxHeight: 56 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSelectedChapter(Math.max(0, selectedChapter - 1))}
            disabled={selectedChapter === 0}
            aria-label="Previous chapter"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
              Ch {currentChapter.chapterNumber} / {chapters.length}
            </div>
            <div className="font-serif text-sm font-semibold truncate" title={currentChapter.title}>
              {currentChapter.title}
            </div>
          </div>

          {renderDisplayPopover(true)}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSelectedChapter(Math.min(chapters.length - 1, selectedChapter + 1))}
            disabled={selectedChapter === chapters.length - 1}
            aria-label="Next chapter"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        )}

        {/* Tab content */}
        <ScrollArea className="flex-1 min-h-0">
          {mobileTab === "chapters" && (
            <div className="p-2 space-y-1">
              {chapters.map((chapter, idx) => {
                const StatusIcon = statusConfig[chapter.status].icon;
                const isActive = idx === selectedChapter;
                return (
                  <button
                    key={chapter.id}
                    onClick={() => { setSelectedChapter(idx); setMobileTab("main"); }}
                    className={cn("w-full text-left p-3 rounded-lg transition-colors", isActive ? "bg-primary/10" : "hover:bg-muted")}
                  >
                    <div className="flex items-start gap-2">
                      <StatusIcon className={cn("w-4 h-4 mt-0.5 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Chapter {chapter.chapterNumber}</div>
                        <div className="font-medium text-sm truncate" title={chapter.title}>{chapter.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <FileText className="w-3 h-3 shrink-0" />
                            {getWordCount(chapter).toLocaleString()}
                          </span>
                          <span>·</span>
                          <span className="truncate">{chapter.subsections.length} sections</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {mobileTab === "characters" && (
            <div className="p-2">
              {mobileSelectedCharacter ? (
                <div>
                  <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setMobileSelectedCharacterId(null)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                  <CharacterGallery characters={[mobileSelectedCharacter]} visualStyleGuide={book.outline?.visualStyleGuide} />
                </div>
              ) : (
                <div className="space-y-1">
                  {mergedCharacters.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => setMobileSelectedCharacterId(character.id)}
                      className="w-full text-left p-3 rounded-lg transition-colors hover:bg-muted flex items-center gap-3"
                    >
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {character.portraitUrl ? (
                          <img src={character.portraitUrl} alt={character.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{character.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{character.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mobileTab === "main" && (
            <div
              className={cn("w-full px-4 mx-auto flex flex-col overflow-hidden", canvasClass)}
              style={{ fontSize: `${canvasFontSize}px`, maxWidth: "42rem" }}
            >
              {selectedChapter === 0 && book.outline?.intro && (
                <div className="mb-6 pb-4 border-b border-dashed border-border/60">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Cliffhanger Intro</div>
                  <div className="font-serif italic text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {book.outline.intro}
                  </div>
                </div>
              )}
              {currentChapter.subsections.map((sub, subIdx) => renderSubsectionContent(sub, subIdx, selectedChapter))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Landscape mobile
  if (isLandscapeMobile) {
    return (
      <div className="h-[calc(100vh-theme(spacing.20))] flex min-h-0">
        <ScrollArea className="w-48 shrink-0 border-r">
          <div className="p-2 space-y-1">
            {chapters.map((chapter, idx) => {
              const StatusIcon = statusConfig[chapter.status].icon;
              const isActive = idx === selectedChapter;
              return (
                <button key={chapter.id} onClick={() => setSelectedChapter(idx)} className={cn("w-full text-left p-2 rounded-md transition-colors text-xs", isActive ? "bg-primary/10" : "hover:bg-muted")}>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("w-3 h-3 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                    <span className="truncate font-medium">{chapter.chapterNumber}. {chapter.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {currentChapter.subsections.map((sub, subIdx) => renderSubsectionContent(sub, subIdx, selectedChapter))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Desktop view
  const isComplete_all = chapters.length > 0 && chapters.every(c => c.status === "completed");

  // Character detail view component
  const renderCharacterDetail = () => {
    if (!selectedCharacter) {
      return (
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Select a character to view details</p>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ScrollArea className="flex-1 min-h-0">
          <CardContent className="p-6 pb-12">
            <CharacterGallery 
              characters={[selectedCharacter]} 
              visualStyleGuide={book.outline?.visualStyleGuide} 
            />
          </CardContent>
        </ScrollArea>
      </Card>
    );
  };

  return (
    <div className="flex gap-4 min-h-0" style={{ height: "calc(100vh - 64px - 1rem)" }}>
      {/* Sidebar (collapsible on desktop/tablet) */}
      <div
        className={cn(
          "shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out",
          sidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
        )}
      >
        <Card className="w-64 h-full flex flex-col min-h-0">
          <div className="p-3 border-b shrink-0">
            <div className="flex items-center gap-1.5">
              {hasCharacters ? (
                <Tabs
                  value={sidebarTab}
                  onValueChange={(v) => { setSidebarTab(v as "chapters" | "characters"); if (v === "chapters") setSelectedCharacterId(null); }}
                  className="flex-1 min-w-0"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="chapters" className="flex-1 gap-1 text-xs px-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Chapters
                    </TabsTrigger>
                    <TabsTrigger value="characters" className="flex-1 gap-1 text-xs px-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Characters
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <h3 className="font-medium text-sm flex items-center gap-2 flex-1 min-w-0">
                  <BookOpen className="w-4 h-4" />
                  Chapters
                </h3>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>

        <ScrollArea className="flex-1 min-h-0">
          {sidebarTab === "chapters" ? (
            <div className="p-3 space-y-1">
              {chapters.map((chapter, idx) => {
                const StatusIcon = statusConfig[chapter.status].icon;
                const isActive = idx === selectedChapter && !selectedCharacterId;
                return (
                  <motion.button
                    key={chapter.id}
                    onClick={() => { setSelectedChapter(idx); setSelectedCharacterId(null); }}
                    className={cn("w-[14rem] text-left p-3 rounded-lg transition-colors", isActive ? "bg-primary/10" : "hover:bg-muted")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-2">
                      <StatusIcon className={cn("w-4 h-4 mt-0.5 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-0.5">Chapter {chapter.chapterNumber}</div>
                        <div className="font-medium text-sm truncate" title={chapter.title}>{chapter.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <FileText className="w-3 h-3 shrink-0" />
                            {getWordCount(chapter).toLocaleString()}
                          </span>
                          <span>·</span>
                          <span className="truncate">{chapter.subsections.length} sections</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {mergedCharacters.map((character) => {
                const isActive = selectedCharacterId === character.id;
                return (
                  <motion.button
                    key={character.id}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={cn("w-[14rem] text-left p-3 rounded-lg transition-colors flex items-center gap-3", isActive ? "bg-primary/10" : "hover:bg-muted")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {character.portraitUrl ? (
                        <img src={character.portraitUrl} alt={character.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{character.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{character.role}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        </Card>
      </div>

      {/* Floating expand button when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="fixed left-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-10 rounded-r-md bg-card/90 backdrop-blur border border-l-0 border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Main Content */}
      {sidebarTab === "characters" ? (
        renderCharacterDetail()
      ) : (
        <Card className={cn("flex-1 flex flex-col overflow-hidden min-h-0", canvasClass)} style={{ fontSize: `${canvasFontSize}px` }}>
          <div className="px-4 py-2 border-b shrink-0" style={{ maxHeight: 64 }}>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedChapter(Math.max(0, selectedChapter - 1))} disabled={selectedChapter === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">
                    Chapter {currentChapter.chapterNumber} of {chapters.length}
                  </div>
                  {editingChapterIdx === selectedChapter ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        ref={editChapterRef}
                        value={editChapterTitle}
                        onChange={(e) => setEditChapterTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveChapterTitle(selectedChapter);
                          if (e.key === "Escape") setEditingChapterIdx(null);
                        }}
                        className="font-serif text-xl font-semibold h-auto py-1 w-full max-w-md"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleSaveChapterTitle(selectedChapter)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingChapterIdx(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 group cursor-pointer min-w-0"
                      onClick={() => { setEditingChapterIdx(selectedChapter); setEditChapterTitle(currentChapter.title); }}
                    >
                      <h2 className="font-serif text-xl font-semibold truncate" title={currentChapter.title}>{currentChapter.title}</h2>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderDisplayPopover(false)}
                {onGenerateChapter && currentChapter.status !== "completed" && (
                  <Button variant="hero" size="sm" onClick={() => onGenerateChapter(selectedChapter)}>
                    <Play className="w-3.5 h-3.5" />
                    Write
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(Math.min(chapters.length - 1, selectedChapter + 1))} disabled={selectedChapter === chapters.length - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <CardContent className={cn("p-6 pb-12", sidebarCollapsed && "max-w-4xl mx-auto w-full")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedChapter}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedChapter === 0 && book.outline?.intro && (
                    <div className="mb-8 pb-6 border-b border-dashed border-border/60">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Cliffhanger Intro</div>
                      <div className="font-serif italic text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {book.outline.intro}
                      </div>
                    </div>
                  )}
                  {currentChapter.subsections.map((sub, subIdx) => renderSubsectionContent(sub, subIdx, selectedChapter))}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
