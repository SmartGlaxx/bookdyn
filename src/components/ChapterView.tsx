import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Book, Chapter as ChapterType } from "@/types/book";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, Circle, Loader2, FileText, ChevronDown } from "lucide-react";
interface ChapterViewProps {
  book: Book;
}
const statusConfig: Record<"pending" | "writing" | "completed", {
  icon: typeof Circle;
  color: string;
  label: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    label: "Pending"
  },
  writing: {
    icon: Loader2,
    color: "text-primary",
    label: "Writing",
    animate: true
  },
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    label: "Completed"
  }
};
export function ChapterView({
  book
}: ChapterViewProps) {
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const chapters = book.outline?.chapters || [];
  const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
  const isMobile = useIsMobile();
  if (!book.outline || chapters.length === 0) {
    return <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-lg mb-2">No Chapters Yet</h3>
          <p className="text-muted-foreground text-sm">
            Start generation to create your book's chapters
          </p>
        </CardContent>
      </Card>;
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
  const renderChapterContent = (chapter: ChapterType) => <div className="p-4 md:p-6">
      {chapter.subsections.map((sub, subIdx) => <div key={sub.id} className="mb-8 last:mb-0">
          {/* Subsection Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
              {subIdx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-lg">{sub.title}</h3>
              {sub.summary && <p className="text-sm text-muted-foreground mt-0.5">{sub.summary}</p>}
            </div>
            {sub.status === "completed" && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
            {sub.status === "writing" && <Loader2 className="w-5 h-5 text-primary shrink-0 animate-spin" />}
          </div>

          {/* Image for children's books */}
          {sub.imageUrl && isChildrensBook && <motion.div className="mb-6 max-w-lg mx-auto" initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }}>
              <AspectRatio ratio={16 / 9}>
                <img src={sub.imageUrl} alt={`Illustration for ${sub.title}`} className="rounded-xl object-cover w-full h-full shadow-lg" />
              </AspectRatio>
            </motion.div>}

          {/* Content */}
          {sub.content ? <div className="prose prose-sm dark:prose-invert max-w-none pl-11">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {sub.content}
              </p>
            </div> : sub.status === "pending" ? <div className="pl-11 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div> : sub.status === "writing" ? <div className="pl-11 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Writing content...</span>
            </div> : <p className="pl-11 text-muted-foreground italic text-sm">
              Content pending...
            </p>}

          {/* Separator between subsections */}
          {subIdx < chapter.subsections.length - 1 && <Separator className="mt-8" />}
        </div>)}
    </div>;

  // Mobile view - accordion style
  if (isMobile) {
    return <ScrollArea className="h-[calc(100vh-theme(spacing.32))]">
        <div className="px-4 py-2 space-y-2">
          {chapters.map((chapter, idx) => {
          const StatusIcon = statusConfig[chapter.status].icon;
          const isExpanded = expandedChapter === idx;
          return <Collapsible key={chapter.id} open={isExpanded} onOpenChange={open => setExpandedChapter(open ? idx : null)}>
                <Card className={cn("overflow-hidden transition-colors", isExpanded && "ring-2 ring-primary/30")}>
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center gap-3">
                      <StatusIcon className={cn("w-5 h-5 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs text-muted-foreground">
                          Chapter {chapter.chapterNumber}
                        </div>
                        <div className="font-medium text-sm truncate">
                          {chapter.title}
                        </div>
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
                    {renderChapterContent(chapter)}
                  </CollapsibleContent>
                </Card>
              </Collapsible>;
        })}
        </div>
      </ScrollArea>;
  }

  // Desktop view
  return <div className="h-[calc(100vh-theme(spacing.32))] flex gap-4 min-h-0">
      {/* Chapter Navigation Sidebar */}
      <Card className="w-64 shrink-0 flex flex-col min-h-0">
        <div className="p-4 border-b shrink-0">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Chapters
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {chapters.length} chapters · {chapters.filter(c => c.status === "completed").length} completed
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-1">
            {chapters.map((chapter, idx) => {
            const StatusIcon = statusConfig[chapter.status].icon;
            const isActive = idx === selectedChapter;
            return <motion.button key={chapter.id} onClick={() => setSelectedChapter(idx)} className={cn("w-[14rem]  text-left p-3 rounded-lg transition-colors ", isActive ? "bg-primary/10" : "hover:bg-muted")} whileHover={{
              scale: 1.01
            }} whileTap={{
              scale: 0.99
            }}>
                  <div className="flex items-start gap-2">
                    <StatusIcon className={cn("w-4 h-4 mt-0.5 shrink-0", statusConfig[chapter.status].color, statusConfig[chapter.status].animate && "animate-spin")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-0.5">
                        Chapter {chapter.chapterNumber}
                      </div>
                      <div className="font-medium text-sm truncate" title={chapter.title}>
                        {chapter.title}
                      </div>
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
                </motion.button>;
          })}
          </div>
        </ScrollArea>
      </Card>

      {/* Chapter Content */}
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Chapter Header */}
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
                <h2 className="font-serif text-xl font-semibold">{currentChapter.title}</h2>
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
              <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(Math.min(chapters.length - 1, selectedChapter + 1))} disabled={selectedChapter === chapters.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chapter Content - independently scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={selectedChapter} initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }} transition={{
              duration: 0.2
            }}>
                {currentChapter.subsections.map((sub, subIdx) => <div key={sub.id} className="mb-8 last:mb-0">
                    {/* Subsection Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                        {subIdx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{sub.title}</h3>
                        {sub.summary && <p className="text-sm text-muted-foreground mt-0.5">{sub.summary}</p>}
                      </div>
                      {sub.status === "completed" && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                      {sub.status === "writing" && <Loader2 className="w-5 h-5 text-primary shrink-0 animate-spin" />}
                    </div>

                    {/* Image for children's books */}
                    {sub.imageUrl && isChildrensBook && <motion.div className="mb-6 max-w-lg mx-auto" initial={{
                  opacity: 0,
                  scale: 0.95
                }} animate={{
                  opacity: 1,
                  scale: 1
                }}>
                        <AspectRatio ratio={16 / 9}>
                          <img src={sub.imageUrl} alt={`Illustration for ${sub.title}`} className="rounded-xl object-cover w-full h-full shadow-lg" />
                        </AspectRatio>
                      </motion.div>}

                    {/* Content */}
                    {sub.content ? <div className="prose prose-sm dark:prose-invert max-w-none pl-11">
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                          {sub.content}
                        </p>
                      </div> : sub.status === "pending" ? <div className="pl-11 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div> : sub.status === "writing" ? <div className="pl-11 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Writing content...</span>
                      </div> : <p className="pl-11 text-muted-foreground italic text-sm">
                        Content pending...
                      </p>}

                    {/* Separator between subsections */}
                    {subIdx < currentChapter.subsections.length - 1 && <Separator className="mt-8" />}
                  </div>)}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </ScrollArea>

        {/* Chapter Footer with navigation */}
        <div className="p-4 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedChapter(Math.max(0, selectedChapter - 1))} disabled={selectedChapter === 0} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Previous Chapter
            </Button>
            <div className="flex items-center gap-1">
              {chapters.map((_, idx) => <button key={idx} onClick={() => setSelectedChapter(idx)} className={cn("w-2 h-2 rounded-full transition-colors", idx === selectedChapter ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50")} />)}
            </div>
            <Button variant="outline" onClick={() => setSelectedChapter(Math.min(chapters.length - 1, selectedChapter + 1))} disabled={selectedChapter === chapters.length - 1} className="gap-2">
              Next Chapter
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>;
}