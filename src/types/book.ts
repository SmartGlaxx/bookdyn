export type BookType = "novel" | "non-fiction" | "memoir" | "self-help" | "technical" | "children" | "poetry" | "magazine";
export type BookStatus = "planning" | "ready_to_write" | "writing" | "completed" | "paused";
export type POV = "first-person" | "second-person" | "third-person-limited" | "third-person-omniscient";
export type ToneLevel = "formal" | "conversational" | "humorous" | "dramatic" | "poetic" | "technical";

export interface ToneProfile {
  primary: ToneLevel;
  secondary?: ToneLevel;
  intensity: number; // 1-10
}

export interface BookControls {
  velocity: number; // 1-10, pace of narrative
  scope: number; // 1-10, depth of detail
  creativity: number; // 1-10, creative license
  imageGeneration: boolean;
  autoResume: boolean;
}

export interface Subsection {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  status: "pending" | "writing" | "completed";
  imageUrl?: string;
}

export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  subsections: Subsection[];
  summary?: string;
  status: "pending" | "writing" | "completed";
}

export interface BookOutline {
  chapters: Chapter[];
  openPromises: string[];
  resolvedPromises: string[];
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  bookType: BookType;
  theme: string;
  genre?: string;
  audience: string;
  pov: POV;
  toneProfile: ToneProfile;
  controls: BookControls;
  status: BookStatus;
  outline?: BookOutline;
  currentChapterIndex: number;
  currentSubsectionIndex: number;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  tonalAnchors: string[];
}

export interface CreateBookInput {
  title: string;
  subtitle?: string;
  bookType: BookType;
  theme: string;
  genre?: string;
  audience: string;
  pov: POV;
  toneProfile: ToneProfile;
  controls: BookControls;
}

export const BOOK_TYPE_INFO: Record<BookType, { label: string; icon: string; description: string }> = {
  novel: { label: "Novel", icon: "📖", description: "Fiction narrative with plot and characters" },
  "non-fiction": { label: "Non-Fiction", icon: "📚", description: "Factual content, essays, or educational material" },
  memoir: { label: "Memoir", icon: "📝", description: "Personal life stories and experiences" },
  "self-help": { label: "Self-Help", icon: "🌟", description: "Guidance and strategies for personal growth" },
  technical: { label: "Technical", icon: "⚙️", description: "Technical documentation or tutorials" },
  children: { label: "Children's Book", icon: "🎨", description: "Stories for young readers" },
  poetry: { label: "Poetry", icon: "✨", description: "Verse and poetic compositions" },
  magazine: { label: "Magazine/Serial", icon: "📰", description: "Ongoing issues or episodic content" },
};

export const POV_OPTIONS: { value: POV; label: string; description: string }[] = [
  { value: "first-person", label: "First Person", description: "I, me, my - intimate and personal" },
  { value: "second-person", label: "Second Person", description: "You - direct address to reader" },
  { value: "third-person-limited", label: "Third Person Limited", description: "He/she - one character's perspective" },
  { value: "third-person-omniscient", label: "Third Person Omniscient", description: "All-knowing narrator" },
];

export const TONE_OPTIONS: { value: ToneLevel; label: string; emoji: string }[] = [
  { value: "formal", label: "Formal", emoji: "🎩" },
  { value: "conversational", label: "Conversational", emoji: "💬" },
  { value: "humorous", label: "Humorous", emoji: "😄" },
  { value: "dramatic", label: "Dramatic", emoji: "🎭" },
  { value: "poetic", label: "Poetic", emoji: "🌙" },
  { value: "technical", label: "Technical", emoji: "🔧" },
];
