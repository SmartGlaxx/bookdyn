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
  onNavigateToChapter?: (chapterIdx: number) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

interface SearchResult {
  chapterIdx: number;
  subIdx: number;
  chapterTitle: string;
  subsectionTitle: string;
  snippet: string;
  matchStartInSnippet: number;
  matchEndInSnippet: number;
  globalContentStart: number;
  globalContentEnd: number;
}

interface HistoryEntry {
  outline: any;
  wordCount: number;
  description: string;
}

const MAX_HISTORY = 5;
const SNIPPET_RADIUS = 80;

/**
 * Extract a snippet around a match without breaking words.
 */
function extractSnippet(content: string, matchStart: number, matchEnd: number): { snippet: string; matchStartInSnippet: number; matchEndInSnippet: number } {
  let snippetStart = Math.max(0, matchStart - SNIPPET_RADIUS);
  let snippetEnd = Math.min(content.length, matchEnd + SNIPPET_RADIUS);

  // Don't break words: advance snippetStart to next space if we're mid-word
  if (snippetStart > 0) {
    const nextSpace = content.indexOf(" ", snippetStart);
    if (nextSpace !== -1 && nextSpace < matchStart) {
      snippetStart = nextSpace + 1;
    }
  }
  // Move snippetEnd to previous space if mid-word
  if (snippetEnd < content.length) {
    const prevSpace = content.lastIndexOf(" ", snippetEnd);
    if (prevSpace !== -1 && prevSpace > matchEnd) {
      snippetEnd = prevSpace;
    }
  }

  const snippet =
    (snippetStart > 0 ? "…" : "") +
    content.substring(snippetStart, snippetEnd).trim() +
    (snippetEnd < content.length ? "…" : "");

  const prefix = snippetStart > 0 ? "…" : "";
  const offsetFromSnippetStart = matchStart - snippetStart;
  const adjustedStart = prefix.length + content.substring(snippetStart, matchStart).trimStart().length;

  // Recalculate precisely
  const beforeMatch = (prefix + content.substring(snippetStart, matchStart)).replace(/^\s+/, "");
  const matchText = content.substring(matchStart, matchEnd);

  return {
    snippet,
    matchStartInSnippet: beforeMatch.length,
    matchEndInSnippet: beforeMatch.length + matchText.length,
  };
}

export function BookSearchPanel({ book, onUpdateBook, onClose, onNavigateToChapter, searchQuery, onSearchQueryChange }: BookSearchPanelProps) {
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
    const entry = history[nextIdx + 1] || history[nextIdx];
    if (history[nextIdx + 1]) {
      onUpdateBook(book.id, { outline: history[nextIdx + 1].outline, wordCount: history[nextIdx + 1].wordCount });
      setHistoryIndex(nextIdx + 1);
    } else {
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

          const { snippet, matchStartInSnippet, matchEndInSnippet } = extractSnippet(content, idx, idx + query.length);

          found.push({
            chapterIdx: ci,
            subIdx: si,
            chapterTitle: ch.title,
            subsectionTitle: sub.title,
            snippet,
            matchStartInSnippet,
            matchEndInSnippet,
            globalContentStart: idx,
            globalContentEnd: idx + query.length,
          });

          searchPos = idx + 1;
        }
      }
    }
    return found;
  }, [searchQuery, book.outline]);

  // Navigate to chapter when clicking a result
  const handleResultClick = useCallback((idx: number) => {
    setActiveResultIdx(idx);
    const r = results[idx];
    if (r && onNavigateToChapter) {
      onNavigateToChapter(r.chapterIdx);
    }
  }, [results, onNavigateToChapter]);

  const recalcWordCount = (outline: any) => {
    return outline.chapters.reduce((acc: number, ch: any) => {
      return acc + ch.subsections.reduce((sAcc: number, sub: any) => {
        return sAcc + (sub.content?.split(/\s+/).filter(Boolean).length || 0);
      }, 0);
    }, 0);
  };

  const applyReplace = useCallback((resultIndex: number) => {
    if (!book.outline) return;
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

    // Replace the matched region with edited text
    const content = sub.content;
    // Use a wider window around the match for the editable snippet
    let editStart = Math.max(0, r.globalContentStart - SNIPPET_RADIUS);
    let editEnd = Math.min(content.length, r.globalContentEnd + SNIPPET_RADIUS);
    // Snap to word boundaries
    if (editStart > 0) {
      const ns = content.indexOf(" ", editStart);
      if (ns !== -1 && ns < r.globalContentStart) editStart = ns + 1;
    }
    if (editEnd < content.length) {
      const ps = content.lastIndexOf(" ", editEnd);
      if (ps !== -1 && ps > r.globalContentEnd) editEnd = ps;
    }

    const before = content.substring(0, editStart);
    const after = content.substring(editEnd);
    const cleaned = sanitizeText(editText.trim()).substring(0, 5000);
    sub.content = (before + cleaned + after).replace(/\n{3,}/g, "\n\n");

    const wordCount = recalcWordCount(updatedOutline);
    onUpdateBook(book.id, { outline: updatedOutline, wordCount });
    setEditingResult(null);
    toast.success("Text updated");
  }, [book, results, editText, onUpdateBook, pushHistory]);

  const highlightMatch = (text: string, start: number, end: number) => {
    return (
      <span>
        {text.substring(0, start)}
        <mark className="bg-warning/40 text-foreground rounded-sm px-0.5">{text.substring(start, end)}</mark>
        {text.substring(end)}
      </span>
    );
  };

  const navigateResult = (direction: "next" | "prev") => {
    if (results.length === 0) return;
    const newIdx = direction === "next"
      ? (activeResultIdx + 1) % results.length
      : (activeResultIdx - 1 + results.length) % results.length;
    setActiveResultIdx(newIdx);
    const r = results[newIdx];
    if (r && onNavigateToChapter) {
      onNavigateToChapter(r.chapterIdx);
    }
  };

  // Group results by chapter for display
  const groupedResults = useMemo(() => {
    const groups: { chapterIdx: number; chapterTitle: string; results: { result: SearchResult; globalIdx: number }[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    results.forEach((r, idx) => {
      if (!currentGroup || currentGroup.chapterIdx !== r.chapterIdx) {
        currentGroup = { chapterIdx: r.chapterIdx, chapterTitle: r.chapterTitle, results: [] };
        groups.push(currentGroup);
      }
      currentGroup.results.push({ result: r, globalIdx: idx });
    });

    return groups;
  }, [results]);

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
            onChange={(e) => { onSearchQueryChange(e.target.value); setActiveResultIdx(0); }}
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

      {/* Results grouped by chapter */}
      {searchQuery.trim() && (
        <>
          <Separator />
          <div className="max-h-80 overflow-y-auto">
            <div className="p-2 space-y-1">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
              ) : (
                groupedResults.map((group) => (
                  <div key={group.chapterIdx}>
                    {/* Chapter header */}
                    <div className="px-2 pt-2 pb-1 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">Ch. {group.chapterIdx + 1}</Badge>
                      <span className="text-xs font-medium text-muted-foreground truncate">{group.chapterTitle}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{group.results.length} match{group.results.length !== 1 ? "es" : ""}</span>
                    </div>
                    {group.results.map(({ result: r, globalIdx: idx }) => (
                      <div
                        key={`${r.chapterIdx}-${r.subIdx}-${r.globalContentStart}`}
                        className={cn(
                          "rounded-lg p-2 cursor-pointer transition-colors text-sm ml-2",
                          idx === activeResultIdx ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted"
                        )}
                        onClick={() => handleResultClick(idx)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-muted-foreground truncate">{r.subsectionTitle}</span>
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
                                setEditText(r.snippet.replace(/^…/, "").replace(/…$/, ""));
                              }
                            }}
                            title="Edit this text"
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
                            {highlightMatch(r.snippet, r.matchStartInSnippet, r.matchEndInSnippet)}
                          </p>
                        )}
                      </div>
                    ))}
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
