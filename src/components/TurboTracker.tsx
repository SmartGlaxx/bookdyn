import { motion } from "framer-motion";
import { Flame, PenTool, Zap, Lock, Unlock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TurboTrackerProps {
  streakDays: number;
  streakProgress: number;
  totalWordsWritten: number;
  wordsProgress: number;
  turboUnlocked: boolean;
  turboWordsRemaining: number;
  turboWordsCapacity: number;
  turboWordsProgress: number;
  streakGoal: number;
  wordsGoal: number;
  compact?: boolean;
}

export function TurboTracker({
  streakDays,
  streakProgress,
  totalWordsWritten,
  wordsProgress,
  turboUnlocked,
  turboWordsRemaining,
  turboWordsCapacity,
  turboWordsProgress,
  streakGoal,
  wordsGoal,
  compact = false,
}: TurboTrackerProps) {
  if (compact) {
    return (
      <div className="space-y-2 px-2 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Streak
          </span>
          <span className="font-semibold">{streakDays} days</span>
        </div>
        <Progress value={streakProgress} className="h-1.5" variant="warning" />

        <div className="flex items-center justify-between text-xs mt-1">
          <span className="flex items-center gap-1">
            <PenTool className="w-3.5 h-3.5 text-primary" />
            Words
          </span>
          <span className="font-semibold">{(totalWordsWritten / 1000).toFixed(0)}K</span>
        </div>
        <Progress value={wordsProgress} className="h-1.5" />

        <div className="flex items-center justify-between text-xs mt-1">
          <span className="flex items-center gap-1">
            {turboUnlocked ? (
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            Turbo
          </span>
          <span className={cn("font-semibold text-xs", turboUnlocked ? "text-amber-500" : "text-muted-foreground")}>
            {turboUnlocked ? `${(turboWordsRemaining / 1000).toFixed(0)}K left` : "Locked"}
          </span>
        </div>
        {turboUnlocked && <Progress value={turboWordsProgress} className="h-1.5" variant="accent" />}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className="font-serif font-semibold text-lg">Turbo & Progress</h3>
      </div>

      {/* Streak */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">Writing Streak</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {streakDays} / {streakGoal} days
          </span>
        </div>
        <Progress value={streakProgress} className="h-2.5" variant="warning" />
        <p className="text-xs text-muted-foreground">
          {streakDays >= streakGoal
            ? "🔥 Streak goal reached!"
            : `${streakGoal - streakDays} more days to unlock Turbo`}
        </p>
      </div>

      {/* Words Written */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Words Written</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {(totalWordsWritten / 1000).toFixed(1)}K / {(wordsGoal / 1000).toFixed(0)}K
          </span>
        </div>
        <Progress value={wordsProgress} className="h-2.5" />
        <p className="text-xs text-muted-foreground">
          {totalWordsWritten >= wordsGoal
            ? "✍️ Word goal reached!"
            : `${((wordsGoal - totalWordsWritten) / 1000).toFixed(1)}K more words to go`}
        </p>
      </div>

      {/* Turbo Status */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {turboUnlocked ? (
              <Unlock className="w-5 h-5 text-amber-500" />
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-medium">
              {turboUnlocked ? "Turbo Active" : "Turbo Locked"}
            </span>
          </div>
          {turboUnlocked && (
            <span className="text-xs font-semibold text-amber-500">
              ⚡ {(turboWordsRemaining / 1000).toFixed(0)}K / {(turboWordsCapacity / 1000).toFixed(0)}K words
            </span>
          )}
        </div>

        {turboUnlocked ? (
          <div className="space-y-1">
            <Progress value={turboWordsProgress} className="h-2" variant="accent" />
            <p className="text-xs text-muted-foreground">
              Auto Draft mode available. Turbo words refill each cycle.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Maintain a {streakGoal}-day streak and write {(wordsGoal / 1000).toFixed(0)}K+ words to unlock Auto Draft mode.
          </p>
        )}
      </div>
    </motion.div>
  );
}
