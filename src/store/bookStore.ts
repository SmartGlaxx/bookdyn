import { create } from 'zustand';
import { Book, CreateBookInput, BookStatus } from '@/types/book';

interface BookStore {
  books: Book[];
  currentBook: Book | null;
  isLoading: boolean;
  
  // Actions
  addBook: (input: CreateBookInput) => Book;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  setCurrentBook: (book: Book | null) => void;
  updateBookStatus: (id: string, status: BookStatus) => void;
  incrementWordCount: (id: string, count: number) => void;
}

const generateId = () => crypto.randomUUID();

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  currentBook: null,
  isLoading: false,

  addBook: (input: CreateBookInput) => {
    const now = new Date().toISOString();
    const newBook: Book = {
      id: generateId(),
      ...input,
      status: 'planning',
      currentChapterIndex: 0,
      currentSubsectionIndex: 0,
      createdAt: now,
      updatedAt: now,
      wordCount: 0,
      tonalAnchors: [],
    };

    set((state) => ({
      books: [...state.books, newBook],
      currentBook: newBook,
    }));

    return newBook;
  },

  updateBook: (id: string, updates: Partial<Book>) => {
    set((state) => ({
      books: state.books.map((book) =>
        book.id === id
          ? { ...book, ...updates, updatedAt: new Date().toISOString() }
          : book
      ),
      currentBook:
        state.currentBook?.id === id
          ? { ...state.currentBook, ...updates, updatedAt: new Date().toISOString() }
          : state.currentBook,
    }));
  },

  deleteBook: (id: string) => {
    set((state) => ({
      books: state.books.filter((book) => book.id !== id),
      currentBook: state.currentBook?.id === id ? null : state.currentBook,
    }));
  },

  setCurrentBook: (book: Book | null) => {
    set({ currentBook: book });
  },

  updateBookStatus: (id: string, status: BookStatus) => {
    get().updateBook(id, { status });
  },

  incrementWordCount: (id: string, count: number) => {
    const book = get().books.find((b) => b.id === id);
    if (book) {
      get().updateBook(id, { wordCount: book.wordCount + count });
    }
  },
}));
