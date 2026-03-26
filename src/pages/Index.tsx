import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BookOpen, Sparkles, ArrowUpDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import BookCard from "@/components/BookCard";
import CreateBookEngine from "@/components/CreateBookEngine";
import BookDetailView from "@/components/BookDetailView";
import { useBooks } from "@/hooks/useBooks";
import { Book, CreateBookInput, BOOK_CATEGORIES, BOOK_TYPE_INFO, BookCategory, BookType } from "@/types/book";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const BOOKS_PER_PAGE = 12;

type SortOption = "updated" | "bookType" | "dateCompleted";
type CoverFilter = "all" | "with-cover" | "without-cover";

const Index = () => {
  const [showEngine, setShowEngine] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [filterCategory, setFilterCategory] = useState<BookCategory | "all">("all");
  const [filterType, setFilterType] = useState<BookType | "all">("all");
  const [filterCover, setFilterCover] = useState<CoverFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [wipVisible, setWipVisible] = useState(BOOKS_PER_PAGE);
  const [completedVisible, setCompletedVisible] = useState(BOOKS_PER_PAGE);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelWipRef = useRef<HTMLDivElement | null>(null);
  const sentinelCompletedRef = useRef<HTMLDivElement | null>(null);

  const { books, isLoading, addBook, deleteBook, updateBook } = useBooks();

  const handleUpdateCover = async (id: string, coverUrl: string) => {
    try {
      await updateBook(id, { coverUrl });
    } catch (error) {
      console.error("Failed to update cover:", error);
    }
  };

  // Sort function
  const sortBooks = useCallback((list: Book[]) => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "bookType":
          return a.bookType.localeCompare(b.bookType) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "dateCompleted":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [sortBy]);

  const wipBooks = useMemo(() => sortBooks(books.filter(b => b.status !== "completed")), [books, sortBooks]);
  const completedBooks = useMemo(() => sortBooks(books.filter(b => b.status === "completed")), [books, sortBooks]);

  const visibleWip = wipBooks.slice(0, wipVisible);
  const visibleCompleted = completedBooks.slice(0, completedVisible);

  // Infinite scroll
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target === sentinelWipRef.current && wipVisible < wipBooks.length) {
          setWipVisible(v => Math.min(v + BOOKS_PER_PAGE, wipBooks.length));
        }
        if (entry.target === sentinelCompletedRef.current && completedVisible < completedBooks.length) {
          setCompletedVisible(v => Math.min(v + BOOKS_PER_PAGE, completedBooks.length));
        }
      }
    }, { rootMargin: "200px" });

    if (sentinelWipRef.current) observerRef.current.observe(sentinelWipRef.current);
    if (sentinelCompletedRef.current) observerRef.current.observe(sentinelCompletedRef.current);

    return () => observerRef.current?.disconnect();
  }, [wipVisible, completedVisible, wipBooks.length, completedBooks.length]);

  // Reset pagination when sort changes
  useEffect(() => {
    setWipVisible(BOOKS_PER_PAGE);
    setCompletedVisible(BOOKS_PER_PAGE);
  }, [sortBy]);

  // Handle credit purchase success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creditsPurchased = params.get("credits_purchased");
    if (creditsPurchased) {
      window.history.replaceState({}, "", "/dashboard");
      toast.success(`${Number(creditsPurchased).toLocaleString()} credits added to your account!`);
    }
  }, []);

  const handleCreateBook = async (input: CreateBookInput) => {
    try {
      const newBook = await addBook(input);
      setShowEngine(false);
      setSelectedBook(newBook);
    } catch (error) {
      console.error("Failed to create book:", error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBook(id);
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  };

  if (selectedBook) {
    const currentBook = books.find(b => b.id === selectedBook.id) || selectedBook;
    return <BookDetailView book={currentBook} onBack={() => setSelectedBook(null)} />;
  }

  const sortSelector = (
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <ArrowUpDown className="w-3 h-3 mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="updated">Last Updated</SelectItem>
        <SelectItem value="bookType">Book Type</SelectItem>
        <SelectItem value="dateCompleted">Date</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation onCreateBook={() => setShowEngine(true)} />

      <main>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading your library...</p>
            </div>
          </div>
        ) : books.length === 0 ? (
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold">Your Library</h2>
                <p className="text-muted-foreground mt-1">No books yet</p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center space-y-6"
            >
              <div className="p-6 rounded-full bg-primary/10">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl font-serif font-bold">Create Your First Book</h3>
                <p className="text-muted-foreground">
                  Transform your ideas into a complete, professionally structured book with AI-powered co-pilot generation.
                </p>
              </div>
              <Button variant="hero" size="lg" onClick={() => setShowEngine(true)} className="group">
                <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                Get Started
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-serif font-bold">Your Library</h2>
              {sortSelector}
            </div>

            <div className="space-y-10">
              {/* In Progress */}
              {wipBooks.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-serif font-bold">Continue Writing</h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {wipBooks.length} book{wipBooks.length !== 1 ? "s" : ""} in progress
                    </p>
                  </div>
                  <motion.div
                    className="grid gap-6"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {visibleWip.map((book, index) => (
                      <BookCard key={book.id} book={book} index={index} onSelect={setSelectedBook} onDelete={handleDeleteBook} onUpdateCover={handleUpdateCover} />
                    ))}
                  </motion.div>
                  {wipVisible < wipBooks.length && <div ref={sentinelWipRef} className="h-4" />}
                </div>
              )}

              {/* Completed */}
              {completedBooks.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-serif font-bold text-muted-foreground">Completed</h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {completedBooks.length} book{completedBooks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <motion.div
                    className="grid gap-6"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {visibleCompleted.map((book, index) => (
                      <BookCard key={book.id} book={book} index={index} onSelect={setSelectedBook} onDelete={handleDeleteBook} onUpdateCover={handleUpdateCover} />
                    ))}
                  </motion.div>
                  {completedVisible < completedBooks.length && <div ref={sentinelCompletedRef} className="h-4" />}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showEngine && (
          <CreateBookEngine onClose={() => setShowEngine(false)} onCreate={handleCreateBook} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
