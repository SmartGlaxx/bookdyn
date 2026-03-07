import { motion, AnimatePresence } from "framer-motion";
import { sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Book, Subsection, Chapter } from "@/types/book";
import { GenerationState } from "@/hooks/useBookGeneration";
import { PenTool, Image as ImageIcon } from "lucide-react";

interface LiveContentViewProps {
  book: Book;
  generationState: GenerationState;
  viewMode: "live" | "chapter" | "full";
}

export function LiveContentView({ book, generationState, viewMode }: LiveContentViewProps) {
  const { streamingContent, currentImage, phase, currentChapter, currentSubsection } = generationState;
  const isWriting = phase === "writing";
  const isGeneratingImage = phase === "generating-image";
  const isChildrensBook = book.bookType === "children" || book.bookType === "comic";

  const currentChapterData = book.outline?.chapters[currentChapter];
  const currentSubsectionData = currentChapterData?.subsections[currentSubsection];

  if (viewMode === "live") {
    return (
      <Card className="h-full overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className={cn(
            "h-full flex",
            isChildrensBook ? "flex-col lg:flex-row" : "flex-col"
          )}>
            {/* Content area */}
            <div className={cn(
              "flex-1 p-6 overflow-auto",
              isChildrensBook && "lg:w-1/2"
            )}>
              {/* Current position header */}
              {currentChapterData && (
                <motion.div 
                  className="mb-4 pb-4 border-b"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Chapter {currentChapter + 1}
                  </p>
                  <h3 className="font-serif text-lg font-semibold">
                    {currentChapterData.title}
                  </h3>
                  {currentSubsectionData && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentSubsectionData.title}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Streaming content */}
              <ScrollArea className="h-[calc(100%-80px)]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {isWriting || streamingContent ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="streaming"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {streamingContent}
                        {isWriting && (
                          <motion.span
                            className="inline-block w-2 h-4 bg-primary ml-1"
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <PenTool className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>Content will appear here as it's generated...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Image area for children's books */}
            {isChildrensBook && (
              <div className={cn(
                "bg-muted/30 p-4 flex items-center justify-center",
                "lg:w-1/2 lg:border-l min-h-[300px]"
              )}>
                <AnimatePresence mode="wait">
                  {isGeneratingImage ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">Creating illustration...</p>
                    </motion.div>
                  ) : currentImage ? (
                    <motion.div
                      key="image"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="w-full max-w-md"
                    >
                      <AspectRatio ratio={16 / 9}>
                        <img 
                          src={currentImage} 
                          alt="Book illustration" 
                          className="rounded-lg object-cover w-full h-full shadow-lg"
                        />
                      </AspectRatio>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-muted-foreground"
                    >
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Illustrations will appear here</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Chapter view - show completed content
  if (viewMode === "chapter" && book.outline) {
    return (
      <Card className="h-full overflow-hidden">
        <ScrollArea className="h-full">
          <CardContent className="p-6">
            {book.outline.chapters.map((chapter, chIdx) => (
              <div key={chapter.id} className="mb-8">
                <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">Chapter {chapter.chapterNumber}:</span>
                  {chapter.title}
                </h2>
                
                {chapter.subsections.map((sub, subIdx) => (
                  <div key={sub.id} className="mb-6">
                    <h3 className="font-medium text-lg mb-2">{sub.title}</h3>
                    
                    {sub.imageUrl && isChildrensBook && (
                      <motion.div 
                        className="mb-4 max-w-md mx-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <AspectRatio ratio={16 / 9}>
                          <img 
                            src={sub.imageUrl} 
                            alt={`Illustration for ${sub.title}`}
                            className="rounded-lg object-cover w-full h-full shadow-md"
                          />
                        </AspectRatio>
                      </motion.div>
                    )}
                    
                    {sub.content ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {sanitizeText(sub.content)}
                      </p>
                    ) : sub.status === "pending" ? (
                      <Skeleton className="h-24 w-full" />
                    ) : (
                      <p className="text-muted-foreground italic">Content pending...</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>
    );
  }

  // Full manuscript view
  return (
    <Card className="h-full overflow-hidden">
      <ScrollArea className="h-full">
        <CardContent className="p-8 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl font-bold mb-2">{book.title}</h1>
            {book.subtitle && (
              <p className="text-lg text-muted-foreground">{book.subtitle}</p>
            )}
          </div>
          
          {book.outline?.chapters.map((chapter) => (
            <div key={chapter.id} className="mb-12">
              <h2 className="font-serif text-2xl font-bold mb-6 text-center">
                Chapter {chapter.chapterNumber}
                <br />
                <span className="text-xl">{chapter.title}</span>
              </h2>
              
              {chapter.subsections.map((sub) => (
                <div key={sub.id} className="mb-8">
                  {sub.imageUrl && (
                    <div className="mb-6 max-w-lg mx-auto">
                      <img 
                        src={sub.imageUrl} 
                        alt={sub.title}
                        className="rounded-lg w-full shadow-lg"
                      />
                    </div>
                  )}
                  
                  {sub.content && (
                    <p className="whitespace-pre-wrap leading-relaxed text-lg first-letter:text-4xl first-letter:font-serif first-letter:mr-1">
                      {sanitizeText(sub.content)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
