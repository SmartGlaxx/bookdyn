import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Book, BookOutline, Chapter, Subsection } from "@/types/book";
import { useBookStore } from "@/store/bookStore";
import { toast } from "sonner";

export type GenerationPhase = 
  | "idle" 
  | "planning" 
  | "generating-outline"
  | "writing"
  | "generating-image"
  | "summarizing"
  | "completed"
  | "paused"
  | "error";

export interface GenerationState {
  phase: GenerationPhase;
  currentChapter: number;
  currentSubsection: number;
  totalChapters: number;
  totalSubsections: number;
  streamingContent: string;
  currentImage: string | null;
  error: string | null;
}

export function useBookGeneration(book: Book) {
  const { updateBook } = useBookStore();
  const [state, setState] = useState<GenerationState>({
    phase: "idle",
    currentChapter: 0,
    currentSubsection: 0,
    totalChapters: 0,
    totalSubsections: 0,
    streamingContent: "",
    currentImage: null,
    error: null,
  });
  
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const generateOutline = useCallback(async (): Promise<BookOutline | null> => {
    setState(s => ({ ...s, phase: "generating-outline", error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-outline", {
        body: { book },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const outline = data.outline as BookOutline;
      
      // Count totals
      const totalSubs = outline.chapters.reduce((acc, ch) => acc + ch.subsections.length, 0);
      
      setState(s => ({
        ...s,
        totalChapters: outline.chapters.length,
        totalSubsections: totalSubs,
      }));

      updateBook(book.id, { 
        outline,
        status: "ready_to_write",
      });

      return outline;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate outline";
      setState(s => ({ ...s, phase: "error", error: message }));
      toast.error(message);
      return null;
    }
  }, [book, updateBook]);

  const streamContent = useCallback(async (
    bookData: Book,
    chapterIndex: number,
    subsectionIndex: number,
    previousSummary?: string
  ): Promise<string> => {
    setState(s => ({ 
      ...s, 
      phase: "writing",
      currentChapter: chapterIndex,
      currentSubsection: subsectionIndex,
      streamingContent: "",
    }));

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        book: bookData,
        chapterIndex,
        subsectionIndex,
        previousSummary,
        tonalAnchors: bookData.tonalAnchors || [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            setState(s => ({ ...s, streamingContent: fullContent }));
          }
        } catch {
          // Incomplete JSON, wait for more
          buffer = line + "\n" + buffer;
          break;
        }
      }

      if (abortRef.current) break;
    }

    return fullContent;
  }, []);

  const generateImage = useCallback(async (
    content: string,
    imageOpportunity?: string
  ): Promise<string | null> => {
    if (!book.controls.imageGeneration) return null;

    setState(s => ({ ...s, phase: "generating-image", currentImage: null }));

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          content,
          bookType: book.bookType,
          theme: book.theme,
          imageOpportunity,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const imageUrl = data.imageUrl;
      setState(s => ({ ...s, currentImage: imageUrl }));
      return imageUrl;
    } catch (err) {
      console.error("Image generation failed:", err);
      // Don't fail the whole process for image errors
      return null;
    }
  }, [book]);

  const summarizeContent = useCallback(async (
    content: string,
    type: "subsection" | "chapter"
  ): Promise<string> => {
    setState(s => ({ ...s, phase: "summarizing" }));

    try {
      const { data, error } = await supabase.functions.invoke("summarize-content", {
        body: { content, type },
      });

      if (error) throw error;
      return data.summary || "";
    } catch (err) {
      console.error("Summarization failed:", err);
      return "";
    }
  }, []);

  const startGeneration = useCallback(async () => {
    abortRef.current = false;
    pauseRef.current = false;

    let currentBook = book;
    let outline = book.outline;

    // Phase 1: Generate outline if needed
    if (!outline || outline.chapters.length === 0) {
      setState(s => ({ ...s, phase: "planning" }));
      updateBook(book.id, { status: "planning" });
      
      outline = await generateOutline();
      if (!outline) return;
      
      currentBook = { ...currentBook, outline };
    }

    // Phase 2: Write content
    updateBook(book.id, { status: "writing" });
    
    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    let previousSummary = "";
    let tonalAnchors: string[] = [...(book.tonalAnchors || [])];
    let subsectionCounter = 0;

    for (let chIdx = book.currentChapterIndex; chIdx < outline.chapters.length; chIdx++) {
      if (abortRef.current) break;
      
      const chapter = outline.chapters[chIdx];
      const updatedSubsections: Subsection[] = [...chapter.subsections];
      let chapterContent = "";

      const startSubIdx = chIdx === book.currentChapterIndex ? book.currentSubsectionIndex : 0;

      for (let subIdx = startSubIdx; subIdx < chapter.subsections.length; subIdx++) {
        if (abortRef.current) break;
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
          if (abortRef.current) break;
        }

        const subsection = chapter.subsections[subIdx];
        subsectionCounter++;

        try {
          // Generate content with streaming
          const content = await streamContent(
            { ...currentBook, outline, tonalAnchors },
            chIdx,
            subIdx,
            previousSummary
          );

          chapterContent += content + "\n\n";
          
          // Generate image for children's books (every section) or periodically
          let imageUrl: string | null = null;
          if (isChildrensBook || (book.controls.imageGeneration && subsectionCounter % 3 === 0)) {
            imageUrl = await generateImage(content, subsection.imageOpportunity);
          }

          // Summarize subsection
          const summary = await summarizeContent(content, "subsection");
          previousSummary = summary;

          // Random tonal anchor extraction
          if (Math.random() < 0.3 && content.length > 200) {
            const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100);
            if (paragraphs.length > 0) {
              const randomPara = paragraphs[Math.floor(Math.random() * paragraphs.length)];
              tonalAnchors = [...tonalAnchors.slice(-2), randomPara];
            }
          }

          // Update subsection
          updatedSubsections[subIdx] = {
            ...subsection,
            content,
            summary,
            imageUrl: imageUrl || undefined,
            status: "completed",
          };

          // Save progress
          const updatedChapters = [...outline.chapters];
          updatedChapters[chIdx] = {
            ...chapter,
            subsections: updatedSubsections,
            status: subIdx === chapter.subsections.length - 1 ? "completed" : "writing",
          };

          const newOutline = { ...outline, chapters: updatedChapters };
          outline = newOutline;
          currentBook = { 
            ...currentBook, 
            outline: newOutline,
            tonalAnchors,
            currentChapterIndex: chIdx,
            currentSubsectionIndex: subIdx + 1,
            wordCount: (currentBook.wordCount || 0) + content.split(/\s+/).length,
          };

          updateBook(book.id, {
            outline: newOutline,
            tonalAnchors,
            currentChapterIndex: chIdx,
            currentSubsectionIndex: subIdx + 1,
            wordCount: currentBook.wordCount,
          });

        } catch (err) {
          const message = err instanceof Error ? err.message : "Generation failed";
          setState(s => ({ ...s, phase: "error", error: message }));
          toast.error(message);
          
          // Save progress before stopping
          updateBook(book.id, {
            status: "paused",
            currentChapterIndex: chIdx,
            currentSubsectionIndex: subIdx,
          });
          return;
        }
      }

      // Chapter completed - generate chapter summary
      if (!abortRef.current) {
        const chapterSummary = await summarizeContent(chapterContent, "chapter");
        
        const updatedChapters = [...outline.chapters];
        updatedChapters[chIdx] = {
          ...updatedChapters[chIdx],
          summary: chapterSummary,
          status: "completed",
        };

        outline = { ...outline, chapters: updatedChapters };
        updateBook(book.id, { outline });
      }
    }

    // All done
    if (!abortRef.current) {
      setState(s => ({ ...s, phase: "completed" }));
      updateBook(book.id, { status: "completed" });
      toast.success("Book generation completed!");
    }
  }, [book, generateOutline, streamContent, generateImage, summarizeContent, updateBook]);

  const pauseGeneration = useCallback(() => {
    pauseRef.current = true;
    setState(s => ({ ...s, phase: "paused" }));
    updateBook(book.id, { status: "paused" });
  }, [book.id, updateBook]);

  const resumeGeneration = useCallback(() => {
    pauseRef.current = false;
    startGeneration();
  }, [startGeneration]);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setState(s => ({ ...s, phase: "idle" }));
    updateBook(book.id, { status: "paused" });
  }, [book.id, updateBook]);

  return {
    state,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
    generateOutline,
  };
}
