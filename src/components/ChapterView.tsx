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
import { Book, Chapter as ChapterType, AutomationLevel, VISUAL_BOOK_TYPES, BOOK_TEMPLATES, ImageLayoutSlot } from "@/types/book";
import { TemplateImage } from "@/components/TemplateImage";
import { useIsMobile } from "@/hooks/use-mobile";
import { ParagraphEditor } from "@/components/ParagraphEditor";
import { isRevealed, markRevealed, subscribeRevealed } from "@/lib/revealRegistry";
import { SequentialReveal } from "@/components/SequentialReveal";
import { GuidedWritingToolbar } from "@/components/GuidedWritingToolbar";
import { CharacterGallery } from "@/components/CharacterGallery";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, Circle, Loader2, FileText, ChevronDown, Play, Check, X, Users, User, Pencil } from "lucide-react";

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
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");
  const editChapterRef = useRef<HTMLInputElement>(null);
  // Bumped each time a sequential reveal completes, to trigger a re-render
  // and swap that subsection from animated view to editable per-paragraph view.
  const [, setRevealTick] = useState(0);

  // Re-render whenever the reveal registry updates so queued subsections
  // can pick up where the previous one left off.
  useEffect(() => subscribeRevealed(() => setRevealTick((t) => t + 1)), []);

  const chapters = book.outline?.chapters || [];
  const hasCharacters = book.outline?.characters && book.outline.characters.length > 0;
  const isVisualBook = VISUAL_BOOK_TYPES.includes(book.bookType);
  const selectedTemplate = book.controls?.selectedTemplateId
    ? BOOK_TEMPLATES.find(t => t.id === book.controls.selectedTemplateId)
    : null;
  const selectedCharacter = selectedCharacterId ? book.outline?.characters?.find(c => c.id === selectedCharacterId) : null;
  const isMobile = useIsMobile();
  const isLandscapeMobile = isMobile && windowHeight < 500;

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
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
          {subIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg">{sub.title}</h3>
          {/* Teasers are now woven into the prose itself — no separate display */}
        </div>
        {sub.status === "completed" && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
        {sub.status === "writing" && <Loader2 className="w-5 h-5 text-primary shrink-0 animate-spin" />}
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
                  <div className="prose prose-sm dark:prose-invert max-w-none pl-11 overflow-hidden">
                    {renderParagraphs(sub.content, chapterIdx, subIdx, sub)}
                  </div>
                  {sub.status === "completed" && onUpdateBook && (
                    <div className="pl-11 mt-2 border-t border-dashed border-muted pt-2">
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
                <div className="pl-11 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Writing content...</span>
                </div>
              ) : (
                <div className="pl-11 flex flex-col items-start gap-2">
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
              <div className="prose prose-sm dark:prose-invert max-w-none pl-11 overflow-hidden">
                {renderParagraphs(sub.content, chapterIdx, subIdx, sub)}
              </div>
              {sub.status === "completed" && onUpdateBook && (
                <div className="pl-11 mt-2 border-t border-dashed border-muted pt-2">
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
            <div className="pl-11 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Writing content...</span>
            </div>
          );
        }
        
        return (
          <div className="pl-11 flex flex-col items-start gap-2">
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
    return (
      <ScrollArea className="w-full overflow-x-hidden" style={{ height: "calc(100vh - 64px - 1rem)" }}>
        <div className="py-2 space-y-2">
          {chapters.map((chapter, idx) => {
            const StatusIcon = statusConfig[chapter.status].icon;
            const isExpanded = expandedChapter === idx;
            return (
              <Collapsible key={chapter.id} open={isExpanded} onOpenChange={open => setExpandedChapter(open ? idx : null)}>
                <Card className={cn("overflow-hidden transition-colors rounded-none border-x-0", isExpanded && "ring-1 ring-primary/20")}>
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center gap-3">
                      <StatusIcon className={cn("w-5 h-5 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                      <div className="flex-1 min-w-0 text-left overflow-hidden">
                        <div className="text-xs text-muted-foreground">Chapter {chapter.chapterNumber}</div>
                        <div className="font-medium text-sm break-words">{chapter.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {getWordCount(chapter).toLocaleString()}
                          </span>
                          <span>·</span>
                          <span>{chapter.subsections.length} sections</span>
                        </div>
                      </div>
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Separator />
                    <div className="p-4 md:p-6 overflow-hidden">
                      {chapter.subsections.map((sub, subIdx) => renderSubsectionContent(sub, subIdx, idx))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
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
      {/* Sidebar */}
      <Card className="w-64 shrink-0 flex flex-col min-h-0">
        <div className="p-4 border-b shrink-0">
          {hasCharacters ? (
            <Tabs value={sidebarTab} onValueChange={(v) => { setSidebarTab(v as "chapters" | "characters"); if (v === "chapters") setSelectedCharacterId(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="chapters" className="flex-1 gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="characters" className="flex-1 gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5" />
                  Characters
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h3 className="font-medium text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Chapters
            </h3>
          )}
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
              {book.outline?.characters?.map((character) => {
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

      {/* Main Content */}
      {sidebarTab === "characters" ? (
        renderCharacterDetail()
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(Math.max(0, selectedChapter - 1))} disabled={selectedChapter === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
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
                        className="font-serif text-xl font-semibold h-auto py-1 w-64"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveChapterTitle(selectedChapter)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingChapterIdx(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-2 group cursor-pointer" 
                      onClick={() => { setEditingChapterIdx(selectedChapter); setEditChapterTitle(currentChapter.title); }}
                    >
                      <h2 className="font-serif text-xl font-semibold">{currentChapter.title}</h2>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge variant={currentChapter.status === "completed" ? "success" : "secondary"} className="text-xs">
                    {statusConfig[currentChapter.status].label}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {completedSubsections}/{totalSubsections} sections · {chapterProgress}%
                  </div>
                </div>
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
            <CardContent className="p-6 pb-12">
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
