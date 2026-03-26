import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookCard from "@/components/BookCard";
import CreateBookEngine from "@/components/CreateBookEngine";
import BookDetailView from "@/components/BookDetailView";
import { useBooks } from "@/hooks/useBooks";
import { Book, CreateBookInput } from "@/types/book";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [showEngine, setShowEngine] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  const { books, isLoading, addBook, deleteBook, updateBook } = useBooks();

  const handleUpdateCover = async (id: string, coverUrl: string) => {
    try {
      await updateBook(id, { coverUrl });
    } catch (error) {
      console.error("Failed to update cover:", error);
    }
  };
  

  // Work in progress books (not completed)
  const wipBooks = books.filter(b => b.status !== "completed" && b.outline);
  const completedBooks = books.filter(b => b.status === "completed");
  const planningBooks = books.filter(b => !b.outline || b.status === "planning");

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
              <Button
                variant="hero"
                size="lg"
                onClick={() => setShowEngine(true)}
                className="group"
              >
                <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                Get Started
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <div className="space-y-8">
                {/* Work in Progress */}
                {wipBooks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-serif font-bold">Continue Writing</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                          {wipBooks.length} book{wipBooks.length !== 1 ? "s" : ""} in progress
                        </p>
                      </div>
                    </div>
                    <motion.div
                      className="grid gap-6"
                      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {wipBooks.map((book, index) => (
                        <BookCard
                          key={book.id}
                          book={book}
                          index={index}
                          onSelect={setSelectedBook}
                          onDelete={handleDeleteBook}
                          onUpdateCover={handleUpdateCover}
                        />
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Planning */}
                {planningBooks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-serif font-bold text-muted-foreground">Planning</h2>
                    </div>
                    <motion.div className="grid gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                      {planningBooks.map((book, index) => (
                        <BookCard key={book.id} book={book} index={index} onSelect={setSelectedBook} onDelete={handleDeleteBook} onUpdateCover={handleUpdateCover} />
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Completed */}
                {completedBooks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-serif font-bold text-muted-foreground">Completed</h2>
                    </div>
                    <motion.div className="grid gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                      {completedBooks.map((book, index) => (
                        <BookCard key={book.id} book={book} index={index} onSelect={setSelectedBook} onDelete={handleDeleteBook} onUpdateCover={handleUpdateCover} />
                      ))}
                    </motion.div>
                  </div>
                )}
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showEngine && (
          <CreateBookEngine
            onClose={() => setShowEngine(false)}
            onCreate={handleCreateBook}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
