import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Layers } from "lucide-react";
import { Book, BOOK_TYPE_INFO, BookCategory, BOOK_CATEGORIES } from "@/types/book";
import { Button } from "@/components/ui/button";

interface SeriesPickerProps {
  open: boolean;
  books: Book[];
  onClose: () => void;
  onPick: (sourceBook: Book) => void;
}

/**
 * Modal: pick an existing novel or serialized book to continue from.
 * Grouped by category similar to the Shelves view.
 */
export function SeriesPicker({ open, books, onClose, onPick }: SeriesPickerProps) {
  const [activeCat, setActiveCat] = useState<BookCategory | "all">("all");

  // Eligible source books: any novel or fiction-serial, completed or not
  const eligible = useMemo(
    () =>
      books.filter((b) => {
        if (b.bookType !== "novel" && b.bookType !== "fiction-serial") return false;
        if (activeCat === "all") return true;
        return BOOK_TYPE_INFO[b.bookType].category === activeCat;
      }),
    [books, activeCat],
  );

  const grouped = useMemo(() => {
    const map: Record<string, Book[]> = {};
    for (const b of eligible) {
      const key = b.seriesId ? `series:${b.seriesId}` : `solo:${b.id}`;
      (map[key] ||= []).push(b);
    }
    return Object.values(map).sort((a, b) => b.length - a.length);
  }, [eligible]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="font-serif text-base font-semibold">Continue from a book</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="px-5 py-3 border-b border-border/50 flex flex-wrap gap-1.5">
            {(["all", ...Object.keys(BOOK_CATEGORIES)] as (BookCategory | "all")[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`text-[11px] py-1 px-3 rounded-full transition-all ${
                  activeCat === cat
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
                }`}
              >
                {cat === "all" ? "All" : BOOK_CATEGORIES[cat as BookCategory].label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {eligible.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                You don't have any novels or series yet to continue from.
              </div>
            ) : (
              <div className="space-y-6">
                {grouped.map((group) => {
                  const head = group[0];
                  const info = BOOK_TYPE_INFO[head.bookType];
                  return (
                    <div key={head.id}>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                        {info.icon} {info.label}
                        {group.length > 1 ? ` · ${group.length} books in series` : ""}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {group.map((book) => (
                          <button
                            key={book.id}
                            onClick={() => onPick(book)}
                            className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-start gap-2">
                              {book.coverUrl ? (
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  className="w-10 h-14 object-cover rounded-sm flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-14 bg-muted rounded-sm flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs leading-tight line-clamp-2">{book.title}</div>
                                <div className="text-[10px] text-muted-foreground mt-1 capitalize">
                                  {book.status.replace("_", " ")}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border/50 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}