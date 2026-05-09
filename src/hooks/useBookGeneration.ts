import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Book, BookOutline, Chapter, Subsection, CharacterReference, getIELTSBandForAudience, AutomationLevel } from "@/types/book";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000;

const MAX_CONTEXT_CHARS = 2500;
const MAX_SUMMARY_CHARS = 1200;
const MAX_ANCHOR_CHARS = 600;

// ── Continuity director helpers ────────────────────────────────────
async function callUpdateContinuity(payload: Record<string, unknown>): Promise<{ characterLedger?: any; plotLedger?: any } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("update-continuity", {
      body: payload,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      console.warn("[continuity] edge fn error:", error);
      return null;
    }
    return data as any;
  } catch (err) {
    console.warn("[continuity] invoke failed:", err);
    return null;
  }
}

async function refetchLedgers(bookId: string): Promise<{ characterLedger?: any; plotLedger?: any }> {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("character_ledger, plot_ledger")
      .eq("id", bookId)
      .maybeSingle();
    if (error || !data) return {};
    return {
      characterLedger: (data as any).character_ledger || { characters: [] },
      plotLedger: (data as any).plot_ledger || { todos: [], dones: [] },
    };
  } catch {
    return {};
  }
}

function trimContext(text?: string, maxChars: number = MAX_CONTEXT_CHARS): string | undefined {
  if (!text) return undefined;
  return text.length <= maxChars ? text : text.slice(-maxChars);
}

function getGenerationChapterSlice(bookData: Book, chapterIndex: number) {
  const chapter = bookData.outline?.chapters?.[chapterIndex];
  if (!chapter) return [];

  return [{
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    summary: trimContext(chapter.summary, MAX_SUMMARY_CHARS),
    subsections: chapter.subsections.map((subsection) => ({
      title: subsection.title,
      goal: subsection.goal,
      imageOpportunity: subsection.imageOpportunity,
      status: subsection.status,
    })),
  }];
}

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
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
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
  | "awaiting-approval"
  | "error";

export interface ApprovalRequest {
  type: "outline" | "chapter" | "section";
  title: string;
  chapterIndex?: number;
  subsectionIndex?: number;
}

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
  approvalRequest: ApprovalRequest | null;
}

interface UseBookGenerationOptions {
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  onActivityRecorded?: (words: number, credits: number) => void;
}

export function useBookGeneration(book: Book, options: UseBookGenerationOptions) {
  const { onUpdateBook, onActivityRecorded } = options;
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
    approvalRequest: null,
  });
  
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const approvalRef = useRef<(() => void) | null>(null);
  const approvalResolveRef = useRef<(() => void) | null>(null);

  const automationLevel: AutomationLevel = book.controls?.automationLevel || "guided";

  // Wait for user approval
  const waitForApproval = useCallback((request: ApprovalRequest): Promise<void> => {
    return new Promise((resolve) => {
      setState(s => ({ ...s, phase: "awaiting-approval", approvalRequest: request }));
      approvalResolveRef.current = resolve;
    });
  }, []);

  // User approves the current gate
  const approveAndContinue = useCallback(() => {
    setState(s => ({ ...s, phase: "writing", approvalRequest: null }));
    if (approvalResolveRef.current) {
      approvalResolveRef.current();
      approvalResolveRef.current = null;
    }
  }, []);

  const generateOutline = useCallback(async (): Promise<BookOutline | null> => {
    setState(s => ({ ...s, phase: "generating-outline", error: null }));
    const ieltsBand = getIELTSBandForAudience(book.audience);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-outline", {
        body: { book, ieltsBand },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const outline = data.outline as BookOutline;
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

      const updatedOutline = { ...outline, characters, visualStyleGuide };
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

    const ieltsBand = getIELTSBandForAudience(bookData.audience);
    const totalSubsections = bookData.outline?.chapters?.reduce(
      (sum: number, ch: any) => sum + (ch.subsections?.length || 0), 0
    ) || 1;
    const targetWordCount = bookData.controls?.structureControls?.targetWordCount || 50000;
    const targetWordsPerSubsection = Math.round(targetWordCount / totalSubsections);
    const clampedWordsPerSubsection = Math.max(300, Math.min(1200, targetWordsPerSubsection));

    // Mode-based word limits
    let effectiveWordsPerSubsection: number;
    if (automationLevel === "guided") {
      // Guided: 2-3 sentences only (~50-80 words)
      effectiveWordsPerSubsection = 80;
    } else if (automationLevel === "assisted") {
      // Assisted: 1 paragraph (~150-250 words)
      effectiveWordsPerSubsection = Math.min(250, clampedWordsPerSubsection);
    } else {
      effectiveWordsPerSubsection = clampedWordsPerSubsection;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error("Session expired. Please refresh the page and try again.");
    }

    const strippedBook = {
      id: bookData.id,
      title: bookData.title,
      subtitle: bookData.subtitle,
      bookType: bookData.bookType,
      theme: bookData.theme,
      genre: bookData.genre,
      language: bookData.language || "English",
      audience: bookData.audience,
      pov: bookData.pov,
      toneProfile: bookData.toneProfile,
      controls: bookData.controls,
      outline: {
        chapters: getGenerationChapterSlice(bookData, chapterIndex),
      },
    };

    const payload = {
      book: strippedBook,
      chapterIndex: 0,
      subsectionIndex,
      previousSummary: trimContext(previousSummary, MAX_SUMMARY_CHARS),
      previousRawContent: trimContext(previousRawContent),
      tonalAnchors: (bookData.tonalAnchors || []).slice(-2).map((anchor) => trimContext(anchor, MAX_ANCHOR_CHARS) || "").filter(Boolean),
      ieltsBand,
      targetWordsPerSubsection: effectiveWordsPerSubsection,
      teaserStyle: bookData.controls?.teaserStyle || "none",
      automationLevel,
      characterLedger: bookData.characterLedger || { characters: [] },
      plotLedger: bookData.plotLedger || { todos: [], dones: [] },
    };

    const payloadJson = JSON.stringify(payload);
    const payloadSize = new TextEncoder().encode(payloadJson).length;
    console.log(`[BookGen] Payload size: ${(payloadSize / 1024).toFixed(1)}KB`);

    if (payloadSize > 180_000) {
      console.warn(`[BookGen] Payload dangerously large, stripping further...`);
      payload.previousRawContent = payload.previousRawContent?.slice(-500);
      payload.tonalAnchors = payload.tonalAnchors?.slice(-1).map(a => a?.slice(0, 200) || "");
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || `Error: ${response.status}`;
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
          buffer = line + "\n" + buffer;
          break;
        }
      }

      if (abortRef.current) break;
    }

    console.log(`[BookGen] Content received: ${fullContent.split(/\s+/).length} words`);
    return fullContent;
  }, [automationLevel]);

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
      setState(s => ({ ...s, currentImage: data.imageUrl }));
      return data.imageUrl;
    } catch (err) {
      console.error("Image generation failed:", err);
      return null;
    }
  }, [book]);

  const summarizeContent = useCallback(async (
    content: string,
    type: "subsection" | "chapter"
  ): Promise<string> => {
    setState(s => ({ ...s, phase: "summarizing" }));

    const trimmed = (content || "").trim();
    if (!trimmed) {
      console.warn("[summarizeContent] Skipped: empty content");
      return "";
    }

    try {
      const { data, error } = await supabase.functions.invoke("summarize-content", {
        body: { content: trimmed, type },
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

    console.log("[BookGen] Starting generation:", book.title, "| Mode:", automationLevel);

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

      // Approval gate after outline (all modes except auto-draft)
      if (automationLevel !== "auto-draft") {
        await waitForApproval({
          type: "outline",
          title: `${outline.chapters.length} chapters planned`,
        });
        if (abortRef.current) return;
      }
    }

    // Phase 1.5: Generate characters
    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
    if (!outline.characters || outline.characters.length === 0) {
      characters = await generateCharacters(outline);
      visualStyleGuide = outline.visualStyleGuide || "";
      outline = { ...outline, characters, visualStyleGuide };
      currentBook = { ...currentBook, outline };
    } else {
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
            }
          );

          chapterContent += content + "\n\n";
          const wordCount = content.split(/\s+/).length;

          // Record activity for streak tracking
          onActivityRecorded?.(wordCount, Math.ceil(wordCount / 1000));

          // Image generation
          let imageUrl: string | null = null;
          if (isChildrensBook || (book.controls.imageGeneration && subsectionCounter % 3 === 0)) {
            try {
              imageUrl = await retryWithBackoff(
                () => generateImage(content, subsection.imageOpportunity, characters, visualStyleGuide),
                2,
              );
            } catch (imgErr) {
              console.warn("Image generation failed after retries:", imgErr);
            }
          }

          // Summarize
          let summary = "";
          try {
            summary = await retryWithBackoff(
              () => summarizeContent(content, "subsection"),
              MAX_RETRIES,
            );
          } catch (sumErr) {
            summary = content.slice(0, 500) + "...";
          }
          
          previousSummary = summary;
          const words = content.split(/\s+/);
          previousRawContent = words.slice(-Math.min(1000, words.length)).join(" ");

          // Tonal anchor extraction
          if (Math.random() < 0.3 && content.length > 200) {
            const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100);
            if (paragraphs.length > 0) {
              const randomPara = paragraphs[Math.floor(Math.random() * paragraphs.length)];
              tonalAnchors = [...tonalAnchors.slice(-2), randomPara];
            }
          }

          // Strip any leftover meta-labels the model might still emit
          const cleanContent = content
            .replace(/\[\/?(?:TEASER|HOOK|SCENE|BEAT|NOTE)\]/gi, "")
            .replace(/^\s*(?:Hook|Teaser|Scene|Beat|Note)\s*:\s*/gim, "")
            .trim();

          // Update subsection
          updatedSubsections[subIdx] = {
            ...subsection,
            content: cleanContent,
            summary,
            teaser: undefined,
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
            wordCount: (currentBook.wordCount || 0) + wordCount,
          };

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
          );

          // APPROVAL GATES based on automation level
          if (automationLevel === "guided") {
            // Guided: approval after every section
            await waitForApproval({
              type: "section",
              title: subsection.title,
              chapterIndex: chIdx,
              subsectionIndex: subIdx,
            });
            if (abortRef.current) return;
          } else if (automationLevel === "assisted") {
            // Assisted: approval every 2-3 sections (batch)
            if ((subIdx + 1) % 2 === 0 || subIdx === chapter.subsections.length - 1) {
              await waitForApproval({
                type: "section",
                title: `Sections ${Math.max(1, subIdx)}–${subIdx + 1} of ${chapter.title}`,
                chapterIndex: chIdx,
                subsectionIndex: subIdx,
              });
              if (abortRef.current) return;
            }
          }
          // semi-auto: waits at chapter level (below)
          // auto-draft: no waiting

        } catch (err) {
          const message = err instanceof Error ? err.message : "Generation failed";
          setState(s => ({ ...s, phase: "error", error: message }));
          toast.error(`Generation stopped: ${message}. No chapters were skipped.`);
          
          try {
            await retryWithBackoff(async () => {
              onUpdateBook(book.id, {
                status: "paused",
                currentChapterIndex: chIdx,
                currentSubsectionIndex: subIdx,
              });
            }, MAX_RETRIES);
          } catch (saveErr) {
            console.error("Failed to save pause state:", saveErr);
          }
          return;
        }
      }

      // Chapter completed
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

        // Semi-auto: approval after each chapter
        if (automationLevel === "semi-auto" && chIdx < outline.chapters.length - 1) {
          await waitForApproval({
            type: "chapter",
            title: chapter.title,
            chapterIndex: chIdx,
          });
          if (abortRef.current) return;
        }
      }
    }

    // All done
    if (!abortRef.current) {
      setState(s => ({ ...s, phase: "completed" }));
      onUpdateBook(book.id, { status: "completed" });
      toast.success("Book generation completed!");
    }
  }, [book, automationLevel, generateOutline, generateCharacters, streamContent, generateImage, summarizeContent, onUpdateBook, waitForApproval, onActivityRecorded]);

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
    setState(s => ({ ...s, phase: "idle", approvalRequest: null }));
    onUpdateBook(book.id, { status: "paused" });
  }, [book.id, onUpdateBook]);

  // Generate only outline (co-pilot: separate action)
  const generateOutlineOnly = useCallback(async () => {
    abortRef.current = false;
    setState(s => ({ ...s, phase: "planning" }));
    onUpdateBook(book.id, { status: "planning" });
    
    const outline = await generateOutline();
    if (outline) {
      // Also generate characters
      const isChildrensBook = book.bookType === "children" || book.bookType === "comic";
      if (!outline.characters || outline.characters.length === 0) {
        await generateCharacters(outline);
      }
      setState(s => ({ ...s, phase: "idle" }));
      toast.success("Outline generated! Review and start writing chapter by chapter.");
    }
  }, [book, generateOutline, generateCharacters, onUpdateBook]);

  // Generate a single chapter (co-pilot)
  const generateChapter = useCallback(async (chapterIndex: number) => {
    abortRef.current = false;
    pauseRef.current = false;

    let currentBook = book;
    let outline = book.outline;
    if (!outline) return;

    const characters = outline.characters || [];
    const visualStyleGuide = outline.visualStyleGuide || "";
    const isChildrensBook = book.bookType === "children" || book.bookType === "comic";

    onUpdateBook(book.id, { status: "writing" });

    const chapter = outline.chapters[chapterIndex];
    if (!chapter) return;

    const updatedSubsections: Subsection[] = [...chapter.subsections];
    let chapterContent = "";
    let previousSummary = "";
    let previousRawContent = "";
    let tonalAnchors: string[] = [...(book.tonalAnchors || [])];
    let subsectionCounter = 0;

    for (let subIdx = 0; subIdx < chapter.subsections.length; subIdx++) {
      if (abortRef.current) break;
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (abortRef.current) break;
      }

      const subsection = chapter.subsections[subIdx];
      if (subsection.status === "completed") {
        chapterContent += (subsection.content || "") + "\n\n";
        previousSummary = subsection.summary || "";
        previousRawContent = subsection.content || "";
        continue;
      }
      subsectionCounter++;

      try {
        const content = await retryWithBackoff(
          () => streamContent(
            { ...currentBook, outline, tonalAnchors },
            chapterIndex,
            subIdx,
            previousSummary,
            previousRawContent
          ),
          MAX_RETRIES,
        );

        chapterContent += content + "\n\n";
        const wordCount = content.split(/\s+/).length;
        onActivityRecorded?.(wordCount, Math.ceil(wordCount / 1000));

        let imageUrl: string | null = null;
        if (isChildrensBook || (book.controls.imageGeneration && subsectionCounter % 3 === 0)) {
          try {
            imageUrl = await retryWithBackoff(
              () => generateImage(content, subsection.imageOpportunity, characters, visualStyleGuide),
              2,
            );
          } catch {}
        }

        let summary = "";
        try {
          summary = await retryWithBackoff(() => summarizeContent(content, "subsection"), MAX_RETRIES);
        } catch { summary = content.slice(0, 500) + "..."; }

        previousSummary = summary;
        const words = content.split(/\s+/);
        previousRawContent = words.slice(-Math.min(1000, words.length)).join(" ");

        if (Math.random() < 0.3 && content.length > 200) {
          const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100);
          if (paragraphs.length > 0) {
            tonalAnchors = [...tonalAnchors.slice(-2), paragraphs[Math.floor(Math.random() * paragraphs.length)]];
          }
        }

        const cleanContent = content
          .replace(/\[\/?(?:TEASER|HOOK|SCENE|BEAT|NOTE)\]/gi, "")
          .replace(/^\s*(?:Hook|Teaser|Scene|Beat|Note)\s*:\s*/gim, "")
          .trim();

        updatedSubsections[subIdx] = {
          ...subsection,
          content: cleanContent,
          summary,
          teaser: undefined,
          imageUrl: imageUrl || undefined,
          status: "completed",
        };

        const updatedChapters = [...outline.chapters];
        updatedChapters[chapterIndex] = {
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
          currentChapterIndex: chapterIndex,
          currentSubsectionIndex: subIdx + 1,
          wordCount: (currentBook.wordCount || 0) + wordCount,
        };

        onUpdateBook(book.id, {
          outline: newOutline,
          tonalAnchors,
          currentChapterIndex: chapterIndex,
          currentSubsectionIndex: subIdx + 1,
          wordCount: currentBook.wordCount,
        });

        // In guided mode, pause after each section
        if (automationLevel === "guided") {
          await waitForApproval({
            type: "section",
            title: subsection.title,
            chapterIndex,
            subsectionIndex: subIdx,
          });
          if (abortRef.current) return;
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        setState(s => ({ ...s, phase: "error", error: message }));
        toast.error(`Generation stopped: ${message}`);
        onUpdateBook(book.id, { status: "paused", currentChapterIndex: chapterIndex, currentSubsectionIndex: subIdx });
        return;
      }
    }

    // Chapter complete
    if (!abortRef.current) {
      const chapterSummary = await summarizeContent(chapterContent, "chapter");
      const updatedChapters = [...outline.chapters];
      updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], summary: chapterSummary, status: "completed" };
      outline = { ...outline, chapters: updatedChapters };
      onUpdateBook(book.id, { outline, status: book.status });
      setState(s => ({ ...s, phase: "idle" }));
      toast.success(`Chapter "${chapter.title}" completed!`);
    }
  }, [book, automationLevel, streamContent, generateImage, summarizeContent, onUpdateBook, waitForApproval, onActivityRecorded]);

  return {
    state,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    stopGeneration,
    generateOutline: generateOutlineOnly,
    generateCharacters,
    generateChapter,
    approveAndContinue,
  };
}
