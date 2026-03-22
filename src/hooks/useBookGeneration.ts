import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Book, BookOutline, Chapter, Subsection, CharacterReference, getIELTSBandForAudience } from "@/types/book";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000; // 2 seconds

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

export type GenerationPhase = 
  | "idle" 
  | "planning" 
  | "generating-outline"
  | "generating-characters"
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
  characters: CharacterReference[];
  characterProgress: { current: number; total: number };
}

interface UseBookGenerationOptions {
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
}

export function useBookGeneration(book: Book, options: UseBookGenerationOptions) {
  const { onUpdateBook } = options;
  const [state, setState] = useState<GenerationState>({
    phase: "idle",
    currentChapter: 0,
    currentSubsection: 0,
    totalChapters: 0,
    totalSubsections: 0,
    streamingContent: "",
    currentImage: null,
    error: null,
    characters: [],
    characterProgress: { current: 0, total: 0 },
  });
  
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const generateOutline = useCallback(async (): Promise<BookOutline | null> => {
    setState(s => ({ ...s, phase: "generating-outline", error: null }));
    
    // Get IELTS band for language/structure complexity
    const ieltsBand = getIELTSBandForAudience(book.audience);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-outline", {
        body: { book, ieltsBand },
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

      onUpdateBook(book.id, { 
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
  }, [book, onUpdateBook]);

  const generateCharacters = useCallback(async (outline: BookOutline): Promise<CharacterReference[]> => {
    setState(s => ({ ...s, phase: "generating-characters", characterProgress: { current: 0, total: 0 } }));
    toast.info("Generating character profiles...");

    // Get IELTS band for language complexity
    const ieltsBand = getIELTSBandForAudience(book.audience);

    try {
      const { data, error } = await supabase.functions.invoke("generate-characters", {
        body: { book, outline, ieltsBand },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const characters = data.characters as CharacterReference[];
      const visualStyleGuide = data.visualStyleGuide as string;

      setState(s => ({ 
        ...s, 
        characters,
        characterProgress: { current: characters.length, total: characters.length }
      }));

      // Update the outline with character data
      const updatedOutline = {
        ...outline,
        characters,
        visualStyleGuide,
      };

      onUpdateBook(book.id, { outline: updatedOutline });
      
      toast.success(`Generated ${characters.length} character portrait(s)`);
      return characters;
    } catch (err) {
      console.error("Character generation failed:", err);
      toast.error("Character portraits could not be generated, continuing with text descriptions");
      return [];
    }
  }, [book, onUpdateBook]);

  const streamContent = useCallback(async (
    bookData: Book,
    chapterIndex: number,
    subsectionIndex: number,
    previousSummary?: string,
    previousRawContent?: string
  ): Promise<string> => {
    setState(s => ({ 
      ...s, 
      phase: "writing",
      currentChapter: chapterIndex,
      currentSubsection: subsectionIndex,
      streamingContent: "",
    }));

    // Get IELTS band for language level
    const ieltsBand = getIELTSBandForAudience(bookData.audience);

    // Calculate per-subsection word target based on total target and outline size
    const totalSubsections = bookData.outline?.chapters?.reduce(
      (sum: number, ch: any) => sum + (ch.subsections?.length || 0), 0
    ) || 1;
    const targetWordCount = bookData.controls?.structureControls?.targetWordCount || 50000;
    const targetWordsPerSubsection = Math.round(targetWordCount / totalSubsections);
    // Clamp between 300 and 1200 words per subsection
    const clampedWordsPerSubsection = Math.max(300, Math.min(1200, targetWordsPerSubsection));

    // Get the user's session token for auth
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      console.error("[BookGen] No active session found — cannot authenticate content generation");
      throw new Error("Session expired. Please refresh the page and try again.");
    }

    // Send only the current chapter data to keep payload small
    const currentChapter = bookData.outline?.chapters?.[chapterIndex];
    const strippedBook = {
      id: bookData.id,
      title: bookData.title,
      subtitle: bookData.subtitle,
      bookType: bookData.bookType,
      theme: bookData.theme,
      genre: bookData.genre,
      audience: bookData.audience,
      pov: bookData.pov,
      toneProfile: bookData.toneProfile,
      controls: bookData.controls,
      outline: {
        chapters: currentChapter ? [currentChapter] : [],
      },
    };

    console.log(`[BookGen] Requesting content for Ch${chapterIndex + 1} Sub${subsectionIndex + 1}`);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        book: strippedBook,
        chapterIndex: 0, // Always 0 since we only send the current chapter
        subsectionIndex,
        previousSummary,
        previousRawContent,
        tonalAnchors: bookData.tonalAnchors || [],
        ieltsBand,
        targetWordsPerSubsection: clampedWordsPerSubsection,
        teaserStyle: bookData.controls?.teaserStyle || "none",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || `Error: ${response.status}`;
      console.error(`[BookGen] Content generation failed (${response.status}):`, msg);
      if (response.status === 402) {
        throw new Error(msg.includes("Daily") ? msg : `Credit limit reached: ${msg}. Please upgrade your plan.`);
      }
      throw new Error(msg);
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

    console.log(`[BookGen] Content received for Ch${chapterIndex + 1} Sub${subsectionIndex + 1}: ${fullContent.split(/\s+/).length} words`);
    return fullContent;
  }, []);

  const generateImage = useCallback(async (
    content: string,
    imageOpportunity?: string,
    characters?: CharacterReference[],
    visualStyleGuide?: string
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
          characters,
          visualStyleGuide,
          useCharacterReferences: characters && characters.length > 0,
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
    let characters: CharacterReference[] = book.outline?.characters || [];
    let visualStyleGuide = book.outline?.visualStyleGuide || "";

    // Phase 1: Generate outline if needed
    if (!outline || outline.chapters.length === 0) {
      setState(s => ({ ...s, phase: "planning" }));
      onUpdateBook(book.id, { status: "planning" });
      
      outline = await generateOutline();
      if (!outline) return;
      
      currentBook = { ...currentBook, outline };
    }

    // Phase 1.5: Generate character profiles for all book types
    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    if (!outline.characters || outline.characters.length === 0) {
      characters = await generateCharacters(outline);
      visualStyleGuide = outline.visualStyleGuide || "";
      
      outline = {
        ...outline,
        characters,
        visualStyleGuide,
      };
      currentBook = { ...currentBook, outline };
    } else if (outline.characters) {
      characters = outline.characters;
      visualStyleGuide = outline.visualStyleGuide || "";
    }

    // Phase 2: Write content
    onUpdateBook(book.id, { status: "writing" });

    let previousSummary = "";
    let previousRawContent = "";
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
          // Generate content with streaming - with retry logic
          const content = await retryWithBackoff(
            () => streamContent(
              { ...currentBook, outline, tonalAnchors },
              chIdx,
              subIdx,
              previousSummary,
              previousRawContent
            ),
            MAX_RETRIES,
            (attempt, error) => {
              toast.warning(`Content generation failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`);
              console.warn(`Retry ${attempt} for chapter ${chIdx + 1}, subsection ${subIdx + 1}:`, error.message);
            }
          );

          chapterContent += content + "\n\n";
          
          // Generate image for children's books (every section) or periodically
          // Image generation failures are non-critical, so we don't require strict retry here
          let imageUrl: string | null = null;
          if (isChildrensBook || (book.controls.imageGeneration && subsectionCounter % 3 === 0)) {
            try {
              imageUrl = await retryWithBackoff(
                () => generateImage(content, subsection.imageOpportunity, characters, visualStyleGuide),
                2, // Fewer retries for images since they're not critical
                (attempt) => {
                  console.warn(`Image retry ${attempt} for chapter ${chIdx + 1}, subsection ${subIdx + 1}`);
                }
              );
            } catch (imgErr) {
              console.warn("Image generation failed after retries, continuing without image:", imgErr);
            }
          }

          // Summarize subsection - with retry logic
          let summary = "";
          try {
            summary = await retryWithBackoff(
              () => summarizeContent(content, "subsection"),
              MAX_RETRIES,
              (attempt) => {
                console.warn(`Summary retry ${attempt} for chapter ${chIdx + 1}, subsection ${subIdx + 1}`);
              }
            );
          } catch (sumErr) {
            console.warn("Summarization failed after retries, using truncated content:", sumErr);
            // Use first 500 chars as fallback summary
            summary = content.slice(0, 500) + "...";
          }
          
          previousSummary = summary;
          // Keep the last ~1000 words of actual prose for anti-repetition context
          const words = content.split(/\s+/);
          previousRawContent = words.slice(-Math.min(1000, words.length)).join(" ");

          // Random tonal anchor extraction
          if (Math.random() < 0.3 && content.length > 200) {
            const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100);
            if (paragraphs.length > 0) {
              const randomPara = paragraphs[Math.floor(Math.random() * paragraphs.length)];
              tonalAnchors = [...tonalAnchors.slice(-2), randomPara];
            }
          }

          // Parse teaser from content if present
          let teaser: string | undefined;
          let cleanContent = content;
          const teaserMatch = content.match(/\[TEASER\]([\s\S]*?)\[\/TEASER\]/);
          if (teaserMatch) {
            teaser = teaserMatch[1].trim();
            cleanContent = content.replace(/\[TEASER\][\s\S]*?\[\/TEASER\]\s*/, "").trim();
          }

          // Update subsection
          updatedSubsections[subIdx] = {
            ...subsection,
            content: cleanContent,
            summary,
            teaser,
            imageUrl: imageUrl || undefined,
            status: "completed",
          };

          // Save progress - with retry logic for database persistence
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

          // Persist progress with retry - this is critical to not lose work
          await retryWithBackoff(
            async () => {
              onUpdateBook(book.id, {
                outline: newOutline,
                tonalAnchors,
                currentChapterIndex: chIdx,
                currentSubsectionIndex: subIdx + 1,
                wordCount: currentBook.wordCount,
              });
            },
            MAX_RETRIES,
            (attempt) => {
              toast.warning(`Saving progress failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`);
            }
          );

        } catch (err) {
          const message = err instanceof Error ? err.message : "Generation failed";
          setState(s => ({ ...s, phase: "error", error: message }));
          toast.error(`Generation stopped: ${message}. No chapters were skipped.`);
          
          // Save progress before stopping - try multiple times to ensure we don't lose position
          try {
            await retryWithBackoff(
              async () => {
                onUpdateBook(book.id, {
                  status: "paused",
                  currentChapterIndex: chIdx,
                  currentSubsectionIndex: subIdx,
                });
              },
              MAX_RETRIES
            );
          } catch (saveErr) {
            console.error("Failed to save pause state:", saveErr);
            toast.error("Could not save progress. Please check your connection and try resuming.");
          }
          
          // CRITICAL: Return immediately - never continue to next chapter/subsection
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
        onUpdateBook(book.id, { outline });
      }
    }

    // All done
    if (!abortRef.current) {
      setState(s => ({ ...s, phase: "completed" }));
      onUpdateBook(book.id, { status: "completed" });
      toast.success("Book generation completed!");
    }
  }, [book, generateOutline, generateCharacters, streamContent, generateImage, summarizeContent, onUpdateBook]);

  const pauseGeneration = useCallback(() => {
    pauseRef.current = true;
    setState(s => ({ ...s, phase: "paused" }));
    onUpdateBook(book.id, { status: "paused" });
  }, [book.id, onUpdateBook]);

  const resumeGeneration = useCallback(() => {
    pauseRef.current = false;
    startGeneration();
  }, [startGeneration]);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setState(s => ({ ...s, phase: "idle" }));
    onUpdateBook(book.id, { status: "paused" });
  }, [book.id, onUpdateBook]);

  return {
    state,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
    generateOutline,
    generateCharacters,
  };
}
