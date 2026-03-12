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
export type POV = "first-person" | "second-person" | "third-person-limited" | "third-person-omniscient" | "third-person-multi" | "epistolary" | "multiple";
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
export type BookCategory = "creative" | "personal" | "business" | "academic" | "lifestyle" | "custom";

export const BOOK_CATEGORIES: Record<BookCategory, { label: string; description: string }> = {
  creative: { label: "Creative & Narrative", description: "Stories, novels, and creative narratives" },
  personal: { label: "Personal & Life", description: "Biographies, memoirs, and personal development" },
  business: { label: "Business & Tech", description: "Business, finance, and technology content" },
  academic: { label: "Academic & Reference", description: "Educational materials and scholarly content" },
  lifestyle: { label: "Lifestyle & Practical", description: "Cookbooks, travel, and practical guides" },
  custom: { label: "Custom", description: "Flexible format for unique needs" },
};

export const BOOK_TYPE_INFO: Record<BookType, { label: string; icon: string; description: string; category: BookCategory }> = {
  // Creative & Narrative
  novel: { label: "Novel", icon: "📖", description: "Long-form fiction with deep character development and complex plots", category: "creative" },
  "fiction-serial": { label: "Serialized Fiction", icon: "📚", description: "Episodic stories designed for ongoing releases", category: "creative" },
  "short-story": { label: "Short Story", icon: "📝", description: "Compact narrative with a single arc", category: "creative" },
  children: { label: "Children's Book", icon: "🎨", description: "Age-appropriate stories with simple language", category: "creative" },
  comic: { label: "Comic / Graphic Novel", icon: "💬", description: "Visual storytelling with panels and dialogue", category: "creative" },
  drama: { label: "Drama / Screenplay", icon: "🎬", description: "Script format for performance", category: "creative" },
  poetry: { label: "Poetry Collection", icon: "✨", description: "Thematic verse compilation", category: "creative" },

  // Personal & Life
  biography: { label: "Biography", icon: "👤", description: "Life story of a real person", category: "personal" },
  memoir: { label: "Memoir", icon: "📔", description: "Personal life experiences and reflections", category: "personal" },
  "self-help": { label: "Self-Help", icon: "🌟", description: "Practical guidance for personal improvement", category: "personal" },
  psychology: { label: "Psychology", icon: "🧠", description: "Mental health and behavioral insights", category: "personal" },

  // Business, Finance & Tech
  business: { label: "Business", icon: "💼", description: "Corporate strategy and management", category: "business" },
  finance: { label: "Finance", icon: "💰", description: "Investment and financial planning", category: "business" },
  accounting: { label: "Accounting", icon: "📊", description: "Financial record-keeping and analysis", category: "business" },
  economics: { label: "Economics", icon: "📈", description: "Market and policy analysis", category: "business" },
  technology: { label: "Technology", icon: "💻", description: "Tech trends and digital transformation", category: "business" },
  programming: { label: "Programming", icon: "⚙️", description: "Code and development practices", category: "business" },
  "ai-ml": { label: "AI & Machine Learning", icon: "🤖", description: "Artificial intelligence and ML concepts", category: "business" },
  engineering: { label: "Engineering", icon: "🔧", description: "Technical design and problem-solving", category: "business" },

  // Academic & Reference
  textbook: { label: "Textbook", icon: "📕", description: "Educational material for structured learning", category: "academic" },
  reference: { label: "Reference Manual", icon: "📋", description: "Lookup and troubleshooting guide", category: "academic" },
  history: { label: "History", icon: "🏛️", description: "Historical events and analysis", category: "academic" },
  culture: { label: "Culture", icon: "🎭", description: "Cultural practices and social studies", category: "academic" },
  "science-academic": { label: "Science (Academic)", icon: "🔬", description: "Scholarly scientific research", category: "academic" },
  "science-popular": { label: "Science (Popular)", icon: "🧪", description: "Accessible science explanations", category: "academic" },

  // Lifestyle & Practical
  cookbook: { label: "Cookbook", icon: "🍳", description: "Recipes and culinary techniques", category: "lifestyle" },
  travel: { label: "Travel Guide", icon: "✈️", description: "Destination information and itineraries", category: "lifestyle" },
  "illustrated-guide": { label: "Illustrated Guide", icon: "🖼️", description: "Visual how-to content", category: "lifestyle" },
  magazine: { label: "Magazine", icon: "📰", description: "Mixed-format articles and features", category: "lifestyle" },

  // Custom
  custom: { label: "Custom Project", icon: "🎯", description: "Flexible format for unique needs", category: "custom" },
};

export const POV_OPTIONS: { value: POV; label: string; description: string }[] = [
  { value: "first-person", label: "First Person (I/me)", description: "Intimate, subjective narrator" },
  { value: "second-person", label: "Second Person (you)", description: "Direct reader address" },
  { value: "third-person-limited", label: "Third Person Limited (he/she/they)", description: "Follows one character" },
  { value: "third-person-omniscient", label: "Third Person Omniscient", description: "All-knowing narrator" },
  { value: "third-person-multi", label: "Third Person Multiple", description: "Shifts between characters" },
  { value: "epistolary", label: "Epistolary (letters/documents)", description: "Document-based narrative" },
  { value: "multiple", label: "Multiple POVs", description: "Various perspectives mixed" },
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
    automationLevel: "semi-autonomous",
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
