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
                  Transform your ideas into a complete, professionally structured book with AI-powered generation.
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold">Your Library</h2>
                <p className="text-muted-foreground mt-1">
                  {books.length} book{books.length !== 1 ? "s" : ""} in progress
                </p>
              </div>
            </div>

            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {books.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={index}
                  onSelect={setSelectedBook}
                  onDelete={handleDeleteBook}
                />
              ))}
            </motion.div>
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
