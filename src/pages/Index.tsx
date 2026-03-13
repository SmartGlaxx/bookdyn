import { useState } from "react";
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
          <LandingPage
            onCreateBook={() => setShowEngine(true)}
            bookCount={books.length}
          />
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
