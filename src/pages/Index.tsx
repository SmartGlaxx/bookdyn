import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BookOpen, Sparkles, ArrowUpDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BookCard from "@/components/BookCard";
import CreateBookEngine from "@/components/CreateBookEngine";
import { useBooks } from "@/hooks/useBooks";
import { Book, CreateBookInput, BOOK_CATEGORIES, BOOK_TYPE_INFO, BookCategory, BookType } from "@/types/book";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const BOOKS_PER_PAGE = 12;

type SortOption = "updated" | "bookType" | "dateCompleted";
type CoverFilter = "all" | "with-cover" | "without-cover";

const Index = () => {
  const navigate = useNavigate();
  const [showEngine, setShowEngine] = useState(false);
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

  const handleSelectBook = (book: Book) => {
    navigate(`/dashboard/${book.id}`);
  };

  const handleUpdateCover = async (id: string, coverUrl: string) => {
    try {
      await updateBook(id, { coverUrl });
    } catch (error) {
      console.error("Failed to update cover:", error);
    }
  };

  // Filter function
  const filterBooks = useCallback(
    (list: Book[]) => {
      return list.filter((b) => {
        if (filterCategory !== "all") {
          const info = BOOK_TYPE_INFO[b.bookType];
          if (info?.category !== filterCategory) return false;
        }
        if (filterType !== "all" && b.bookType !== filterType) return false;
        if (filterCover === "with-cover" && !b.coverUrl) return false;
        if (filterCover === "without-cover" && b.coverUrl) return false;
        return true;
      });
    },
    [filterCategory, filterType, filterCover],
  );

  // Sort function
  const sortBooks = useCallback(
    (list: Book[]) => {
      return [...list].sort((a, b) => {
        switch (sortBy) {
          case "bookType":
            return (
              a.bookType.localeCompare(b.bookType) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          case "dateCompleted":
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          default:
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
      });
    },
    [sortBy],
  );

  // Reset type filter when category changes
  useEffect(() => {
    setFilterType("all");
  }, [filterCategory]);

  const activeFilterCount = [filterCategory !== "all", filterType !== "all", filterCover !== "all"].filter(
    Boolean,
  ).length;

  const wipBooks = useMemo(
    () => sortBooks(filterBooks(books.filter((b) => b.status !== "completed"))),
    [books, sortBooks, filterBooks],
  );
  const completedBooks = useMemo(
    () => sortBooks(filterBooks(books.filter((b) => b.status === "completed"))),
    [books, sortBooks, filterBooks],
  );

  const visibleWip = wipBooks.slice(0, wipVisible);
  const visibleCompleted = completedBooks.slice(0, completedVisible);

  // Group books by book type for shelves view
  const booksByType = useMemo(() => {
    const filtered = filterBooks(books);
    const groups: Record<string, Book[]> = {};
    for (const book of filtered) {
      const type = book.bookType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(book);
    }
    // Sort books within each group
    for (const key of Object.keys(groups)) {
      groups[key] = sortBooks(groups[key]);
    }
    return groups;
  }, [books, filterBooks, sortBooks]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === sentinelWipRef.current && wipVisible < wipBooks.length) {
            setWipVisible((v) => Math.min(v + BOOKS_PER_PAGE, wipBooks.length));
          }
          if (entry.target === sentinelCompletedRef.current && completedVisible < completedBooks.length) {
            setCompletedVisible((v) => Math.min(v + BOOKS_PER_PAGE, completedBooks.length));
          }
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelWipRef.current) observerRef.current.observe(sentinelWipRef.current);
    if (sentinelCompletedRef.current) observerRef.current.observe(sentinelCompletedRef.current);

    return () => observerRef.current?.disconnect();
  }, [wipVisible, completedVisible, wipBooks.length, completedBooks.length]);

  // Reset pagination when sort/filter changes
  useEffect(() => {
    setWipVisible(BOOKS_PER_PAGE);
    setCompletedVisible(BOOKS_PER_PAGE);
  }, [sortBy, filterCategory, filterType, filterCover]);

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
      navigate(`/dashboard/${newBook.id}`);
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

  const availableTypes =
    filterCategory === "all"
      ? Object.entries(BOOK_TYPE_INFO)
      : Object.entries(BOOK_TYPE_INFO).filter(([, info]) => info.category === filterCategory);

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterType("all");
    setFilterCover("all");
  };

  const filterBar = (
    <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as BookCategory | "all")}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(BOOK_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as BookType | "all")}>
              <SelectTrigger className="w-[170px] h-8 text-xs">
                <SelectValue placeholder="Book Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.icon} {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCover} onValueChange={(v) => setFilterCover(v as CoverFilter)}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Cover" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Books</SelectItem>
                <SelectItem value="with-cover">Has Cover</SelectItem>
                <SelectItem value="without-cover">No Cover</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground">
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const toolbar = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-serif font-bold">Your Library</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 text-xs"
          >
            <Filter className="w-3 h-3 mr-1" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="bookType">Book Type</SelectItem>
              <SelectItem value="dateCompleted">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filterBar}
    </div>
  );

  const gridView = (
    <div className="space-y-10 mt-6">
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
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {visibleWip.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                onSelect={handleSelectBook}
                onDelete={handleDeleteBook}
                onUpdateCover={handleUpdateCover}
              />
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
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {visibleCompleted.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                onSelect={handleSelectBook}
                onDelete={handleDeleteBook}
                onUpdateCover={handleUpdateCover}
              />
            ))}
          </motion.div>
          {completedVisible < completedBooks.length && <div ref={sentinelCompletedRef} className="h-4" />}
        </div>
      )}
    </div>
  );

  const shelvesView = (
    <div className="space-y-10 mt-6">
      {Object.entries(booksByType)
        .sort(([a], [b]) => {
          const labelA = BOOK_TYPE_INFO[a as BookType]?.label || a;
          const labelB = BOOK_TYPE_INFO[b as BookType]?.label || b;
          return labelA.localeCompare(labelB);
        })
        .map(([type, typeBooks]) => {
          const info = BOOK_TYPE_INFO[type as BookType];
          // Show max 5 books per stack, latest first (already sorted)
          const stackBooks = typeBooks.slice(0, 5);
          const topBook = stackBooks[0];
          return (
            <div key={type}>
              <div className="mb-4">
                <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                  <span>{info?.icon}</span>
                  {info?.label || type}
                </h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {typeBooks.length} book{typeBooks.length !== 1 ? "s" : ""}
                </p>
              </div>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Stacked book: show top book with fanned cards behind */}
                <div
                  className="relative aspect-[2/3] cursor-pointer"
                  onClick={() => topBook && handleSelectBook(topBook)}
                >
                  {/* Background cards (oldest to newest, back to front) */}
                  {stackBooks
                    .slice(1)
                    .reverse()
                    .map((book, i) => {
                      const stackIndex = stackBooks.length - 1 - i; // position from back
                      const angle = stackIndex * 4; // 4 degrees per card
                      return (
                        <div
                          key={book.id}
                          className="absolute inset-0 rounded-[2px_6px_6px_2px] overflow-hidden bg-card border border-border"
                          style={{
                            transformOrigin: "bottom left",
                            transform: `rotate(${angle}deg)`,
                            zIndex: i,
                            boxShadow: "-2px 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt="" className="w-full h-full object-cover opacity-80" />
                          ) : (
                            <div className="w-full h-full bg-muted/60" />
                          )}
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/20" />
                        </div>
                      );
                    })}
                  {/* Top book (latest) */}
                  {topBook && (
                    <div className="relative z-10 w-full h-full">
                      <BookCard
                        book={topBook}
                        index={0}
                        onSelect={handleSelectBook}
                        onDelete={handleDeleteBook}
                        onUpdateCover={handleUpdateCover}
                      />
                    </div>
                  )}
                </div>
                {/* Remaining books shown individually if more than 5 */}
                {typeBooks.length > 5 &&
                  typeBooks
                    .slice(5)
                    .map((book, index) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        index={index + 1}
                        onSelect={handleSelectBook}
                        onDelete={handleDeleteBook}
                        onUpdateCover={handleUpdateCover}
                      />
                    ))}
              </motion.div>
            </div>
          );
        })}
      {Object.keys(booksByType).length === 0 && activeFilterCount > 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Filter className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No books match your filters</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
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
                <h3 className="text-3xl font-serif font-bold">Your Library</h3>
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
                  Transform your ideas into a complete, professionally structured book with AI-powered co-pilot
                  generation.
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
            {toolbar}

            <Tabs defaultValue="library" className="mt-4">
              <TabsList>
                <TabsTrigger value="library">Library</TabsTrigger>
                <TabsTrigger value="shelves">Shelves</TabsTrigger>
              </TabsList>
              <TabsContent value="library">
                {wipBooks.length === 0 && completedBooks.length === 0 && activeFilterCount > 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <Filter className="w-10 h-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No books match your filters</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  gridView
                )}
              </TabsContent>
              <TabsContent value="shelves">{shelvesView}</TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showEngine && <CreateBookEngine onClose={() => setShowEngine(false)} onCreate={handleCreateBook} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
