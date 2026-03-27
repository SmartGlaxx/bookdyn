import { motion } from "framer-motion";
import { Zap, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UnifiedMeterProps {
  /** Normal credits used */
  creditsUsed: number;
  /** Normal credits limit */
  creditsLimit: number;
  /** Whether Turbo is unlocked */
  turboUnlocked: boolean;
  /** Remaining Turbo words */
  turboWordsRemaining: number;
  /** Total Turbo word capacity */
  turboWordsCapacity: number;
  /** Whether the user's plan supports Turbo */
  hasTurboPlanAccess: boolean;
  /** Compact variant for dropdown */
  compact?: boolean;
}

export function UnifiedMeter({
  creditsUsed,
  creditsLimit,
  turboUnlocked,
  turboWordsRemaining,
  turboWordsCapacity,
  hasTurboPlanAccess,
  compact = false,
}: UnifiedMeterProps) {
  const normalRemaining = Math.max(0, creditsLimit - creditsUsed);
  const normalPercent = creditsLimit > 0 ? (normalRemaining / creditsLimit) * 100 : 0;

  const turboPercent = turboWordsCapacity > 0
    ? (turboWordsRemaining / turboWordsCapacity) * 100
    : 0;

  const showTurbo = hasTurboPlanAccess && turboUnlocked && turboWordsCapacity > 0;

  // For the unified bar: turbo takes up a proportional section on the left
  // We scale so turbo section is roughly 30% of the bar when active
  const turboBarWidth = showTurbo ? 30 : 0;
  const normalBarWidth = 100 - turboBarWidth;

  if (compact) {
    return (
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Power Meter</span>
          <span className="font-semibold text-foreground">
            {normalRemaining} credits left
          </span>
        </div>

        {/* Unified bar */}
        <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden flex">
          {showTurbo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-full relative overflow-hidden rounded-l-full"
                    style={{ width: `${turboBarWidth}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${turboBarWidth}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    {/* Turbo fill */}
                    <motion.div
                      className="h-full turbo-glow-bar"
                      style={{ width: `${turboPercent}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${turboPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-semibold">⚡ Turbo Power: {(turboWordsRemaining / 1000).toFixed(0)}K words</p>
                  <p className="text-muted-foreground">Used for Auto Draft Mode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Divider */}
          {showTurbo && (
            <div className="w-px h-full bg-background/60 shrink-0" />
          )}

          {/* Normal fill */}
          <div
            className="h-full relative overflow-hidden"
            style={{ width: `${normalBarWidth}%` }}
          >
            <motion.div
              className="h-full bg-primary/80 rounded-r-full"
              style={{ width: `${normalPercent}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${normalPercent}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {showTurbo && (
            <span className="flex items-center gap-0.5 turbo-text-glow font-semibold">
              <Zap className="w-3 h-3" />
              {(turboWordsRemaining / 1000).toFixed(0)}K Turbo
            </span>
          )}
          {!showTurbo && hasTurboPlanAccess && (
            <span className="flex items-center gap-0.5">
              <Lock className="w-3 h-3" />
              Turbo Locked
            </span>
          )}
          {!hasTurboPlanAccess && (
            <span className="flex items-center gap-0.5">
              <Crown className="w-3 h-3" />
              Pro+ for Turbo
            </span>
          )}
          <span>{normalRemaining} / {creditsLimit} credits</span>
        </div>
      </div>
    );
  }

  // Full-size variant
  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold font-serif flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-primary" />
          Power Meter
        </h4>
        <span className="text-xs text-muted-foreground font-medium">
          {normalRemaining} / {creditsLimit} credits
        </span>
      </div>

      {/* Unified bar */}
      <div className="relative h-4 w-full rounded-full bg-secondary overflow-hidden flex shadow-inner">
        {showTurbo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="h-full relative overflow-hidden rounded-l-full cursor-help"
                  style={{ width: `${turboBarWidth}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${turboBarWidth}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <motion.div
                    className="h-full turbo-glow-bar"
                    style={{ width: `${turboPercent}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${turboPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold text-sm">⚡ Turbo Power: {(turboWordsRemaining / 1000).toFixed(0)}K / {(turboWordsCapacity / 1000).toFixed(0)}K words</p>
                <p className="text-xs text-muted-foreground">Used exclusively for Auto Draft Mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showTurbo && (
          <div className="w-0.5 h-full bg-background/70 shrink-0" />
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full relative overflow-hidden cursor-help"
                style={{ width: `${normalBarWidth}%` }}
              >
                <motion.div
                  className="h-full bg-primary/80 rounded-r-full"
                  style={{ width: `${normalPercent}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${normalPercent}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-sm">Normal Credits: {normalRemaining} / {creditsLimit}</p>
              <p className="text-xs text-muted-foreground">Used for Guided, Assisted & Semi-Auto modes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        {showTurbo ? (
          <span className="flex items-center gap-1 turbo-text-glow font-semibold">
            <Zap className="w-3.5 h-3.5" />
            Turbo: {(turboWordsRemaining / 1000).toFixed(0)}K words
          </span>
        ) : hasTurboPlanAccess ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Unlock Auto Draft: 30-day streak + 500K words
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Crown className="w-3.5 h-3.5" />
            Upgrade to Pro+ for Turbo
          </span>
        )}
        <span className="text-muted-foreground font-medium">
          {normalRemaining} credits remaining
        </span>
      </div>
    </div>
  );
}
