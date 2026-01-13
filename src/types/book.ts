// ============= BOOK TYPE SYSTEM =============
export type BookType = 
  | "novel"
  | "fiction-serial"
  | "short-story"
  | "children"
  | "comic"
  | "biography"
  | "memoir"
  | "self-help"
  | "psychology"
  | "business"
  | "finance"
  | "accounting"
  | "economics"
  | "technology"
  | "programming"
  | "ai-ml"
  | "engineering"
  | "science-academic"
  | "science-popular"
  | "cookbook"
  | "travel"
  | "history"
  | "culture"
  | "magazine"
  | "textbook"
  | "poetry"
  | "drama"
  | "reference"
  | "illustrated-guide"
  | "custom";

export type BookStatus = "planning" | "ready_to_write" | "writing" | "completed" | "paused";
export type POV = "first-person" | "second-person" | "third-person-limited" | "third-person-omniscient";
export type ToneLevel = "formal" | "conversational" | "humorous" | "dramatic" | "poetic" | "technical" | "authoritative" | "reflective" | "neutral";
export type AutomationLevel = "assisted" | "semi-autonomous" | "fully-autonomous";
export type DepthLevel = "overview" | "intermediate" | "comprehensive" | "academic";
export type TemporalEra = "ancient" | "medieval" | "renaissance" | "industrial" | "modern" | "contemporary" | "near-future" | "far-future" | "timeless";
export type TimelineStructure = "linear" | "non-linear" | "circular" | "fragmented";
export type SpatialScope = "single-location" | "regional" | "national" | "multi-country" | "global" | "universal";

export interface ToneProfile {
  primary: ToneLevel;
  secondary?: ToneLevel;
  intensity: number; // 1-10
  formality: number; // 1-10
  emotionalIntensity: number; // 1-10
  humorLevel: number; // 1-10
  authorityLevel: number; // 1-10
}

export interface StructureControls {
  chapterCount: "flexible" | "fixed";
  targetChapters?: number;
  subsectionCount: "flexible" | "fixed";
  targetSubsections?: number;
  titlesRequired: boolean;
  targetWordCount?: number;
}

export interface DynamismControls {
  velocity: number; // 1-10, narrative/conceptual pace
  entityComplexity: number; // 1-10, characters/concepts depth
  perspectiveMultiplexing: number; // 1-10, parallel threads
  divergenceAllowed: boolean;
}

export interface TemporalContext {
  era: TemporalEra;
  timelineStructure: TimelineStructure;
  specificPeriod?: string;
}

export interface BookControls {
  // Core controls
  velocity: number; // 1-10, pace of narrative
  scope: number; // 1-10, depth of detail
  creativity: number; // 1-10, creative license
  
  // New dynamism controls
  entityComplexity: number; // 1-10, character/concept complexity
  spatialScope: SpatialScope;
  perspectiveMultiplexing: number; // 1-10, parallel viewpoints/threads
  
  // Temporal
  temporalContext: TemporalContext;
  
  // Structure
  structureControls: StructureControls;
  
  // Automation
  automationLevel: AutomationLevel;
  depthLevel: DepthLevel;
  
  // Toggles
  imageGeneration: boolean;
  autoResume: boolean;
  divergenceAllowed: boolean;
}

export interface Subsection {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  goal?: string;
  imageOpportunity?: string;
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
  entities: string[];
  concepts: string[];
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

// ============= BOOK TYPE CATEGORIES =============
export type BookCategory = "fiction" | "non-fiction" | "educational" | "creative" | "specialized";

export const BOOK_CATEGORIES: Record<BookCategory, { label: string; description: string }> = {
  fiction: { label: "Fiction & Narrative", description: "Stories, novels, and creative narratives" },
  "non-fiction": { label: "Non-Fiction", description: "Factual, biographical, and self-improvement content" },
  educational: { label: "Educational & Technical", description: "Learning materials, textbooks, and guides" },
  creative: { label: "Creative & Artistic", description: "Poetry, drama, and visual-heavy content" },
  specialized: { label: "Specialized", description: "Reference, periodicals, and custom formats" },
};

export const BOOK_TYPE_INFO: Record<BookType, { label: string; icon: string; description: string; category: BookCategory }> = {
  // Fiction
  novel: { label: "Novel", icon: "📖", description: "Full-length fiction narrative with plot and characters", category: "fiction" },
  "fiction-serial": { label: "Serialized Fiction", icon: "📚", description: "Episodic fiction released in parts", category: "fiction" },
  "short-story": { label: "Short Story", icon: "📝", description: "Brief fiction narratives", category: "fiction" },
  children: { label: "Children's Book", icon: "🎨", description: "Illustrated stories for young readers", category: "fiction" },
  comic: { label: "Comic / Graphic Novel", icon: "💬", description: "Visual storytelling with panels and dialogue", category: "fiction" },
  
  // Non-Fiction
  biography: { label: "Biography", icon: "👤", description: "Life story of a notable person", category: "non-fiction" },
  memoir: { label: "Memoir", icon: "📔", description: "Personal life stories and experiences", category: "non-fiction" },
  "self-help": { label: "Self-Help", icon: "🌟", description: "Personal development and guidance", category: "non-fiction" },
  psychology: { label: "Psychology", icon: "🧠", description: "Mental health, behavior, and cognition", category: "non-fiction" },
  business: { label: "Business", icon: "💼", description: "Business strategy and management", category: "non-fiction" },
  finance: { label: "Finance", icon: "💰", description: "Money management and investing", category: "non-fiction" },
  accounting: { label: "Accounting", icon: "📊", description: "Financial reporting and analysis", category: "non-fiction" },
  economics: { label: "Economics", icon: "📈", description: "Economic theory and practice", category: "non-fiction" },
  travel: { label: "Travel", icon: "✈️", description: "Travel guides and experiences", category: "non-fiction" },
  history: { label: "History", icon: "🏛️", description: "Historical events and analysis", category: "non-fiction" },
  culture: { label: "Culture", icon: "🎭", description: "Cultural studies and exploration", category: "non-fiction" },
  
  // Educational
  technology: { label: "Technology", icon: "💻", description: "Tech concepts and innovations", category: "educational" },
  programming: { label: "Programming", icon: "⚙️", description: "Coding tutorials and references", category: "educational" },
  "ai-ml": { label: "AI & Machine Learning", icon: "🤖", description: "Artificial intelligence concepts", category: "educational" },
  engineering: { label: "Engineering", icon: "🔧", description: "Engineering principles and design", category: "educational" },
  "science-academic": { label: "Science (Academic)", icon: "🔬", description: "Rigorous scientific content", category: "educational" },
  "science-popular": { label: "Science (Popular)", icon: "🧪", description: "Accessible science writing", category: "educational" },
  textbook: { label: "Textbook", icon: "📕", description: "Structured educational material", category: "educational" },
  cookbook: { label: "Cookbook", icon: "🍳", description: "Recipes and culinary guides", category: "educational" },
  
  // Creative
  poetry: { label: "Poetry", icon: "✨", description: "Verse and poetic compositions", category: "creative" },
  drama: { label: "Drama / Screenplay", icon: "🎬", description: "Plays and film scripts", category: "creative" },
  "illustrated-guide": { label: "Illustrated Guide", icon: "🖼️", description: "Visual-heavy instructional content", category: "creative" },
  
  // Specialized
  magazine: { label: "Magazine / Periodical", icon: "📰", description: "Ongoing issues or episodic content", category: "specialized" },
  reference: { label: "Reference Manual", icon: "📋", description: "Comprehensive reference documentation", category: "specialized" },
  custom: { label: "Custom / Hybrid", icon: "🎯", description: "Custom format combining multiple styles", category: "specialized" },
};

export const POV_OPTIONS: { value: POV; label: string; description: string }[] = [
  { value: "first-person", label: "First Person", description: "I, me, my — intimate and personal" },
  { value: "second-person", label: "Second Person", description: "You — direct address to reader" },
  { value: "third-person-limited", label: "Third Person Limited", description: "He/she — one character's perspective" },
  { value: "third-person-omniscient", label: "Third Person Omniscient", description: "All-knowing narrator" },
];

export const TONE_OPTIONS: { value: ToneLevel; label: string; emoji: string; description: string }[] = [
  { value: "formal", label: "Formal", emoji: "🎩", description: "Professional and structured" },
  { value: "conversational", label: "Conversational", emoji: "💬", description: "Friendly and approachable" },
  { value: "humorous", label: "Humorous", emoji: "😄", description: "Light and entertaining" },
  { value: "dramatic", label: "Dramatic", emoji: "🎭", description: "Intense and emotional" },
  { value: "poetic", label: "Poetic", emoji: "🌙", description: "Lyrical and evocative" },
  { value: "technical", label: "Technical", emoji: "🔧", description: "Precise and factual" },
  { value: "authoritative", label: "Authoritative", emoji: "👔", description: "Expert and commanding" },
  { value: "reflective", label: "Reflective", emoji: "🪞", description: "Thoughtful and introspective" },
  { value: "neutral", label: "Neutral", emoji: "⚖️", description: "Balanced and objective" },
];

export const AUTOMATION_OPTIONS: { value: AutomationLevel; label: string; description: string }[] = [
  { value: "assisted", label: "Assisted", description: "Manual approval at each step" },
  { value: "semi-autonomous", label: "Semi-Autonomous", description: "Approval at chapter milestones" },
  { value: "fully-autonomous", label: "Fully Autonomous", description: "Automatic generation with minimal input" },
];

export const DEPTH_OPTIONS: { value: DepthLevel; label: string; description: string }[] = [
  { value: "overview", label: "Overview", description: "High-level summary content" },
  { value: "intermediate", label: "Intermediate", description: "Balanced depth and breadth" },
  { value: "comprehensive", label: "Comprehensive", description: "Detailed exploration" },
  { value: "academic", label: "Academic", description: "Research-grade depth" },
];

export const TEMPORAL_ERA_OPTIONS: { value: TemporalEra; label: string; description: string }[] = [
  { value: "ancient", label: "Ancient", description: "Pre-500 CE civilizations" },
  { value: "medieval", label: "Medieval", description: "500-1500 CE period" },
  { value: "renaissance", label: "Renaissance", description: "1400-1600 cultural rebirth" },
  { value: "industrial", label: "Industrial", description: "1760-1840 revolution era" },
  { value: "modern", label: "Modern", description: "1900s developments" },
  { value: "contemporary", label: "Contemporary", description: "Present day setting" },
  { value: "near-future", label: "Near Future", description: "Next 50-100 years" },
  { value: "far-future", label: "Far Future", description: "Distant future speculation" },
  { value: "timeless", label: "Timeless", description: "No specific era" },
];

export const TIMELINE_OPTIONS: { value: TimelineStructure; label: string; description: string }[] = [
  { value: "linear", label: "Linear", description: "Chronological progression" },
  { value: "non-linear", label: "Non-Linear", description: "Jumping through time" },
  { value: "circular", label: "Circular", description: "Beginning meets ending" },
  { value: "fragmented", label: "Fragmented", description: "Disconnected moments" },
];

export const SPATIAL_SCOPE_OPTIONS: { value: SpatialScope; label: string; description: string }[] = [
  { value: "single-location", label: "Single Location", description: "Focused on one place" },
  { value: "regional", label: "Regional", description: "Multiple nearby locations" },
  { value: "national", label: "National", description: "Across a country" },
  { value: "multi-country", label: "Multi-Country", description: "Several countries" },
  { value: "global", label: "Global", description: "Worldwide scope" },
  { value: "universal", label: "Universal", description: "Beyond Earth / abstract" },
];

export const AUDIENCE_PRESETS = [
  "General readers",
  "Young adults (13-18)",
  "Adults (18+)",
  "Children (6-12)",
  "Professionals",
  "Academics",
  "Industry experts",
  "Beginners",
  "Intermediate learners",
  "Advanced practitioners",
];

export const GENRE_PRESETS: Record<BookCategory, string[]> = {
  fiction: [
    "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller", 
    "Horror", "Literary Fiction", "Historical Fiction", "Adventure", 
    "Dystopian", "Urban Fantasy", "Contemporary"
  ],
  "non-fiction": [
    "Self-Improvement", "Leadership", "Productivity", "Relationships",
    "Health & Wellness", "Spirituality", "True Crime", "Journalism"
  ],
  educational: [
    "Tutorial", "Reference", "How-To", "Academic", "Professional Development",
    "Certification Prep", "Case Studies"
  ],
  creative: [
    "Lyric Poetry", "Epic Poetry", "Haiku", "Free Verse", "Stage Play",
    "Screenplay", "Musical"
  ],
  specialized: [
    "Technical Manual", "API Documentation", "User Guide", "Lifestyle",
    "Special Interest", "Anthology"
  ],
};

// Helper to get default controls based on book type
export const getDefaultControls = (bookType: BookType): BookControls => {
  const category = BOOK_TYPE_INFO[bookType].category;
  
  const baseControls: BookControls = {
    velocity: 5,
    scope: 5,
    creativity: 5,
    entityComplexity: 5,
    spatialScope: "regional",
    perspectiveMultiplexing: 3,
    temporalContext: {
      era: "contemporary",
      timelineStructure: "linear",
    },
    structureControls: {
      chapterCount: "flexible",
      subsectionCount: "flexible",
      titlesRequired: true,
    },
    automationLevel: "semi-autonomous",
    depthLevel: "intermediate",
    imageGeneration: true,
    autoResume: true,
    divergenceAllowed: false,
  };

  // Adjust defaults based on category
  switch (category) {
    case "fiction":
      return {
        ...baseControls,
        creativity: 7,
        entityComplexity: 6,
        perspectiveMultiplexing: 4,
        divergenceAllowed: true,
      };
    case "educational":
      return {
        ...baseControls,
        creativity: 3,
        scope: 7,
        depthLevel: "comprehensive",
        temporalContext: { era: "timeless", timelineStructure: "linear" },
      };
    case "creative":
      return {
        ...baseControls,
        creativity: 9,
        velocity: 3,
        imageGeneration: true,
      };
    case "specialized":
      return {
        ...baseControls,
        creativity: 2,
        scope: 8,
        automationLevel: "assisted",
      };
    default:
      return baseControls;
  }
};
