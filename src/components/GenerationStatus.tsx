import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  BookOpen, 
  PenTool, 
  Image, 
  FileText, 
  CheckCircle,
  Loader2,
  AlertCircle,
  Pause,
} from "lucide-react";
import { GenerationPhase } from "@/hooks/useBookGeneration";
import { cn } from "@/lib/utils";

interface GenerationStatusProps {
  phase: GenerationPhase;
  currentChapter: number;
  currentSubsection: number;
  totalChapters: number;
  totalSubsections: number;
}

const phaseConfig: Record<GenerationPhase, { 
  icon: typeof Sparkles; 
  label: string; 
  description: string;
  color: string;
}> = {
  idle: { 
    icon: Sparkles, 
    label: "Ready", 
    description: "Ready to begin generation",
    color: "text-muted-foreground",
  },
  planning: { 
    icon: BookOpen, 
    label: "Planning", 
    description: "Analyzing book structure...",
    color: "text-blue-500",
  },
  "generating-outline": { 
    icon: FileText, 
    label: "Creating Outline", 
    description: "Building chapter structure...",
    color: "text-purple-500",
  },
  writing: { 
    icon: PenTool, 
    label: "Writing", 
    description: "Generating content...",
    color: "text-primary",
  },
  "generating-image": { 
    icon: Image, 
    label: "Illustrating", 
    description: "Creating illustration...",
    color: "text-pink-500",
  },
  summarizing: { 
    icon: FileText, 
    label: "Summarizing", 
    description: "Creating summary...",
    color: "text-cyan-500",
  },
  completed: { 
    icon: CheckCircle, 
    label: "Complete", 
    description: "Book generation finished!",
    color: "text-success",
  },
  paused: { 
    icon: Pause, 
    label: "Paused", 
    description: "Generation paused",
    color: "text-amber-500",
  },
  error: { 
    icon: AlertCircle, 
    label: "Error", 
    description: "An error occurred",
    color: "text-destructive",
  },
};

export function GenerationStatus({ 
  phase, 
  currentChapter, 
  currentSubsection,
  totalChapters,
  totalSubsections,
}: GenerationStatusProps) {
  const config = phaseConfig[phase];
  const Icon = config.icon;
  const isActive = phase === "writing" || phase === "generating-outline" || phase === "generating-image" || phase === "summarizing";

  const progress = totalSubsections > 0 
    ? Math.round(((currentChapter * (totalSubsections / totalChapters) + currentSubsection) / totalSubsections) * 100)
    : 0;

  return (
    <motion.div 
      className="flex items-center gap-4 p-4 rounded-xl glass border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        isActive ? "bg-primary/10 animate-pulse" : "bg-muted"
      )}>
        <Icon className={cn("w-6 h-6", config.color, isActive && "animate-pulse")} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", config.color)}>{config.label}</span>
          {isActive && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{config.description}</p>
        
        {phase === "writing" && totalChapters > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Chapter {currentChapter + 1}/{totalChapters} · Section {currentSubsection + 1}
          </p>
        )}
      </div>

      {totalSubsections > 0 && phase !== "idle" && phase !== "completed" && (
        <div className="text-right">
          <div className="text-2xl font-serif font-bold text-primary">{progress}%</div>
          <p className="text-xs text-muted-foreground">progress</p>
        </div>
      )}
    </motion.div>
  );
}
