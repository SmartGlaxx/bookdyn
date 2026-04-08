import { useParams, useNavigate } from "react-router-dom";
import { useBooks } from "@/hooks/useBooks";
import BookDetailView from "@/components/BookDetailView";
import { BookOpen } from "lucide-react";

const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { books, isLoading } = useBooks();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          {/* <BookOpen className="w-8 h-8 text-primary" /> */}
          <BookOpen size={20} color="var(--primary)" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  const book = books.find((b) => b.id === bookId);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          {/* <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" /> */}
          <BookOpen size={20} color="var(--primary)" />
          <h2 className="text-xl font-serif font-bold">Book not found</h2>
          <button onClick={() => navigate("/dashboard")} className="text-primary underline text-sm">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return <BookDetailView book={book} onBack={() => navigate("/dashboard")} />;
};

export default BookDetail;
