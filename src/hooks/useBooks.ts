import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Book, CreateBookInput, BookStatus, BookOutline, BookControls, ToneProfile, POV, BookType } from "@/types/book";
import type { StoryCanvas } from "@/types/book";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

// Transform database row to Book type
const transformDbToBook = (row: any): Book => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  bookType: row.book_type as BookType,
  theme: row.theme,
  genre: row.genre,
  language: row.language || "English",
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
  seriesId: row.series_id || undefined,
  parentBookId: row.parent_book_id || undefined,
  runningSummary: row.running_summary || "",
  backCoverSummary: row.back_cover_summary || undefined,
  frontMatter: row.front_matter || undefined,
  characterLedger: row.character_ledger || { characters: [] },
  plotLedger: row.plot_ledger || { todos: [], dones: [] },
  canvas: (row.canvas as StoryCanvas | undefined) || undefined,
});

// Transform Book to database row format
const transformBookToDb = (book: Partial<Book> & { id?: string }) => ({
  ...(book.id && { id: book.id }),
  ...(book.title !== undefined && { title: book.title }),
  ...(book.subtitle !== undefined && { subtitle: book.subtitle }),
  ...(book.bookType !== undefined && { book_type: book.bookType }),
  ...(book.theme !== undefined && { theme: book.theme }),
  ...(book.genre !== undefined && { genre: book.genre }),
  ...(book.language !== undefined && { language: book.language }),
  ...(book.audience !== undefined && { audience: book.audience }),
  ...(book.pov !== undefined && { pov: book.pov }),
  ...(book.toneProfile !== undefined && { tone_profile: book.toneProfile }),
  ...(book.controls !== undefined && { controls: book.controls }),
  ...(book.status !== undefined && { status: book.status }),
  ...('outline' in book && { outline: book.outline ?? null }),
  ...(book.currentChapterIndex !== undefined && { current_chapter_index: book.currentChapterIndex }),
  ...(book.currentSubsectionIndex !== undefined && { current_subsection_index: book.currentSubsectionIndex }),
  ...(book.wordCount !== undefined && { word_count: book.wordCount }),
  ...(book.tonalAnchors !== undefined && { tonal_anchors: book.tonalAnchors }),
  ...(book.entities !== undefined && { entities: book.entities }),
  ...(book.concepts !== undefined && { concepts: book.concepts }),
  ...(book.coverUrl !== undefined && { cover_url: book.coverUrl }),
  ...(book.seriesId !== undefined && { series_id: book.seriesId }),
  ...(book.parentBookId !== undefined && { parent_book_id: book.parentBookId }),
  ...(book.runningSummary !== undefined && { running_summary: book.runningSummary }),
  ...(book.backCoverSummary !== undefined && { back_cover_summary: book.backCoverSummary }),
  ...(book.frontMatter !== undefined && { front_matter: book.frontMatter as unknown as Json }),
  ...(book.characterLedger !== undefined && { character_ledger: book.characterLedger as unknown as Json }),
  ...(book.plotLedger !== undefined && { plot_ledger: book.plotLedger as unknown as Json }),
});

export const useBooks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all books for the current user
  const { data: books = [], isLoading, error } = useQuery({
    queryKey: ["books", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data.map(transformDbToBook);
    },
    enabled: !!user,
  });

  // Create book mutation
  const createBookMutation = useMutation({
    mutationFn: async (input: CreateBookInput) => {
      if (!user) throw new Error("Must be logged in to create books");
      
      const bookData = {
        title: input.title.trim(),
        subtitle: input.subtitle ?? null,
        book_type: input.bookType,
        theme: input.theme,
        genre: input.genre ?? null,
        language: input.language ?? "English",
        audience: input.audience,
        pov: input.pov,
        tone_profile: JSON.parse(JSON.stringify(input.toneProfile)) as Json,
        controls: JSON.parse(JSON.stringify(input.controls)) as Json,
        status: "planning",
        current_chapter_index: 0,
        current_subsection_index: 0,
        word_count: 0,
        tonal_anchors: [] as string[],
        entities: [] as string[],
        concepts: [] as string[],
        user_id: user.id,
        series_id: input.seriesId ?? null,
        parent_book_id: input.parentBookId ?? null,
        front_matter: input.frontMatter ? (JSON.parse(JSON.stringify(input.frontMatter)) as Json) : null,
        ...(input.canvas
          ? { canvas: JSON.parse(JSON.stringify(input.canvas)) as Json }
          : {}),
      };

      const { data, error } = await supabase
        .from("books")
        .insert([bookData])
        .select()
        .single();

      if (error) throw error;
      return transformDbToBook(data);
    },
    onSuccess: (newBook) => {
      queryClient.invalidateQueries({ queryKey: ["books", user?.id] });
      toast.success("Book created!", {
        description: `"${newBook.title}" is ready for planning.`,
      });
    },
    onError: (error) => {
      console.error("Failed to create book:", error);
      toast.error("Failed to create book");
    },
  });

  // Update book mutation
  const updateBookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Book> }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
      if (updates.bookType !== undefined) dbUpdates.book_type = updates.bookType;
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
      if (updates.language !== undefined) dbUpdates.language = updates.language;
      if (updates.audience !== undefined) dbUpdates.audience = updates.audience;
      if (updates.pov !== undefined) dbUpdates.pov = updates.pov;
      if (updates.toneProfile !== undefined) dbUpdates.tone_profile = updates.toneProfile;
      if (updates.controls !== undefined) dbUpdates.controls = updates.controls;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if ('outline' in updates) dbUpdates.outline = updates.outline ?? null;
      if (updates.currentChapterIndex !== undefined) dbUpdates.current_chapter_index = updates.currentChapterIndex;
      if (updates.currentSubsectionIndex !== undefined) dbUpdates.current_subsection_index = updates.currentSubsectionIndex;
      if (updates.wordCount !== undefined) dbUpdates.word_count = updates.wordCount;
      if (updates.tonalAnchors !== undefined) dbUpdates.tonal_anchors = updates.tonalAnchors;
      if (updates.entities !== undefined) dbUpdates.entities = updates.entities;
      if (updates.concepts !== undefined) dbUpdates.concepts = updates.concepts;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
      if (updates.seriesId !== undefined) dbUpdates.series_id = updates.seriesId;
      if (updates.parentBookId !== undefined) dbUpdates.parent_book_id = updates.parentBookId;
      if (updates.runningSummary !== undefined) dbUpdates.running_summary = updates.runningSummary;
      if (updates.backCoverSummary !== undefined) dbUpdates.back_cover_summary = updates.backCoverSummary;
      if (updates.frontMatter !== undefined) dbUpdates.front_matter = updates.frontMatter as unknown as Json;
      if (updates.characterLedger !== undefined) dbUpdates.character_ledger = updates.characterLedger as unknown as Json;
      if (updates.plotLedger !== undefined) dbUpdates.plot_ledger = updates.plotLedger as unknown as Json;
      if (updates.canvas !== undefined) dbUpdates.canvas = updates.canvas as unknown as Json;
      
      const { data, error } = await supabase
        .from("books")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformDbToBook(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", user?.id] });
    },
    onError: (error) => {
      console.error("Failed to update book:", error);
      toast.error("Failed to save changes");
    },
  });

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", user?.id] });
      toast.success("Book deleted");
    },
    onError: (error) => {
      console.error("Failed to delete book:", error);
      toast.error("Failed to delete book");
    },
  });

  return {
    books,
    isLoading,
    error,
    addBook: createBookMutation.mutateAsync,
    updateBook: (id: string, updates: Partial<Book>) => 
      updateBookMutation.mutateAsync({ id, updates }),
    deleteBook: deleteBookMutation.mutateAsync,
    isCreating: createBookMutation.isPending,
    isUpdating: updateBookMutation.isPending,
    isDeleting: deleteBookMutation.isPending,
  };
};
