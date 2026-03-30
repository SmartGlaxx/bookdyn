import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Replace, X, ChevronDown, ChevronUp, Undo2, Redo2, Check, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Book } from "@/types/book";
import { sanitizeText } from "@/lib/sanitize";
import { toast } from "sonner";

interface BookSearchPanelProps {
  book: Book;
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  onClose: () => void;
}

interface SearchResult {
  chapterIdx: number;
  subIdx: number;
  chapterTitle: string;
  subsectionTitle: string;
  sentence: string;
  matchStart: number; // position within sentence
  matchEnd: number;
  globalContentStart: number; // position within subsection content
  globalContentEnd: number;
}

interface HistoryEntry {
  outline: any;
  wordCount: number;
  description: string;
}

const MAX_HISTORY = 5;

export function BookSearchPanel({ book, onUpdateBook, onClose }: BookSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [editingResult, setEditingResult] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const pushHistory = useCallback((description: string) => {
    if (!book.outline) return;
    const entry: HistoryEntry = {
      outline: JSON.parse(JSON.stringify(book.outline)),
      wordCount: book.wordCount,
      description,
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [book.outline, book.wordCount, historyIndex]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const entry = history[historyIndex];
    // Save current state for redo before reverting
    if (historyIndex === history.length - 1 && book.outline) {
      setHistory(prev => [...prev, {
        outline: JSON.parse(JSON.stringify(book.outline)),
        wordCount: book.wordCount,
        description: "Current state",
      }]);
    }
    onUpdateBook(book.id, { outline: entry.outline, wordCount: entry.wordCount });
    setHistoryIndex(prev => prev - 1);
    toast.success("Undone: " + entry.description);
  }, [canUndo, history, historyIndex, book, onUpdateBook]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const nextIdx = historyIndex + 1;
    // If we're at -1, the "redo" target is index 0's next
    const entry = history[nextIdx + 1] || history[nextIdx];
    if (history[nextIdx + 1]) {
      onUpdateBook(book.id, { outline: history[nextIdx + 1].outline, wordCount: history[nextIdx + 1].wordCount });
      setHistoryIndex(nextIdx + 1);
    } else {
      // Edge: redo the last saved state
      const target = history[history.length - 1];
      onUpdateBook(book.id, { outline: target.outline, wordCount: target.wordCount });
      setHistoryIndex(history.length - 1);
    }
    toast.success("Redone");
  }, [canRedo, history, historyIndex, book.id, onUpdateBook]);

  // Search logic
  const results = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim() || !book.outline) return [];
    const query = searchQuery.toLowerCase();
    const found: SearchResult[] = [];
    const chapters = book.outline.chapters || [];

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      for (let si = 0; si < ch.subsections.length; si++) {
        const sub = ch.subsections[si];
        if (!sub.content) continue;
        const content = sub.content;
        const contentLower = content.toLowerCase();
        let searchPos = 0;

        while (searchPos < contentLower.length) {
          const idx = contentLower.indexOf(query, searchPos);
          if (idx === -1) break;

          // Extract surrounding sentence
          const sentenceStart = Math.max(0, content.lastIndexOf(".", idx - 1) + 1);
          const sentenceEnd = content.indexOf(".", idx + query.length);
          const sentence = content.substring(
            sentenceStart,
            sentenceEnd !== -1 ? sentenceEnd + 1 : Math.min(content.length, idx + query.length + 80)
          ).trim();

          found.push({
            chapterIdx: ci,
            subIdx: si,
            chapterTitle: ch.title,
            subsectionTitle: sub.title,
            sentence,
            matchStart: idx - sentenceStart,
            matchEnd: idx - sentenceStart + query.length,
            globalContentStart: idx,
            globalContentEnd: idx + query.length,
          });

          searchPos = idx + 1;
        }
      }
    }
    return found;
  }, [searchQuery, book.outline]);

  const recalcWordCount = (outline: any) => {
    return outline.chapters.reduce((acc: number, ch: any) => {
      return acc + ch.subsections.reduce((sAcc: number, sub: any) => {
        return sAcc + (sub.content?.split(/\s+/).filter(Boolean).length || 0);
      }, 0);
    }, 0);
  };

  const applyReplace = useCallback((resultIndex: number) => {
    if (!book.outline || !replaceText.length === undefined) return;
    const r = results[resultIndex];
    if (!r) return;

    pushHistory("Replace occurrence");

    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    const sub = updatedOutline.chapters[r.chapterIdx].subsections[r.subIdx];
    const before = sub.content.substring(0, r.globalContentStart);
    const after = sub.content.substring(r.globalContentEnd);
    sub.content = before + replaceText + after;

    const wordCount = recalcWordCount(updatedOutline);
    onUpdateBook(book.id, { outline: updatedOutline, wordCount });
    toast.success("Replaced 1 occurrence");
  }, [book, results, replaceText, onUpdateBook, pushHistory]);

  const applyReplaceAll = useCallback(() => {
    if (!book.outline || !searchQuery.trim()) return;

    pushHistory("Replace all occurrences");

    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    let count = 0;

    for (const ch of updatedOutline.chapters) {
      for (const sub of ch.subsections) {
        if (!sub.content) continue;
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = sub.content.match(regex);
        if (matches) {
          count += matches.length;
          sub.content = sub.content.replace(regex, replaceText);
        }
      }
    }

    const wordCount = recalcWordCount(updatedOutline);
    onUpdateBook(book.id, { outline: updatedOutline, wordCount });
    toast.success(`Replaced ${count} occurrence${count !== 1 ? "s" : ""}`);
  }, [book, searchQuery, replaceText, onUpdateBook, pushHistory]);

  const handleEditSave = useCallback((resultIndex: number) => {
    if (!book.outline) return;
    const r = results[resultIndex];
    if (!r) return;

    pushHistory("Edit from search");

    const updatedOutline = JSON.parse(JSON.stringify(book.outline));
    const sub = updatedOutline.chapters[r.chapterIdx].subsections[r.subIdx];

    // Replace the matched sentence region with edited text
    const content = sub.content;
    const sentenceStart = Math.max(0, content.lastIndexOf(".", r.globalContentStart - 1) + 1);
    const sentenceEnd = content.indexOf(".", r.globalContentEnd);
    const actualEnd = sentenceEnd !== -1 ? sentenceEnd + 1 : Math.min(content.length, r.globalContentEnd + 80);

    const before = content.substring(0, sentenceStart);
    const after = content.substring(actualEnd);
    const cleaned = sanitizeText(editText.trim()).substring(0, 5000);
    sub.content = (before + cleaned + after).replace(/\n{3,}/g, "\n\n");

    const wordCount = recalcWordCount(updatedOutline);
    onUpdateBook(book.id, { outline: updatedOutline, wordCount });
    setEditingResult(null);
    toast.success("Sentence updated");
  }, [book, results, editText, onUpdateBook, pushHistory]);

  const highlightMatch = (sentence: string, start: number, end: number) => {
    return (
      <span>
        {sentence.substring(0, start)}
        <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">{sentence.substring(start, end)}</mark>
        {sentence.substring(end)}
      </span>
    );
  };

  const navigateResult = (direction: "next" | "prev") => {
    if (results.length === 0) return;
    setActiveResultIdx(prev => {
      if (direction === "next") return (prev + 1) % results.length;
      return (prev - 1 + results.length) % results.length;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border rounded-xl bg-card shadow-lg overflow-hidden"
    >
      {/* Search bar */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveResultIdx(0); }}
            placeholder="Search entire book..."
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") navigateResult(e.shiftKey ? "prev" : "next");
              if (e.key === "Escape") onClose();
            }}
          />
          <div className="flex items-center gap-1 shrink-0">
            {results.length > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activeResultIdx + 1}/{results.length}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateResult("prev")} disabled={results.length === 0}>
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateResult("next")} disabled={results.length === 0}>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant={showReplace ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowReplace(!showReplace)}
            title="Find & Replace"
          >
            <Replace className="w-3.5 h-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndo} disabled={!canUndo} title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRedo} disabled={!canRedo} title="Redo">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Replace row */}
        <AnimatePresence>
          {showReplace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-1">
                <Replace className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace with..."
                  className="h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => applyReplace(activeResultIdx)}
                  disabled={results.length === 0}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={applyReplaceAll}
                  disabled={results.length === 0}
                >
                  Replace All
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      {searchQuery.trim() && (
        <>
          <Separator />
          <ScrollArea className="max-h-72">
            <div className="p-2 space-y-1">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
              ) : (
                results.map((r, idx) => (
                  <div
                    key={`${r.chapterIdx}-${r.subIdx}-${r.globalContentStart}`}
                    className={cn(
                      "rounded-lg p-2 cursor-pointer transition-colors text-sm",
                      idx === activeResultIdx ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted"
                    )}
                    onClick={() => setActiveResultIdx(idx)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Ch. {r.chapterIdx + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{r.subsectionTitle}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingResult === idx) {
                            setEditingResult(null);
                          } else {
                            setEditingResult(idx);
                            setEditText(r.sentence);
                          }
                        }}
                        title="Edit this sentence"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                    {editingResult === idx ? (
                      <div className="space-y-2 mt-1">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingResult(null);
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEditSave(idx);
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <Button variant="hero" size="sm" className="h-6 text-xs" onClick={() => handleEditSave(idx)}>
                            <Check className="w-3 h-3" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingResult(null)}>
                            Cancel
                          </Button>
                          <span className="text-[10px] text-muted-foreground ml-1">⌘+Enter to save</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-foreground/80">
                        {highlightMatch(r.sentence, r.matchStart, r.matchEnd)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </motion.div>
  );
}
