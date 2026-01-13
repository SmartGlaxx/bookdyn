import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import CreateBookWizard from "@/components/CreateBookWizard";
import BookDetailView from "@/components/BookDetailView";
import { useBookStore } from "@/store/bookStore";
import { Book, CreateBookInput } from "@/types/book";
import { toast } from "sonner";

const Index = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  const { books, addBook, deleteBook, updateBook } = useBookStore();

  const handleCreateBook = (input: CreateBookInput) => {
    const newBook = addBook(input);
    setShowWizard(false);
    toast.success("Book created!", {
      description: `"${newBook.title}" is ready for planning.`,
    });
    // Auto-open the new book
    setSelectedBook(newBook);
  };

  const handleDeleteBook = (id: string) => {
    deleteBook(id);
    toast.success("Book deleted");
  };

  const handleStartGeneration = () => {
    if (!selectedBook) return;
    
    // Simulate creating an outline (in real app, this would call AI)
    const mockOutline = {
      chapters: Array.from({ length: 8 }, (_, i) => ({
        id: `ch-${i + 1}`,
        chapterNumber: i + 1,
        title: `Chapter ${i + 1}`,
        subsections: Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, j) => ({
          id: `ch-${i + 1}-sub-${j + 1}`,
          title: `Section ${j + 1}`,
          status: "pending" as const,
        })),
        status: "pending" as const,
      })),
      openPromises: [],
      resolvedPromises: [],
    };

    updateBook(selectedBook.id, {
      status: "ready_to_write",
      outline: mockOutline,
    });

    // Update local state
    setSelectedBook({
      ...selectedBook,
      status: "ready_to_write",
      outline: mockOutline,
    });

    toast.success("Outline created!", {
      description: `${mockOutline.chapters.length} chapters ready for generation.`,
    });
  };

  // Show detail view if a book is selected
  if (selectedBook) {
    // Get fresh book data from store
    const currentBook = books.find(b => b.id === selectedBook.id) || selectedBook;
    return (
      <BookDetailView
        book={currentBook}
        onBack={() => setSelectedBook(null)}
        onStartGeneration={handleStartGeneration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onCreateBook={() => setShowWizard(true)} />

      <main>
        {books.length === 0 ? (
          <HeroSection
            onCreateBook={() => setShowWizard(true)}
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
        {showWizard && (
          <CreateBookWizard
            onClose={() => setShowWizard(false)}
            onCreate={handleCreateBook}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
