import { useParams, useNavigate } from "react-router-dom";
import { useBooks } from "@/hooks/useBooks";
import { useAuth } from "@/hooks/useAuth";
import BookDetailView from "@/components/BookDetailView";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Book, BookType, POV, ToneProfile, BookControls, BookStatus, BookOutline } from "@/types/book";

const transformDbToBook = (row: any): Book => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  bookType: row.book_type as BookType,
  theme: row.theme,
  genre: row.genre,
  audience: row.audience,
  pov: row.pov as POV,
  toneProfile: row.tone_profile as ToneProfile,
  controls: row.controls as BookControls,
  status: row.status as BookStatus,
  outline: row.outline as BookOutline | undefined,
  currentChapterIndex: row.current_chapter_index,
  currentSubsectionIndex: row.current_subsection_index,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  wordCount: row.word_count,
  tonalAnchors: row.tonal_anchors || [],
  entities: row.entities || [],
  concepts: row.concepts || [],
  coverUrl: row.cover_url || undefined,
});

const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { books, isLoading } = useBooks();
  const [directBook, setDirectBook] = useState<Book | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  const cachedBook = books.find((b) => b.id === bookId);

  // If book not in cache, fetch directly
  useEffect(() => {
    if (cachedBook || isLoading || !bookId || !user || directBook) return;
    setDirectLoading(true);
    supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setDirectBook(transformDbToBook(data));
        }
        setDirectLoading(false);
      });
  }, [cachedBook, isLoading, bookId, user, directBook]);

  const book = cachedBook || directBook;

  if (isLoading || directLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-serif font-bold">Book not found</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary underline text-sm"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return <BookDetailView book={book} onBack={() => navigate("/dashboard")} />;
};

export default BookDetail;
