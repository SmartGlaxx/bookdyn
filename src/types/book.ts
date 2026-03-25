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
export type AutomationLevel = "guided" | "assisted" | "semi-auto" | "auto-draft";
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

export type TeaserStyle = "none" | "mood-setter" | "cryptic-open-loop" | "character-voice-drop";

export const TEASER_STYLE_OPTIONS: { value: TeaserStyle; label: string; description: string }[] = [
  { value: "none", label: "None", description: "No teaser — section starts immediately" },
  { value: "mood-setter", label: "Mood Setter", description: "A date, location, weather note, or atmospheric stamp that frames the section" },
  { value: "cryptic-open-loop", label: "Cryptic Open Loop", description: "A single cryptic sentence that hints at the section without revealing anything — only makes sense in hindsight" },
  { value: "character-voice-drop", label: "Character Voice Drop", description: "A one-line thought or fragment in a character's voice, no context given" },
];

export interface StructureControls {
  chapterCount: "flexible" | "fixed";
  targetChapters?: number;
  sectionsPerChapter?: number; // 2-10, default 4
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
  hookFrequency: number; // 1-10, how often hooks/scene changes occur
  
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
  
  // Teaser
  teaserStyle: TeaserStyle;
}

export interface Subsection {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  teaser?: string;
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

export interface CharacterIdentity {
  fullName: string;
  aliases?: string[];
  age?: string;
  dateOfBirth?: string;
  gender?: string;
  pronouns?: string;
  nationality?: string;
  ethnicity?: string;
  culturalBackground?: string;
  nativeLanguage?: string;
  accent?: string;
}

export interface CharacterAppearance {
  height?: string;
  build?: string;
  skinTone?: string;
  faceShape?: string;
  eyeColor?: string;
  eyeShape?: string;
  eyeDistinguishing?: string;
  noseShape?: string;
  lipShape?: string;
  jawline?: string;
  cheekbones?: string;
  scars?: string;
  birthmarks?: string;
  tattoos?: string;
  distinctiveMarks?: string;
  hands?: string;
}

export interface CharacterHair {
  color?: string;
  texture?: string;
  lengthAndStyle?: string;
  casualStyle?: string;
  formalStyle?: string;
  changesAcrossStory?: string;
}

export interface CharacterFashion {
  casualStyle?: string;
  workAttire?: string;
  formalWear?: string;
  sleepwear?: string;
  signatureItem?: string;
  shoePreference?: string;
  styleReflection?: string;
  styleEvolution?: string;
}

export interface CharacterVoice {
  toneOfVoice?: string;
  speechPatterns?: string;
  accentStrength?: string;
  nervousHabits?: string;
  posture?: string;
  defaultExpressions?: string;
  laughStyle?: string;
  angerStyle?: string;
  fearStyle?: string;
}

export interface CharacterPersonality {
  coreType?: string;
  strengths?: string[];
  flaws?: string[];
  fears?: string[];
  desires?: string[];
  publicPersona?: string;
  privateReality?: string;
  treatmentOfStrangers?: string;
  treatmentOfLovedOnes?: string;
}

export interface CharacterBackstory {
  upbringing?: string;
  formativeEvents?: string[];
  definingRelationships?: string[];
  whatTheyLost?: string;
  whatTheySeek?: string;
}

export interface CharacterStoryRole {
  archetype?: string;
  relationshipToMainCharacter?: string;
  goal?: string;
  obstacle?: string;
  arc?: string;
}

export interface CharacterReference {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  role: "protagonist" | "supporting" | "minor" | "background";
  portraitUrl?: string;
  identity?: CharacterIdentity;
  appearance?: CharacterAppearance;
  hair?: CharacterHair;
  fashion?: CharacterFashion;
  voice?: CharacterVoice;
  personality?: CharacterPersonality;
  backstory?: CharacterBackstory;
  storyRole?: CharacterStoryRole;
}

export interface BookOutline {
  chapters: Chapter[];
  openPromises: string[];
  resolvedPromises: string[];
  characters?: CharacterReference[];
  visualStyleGuide?: string;
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

export const AUTOMATION_OPTIONS: { value: AutomationLevel; label: string; description: string; locked?: boolean }[] = [
  { value: "guided", label: "Guided", description: "Step-by-step generation with approval at each section. Best quality." },
  { value: "assisted", label: "Assisted", description: "Generates paragraphs/sections, you review before continuing." },
  { value: "semi-auto", label: "Semi-Auto", description: "Generates full chapters, you approve per chapter." },
  { value: "auto-draft", label: "Auto Draft", description: "Generates large portions automatically. Requires Turbo unlock.", locked: true },
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

// IELTS Band mapping (implicit, not shown to users)
export type IELTSBand = 5 | 6 | 7 | 8 | 9;

export interface AudienceOption {
  value: string;
  label: string;
  ieltsBand: IELTSBand;
}

// Ordered by IELTS band (lowest to highest complexity)
export const AUDIENCE_OPTIONS: AudienceOption[] = [
  // Band 5 (least complex)
  { value: "children-1-9", label: "Children (1–9)", ieltsBand: 5 },
  
  // Band 6
  { value: "older-children-10-15", label: "Older Children (10–15)", ieltsBand: 6 },
  
  // Band 7
  { value: "16-plus", label: "16+ years", ieltsBand: 7 },
  { value: "general-readers", label: "General Readers", ieltsBand: 7 },
  
  // Band 8
  { value: "academics-undergraduate", label: "Academics (undergraduate level)", ieltsBand: 8 },
  { value: "industry-experts", label: "Industry Experts (non-research roles)", ieltsBand: 8 },
  { value: "professionals", label: "Professionals (general workplace)", ieltsBand: 8 },
  
  // Band 9 (highest complexity)
  { value: "scholars-researchers", label: "Scholars/Researchers (academic research level)", ieltsBand: 9 },
  { value: "specialized-experts", label: "Specialized Industry Experts (technical or research-focused)", ieltsBand: 9 },
];

// Map each book type to its reasonable audience options
export const BOOK_TYPE_AUDIENCES: Record<BookType, string[]> = {
  // Fiction
  novel: ["16-plus", "general-readers", "academics-undergraduate"],
  "fiction-serial": ["16-plus", "general-readers"],
  "short-story": ["16-plus", "general-readers", "academics-undergraduate"],
  children: ["children-1-9", "older-children-10-15"],
  comic: ["older-children-10-15", "16-plus", "general-readers"],

  // Non-Fiction
  biography: ["16-plus", "general-readers", "academics-undergraduate"],
  memoir: ["16-plus", "general-readers"],
  "self-help": ["16-plus", "general-readers", "professionals"],
  psychology: ["general-readers", "academics-undergraduate", "professionals", "scholars-researchers"],
  business: ["general-readers", "academics-undergraduate", "professionals", "industry-experts"],
  finance: ["general-readers", "academics-undergraduate", "professionals", "industry-experts", "specialized-experts"],
  accounting: ["general-readers", "academics-undergraduate", "professionals", "industry-experts", "specialized-experts"],
  economics: ["general-readers", "academics-undergraduate", "professionals", "industry-experts", "scholars-researchers"],
  travel: ["older-children-10-15", "16-plus", "general-readers"],
  history: ["16-plus", "general-readers", "academics-undergraduate", "scholars-researchers"],
  culture: ["16-plus", "general-readers", "academics-undergraduate", "scholars-researchers"],

  // Educational
  technology: ["16-plus", "general-readers", "academics-undergraduate", "professionals", "industry-experts"],
  programming: ["16-plus", "academics-undergraduate", "professionals", "industry-experts", "specialized-experts"],
  "ai-ml": ["academics-undergraduate", "professionals", "industry-experts", "specialized-experts", "scholars-researchers"],
  engineering: ["academics-undergraduate", "professionals", "industry-experts", "specialized-experts", "scholars-researchers"],
  "science-academic": ["academics-undergraduate", "scholars-researchers", "specialized-experts"],
  "science-popular": ["16-plus", "general-readers", "academics-undergraduate"],
  textbook: ["older-children-10-15", "16-plus", "academics-undergraduate", "scholars-researchers"],
  cookbook: ["older-children-10-15", "16-plus", "general-readers"],

  // Creative
  poetry: ["16-plus", "general-readers", "academics-undergraduate", "scholars-researchers"],
  drama: ["16-plus", "general-readers", "academics-undergraduate"],
  "illustrated-guide": ["older-children-10-15", "16-plus", "general-readers"],

  // Specialized
  magazine: ["16-plus", "general-readers", "professionals"],
  reference: ["professionals", "industry-experts", "specialized-experts", "scholars-researchers"],
  custom: ["children-1-9", "older-children-10-15", "16-plus", "general-readers", "academics-undergraduate", "industry-experts", "professionals", "scholars-researchers", "specialized-experts"],
};

// Helper to get IELTS band from audience value
export const getIELTSBandForAudience = (audienceValue: string): IELTSBand => {
  const option = AUDIENCE_OPTIONS.find(opt => opt.value === audienceValue);
  return option?.ieltsBand ?? 7; // Default to Band 7 (General Readers)
};

// Legacy array for backward compatibility
export const AUDIENCE_PRESETS = AUDIENCE_OPTIONS.map(opt => opt.value);

export const WORD_COUNT_PRESETS = [
  { value: 10000, label: "Short", description: "~10k words — short stories, guides" },
  { value: 25000, label: "Novella", description: "~25k words — novellas, manuals" },
  { value: 50000, label: "Standard", description: "~50k words — standard novels" },
  { value: 75000, label: "Long", description: "~75k words — detailed novels" },
  { value: 100000, label: "Epic", description: "~100k words — epic narratives" },
] as const;

export const GENRE_PRESETS: Record<BookCategory, string[]> = {
  fiction: [
    "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller", 
    "Literary Fiction", "Historical Fiction", "Adventure", 
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
    hookFrequency: 5,
    entityComplexity: 5,
    spatialScope: "regional",
    perspectiveMultiplexing: 3,
    temporalContext: {
      era: "contemporary",
      timelineStructure: "linear",
    },
    structureControls: {
      chapterCount: "flexible",
      sectionsPerChapter: 4,
      subsectionCount: "flexible",
      titlesRequired: true,
      targetWordCount: 50000,
    },
    automationLevel: "guided",
    depthLevel: "intermediate",
    imageGeneration: false,
    autoResume: true,
    divergenceAllowed: false,
    teaserStyle: "none",
  };

  // Adjust defaults based on category
  switch (category) {
    case "fiction":
      return {
        ...baseControls,
        creativity: 7,
        hookFrequency: 7,
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
