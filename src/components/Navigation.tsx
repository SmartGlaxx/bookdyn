import { BookOpen, Sparkles, Plus, Flame, Zap, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTurbo } from "@/hooks/useTurbo";
import { AppSidebar } from "@/components/AppSidebar";

interface NavigationProps {
  onCreateBook: () => void;
}

const Navigation = ({ onCreateBook }: NavigationProps) => {
  const turbo = useTurbo();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border" style={{ height: 64 }}>
      <div className="container max-w-6xl mx-auto px-4 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, hsl(35 92% 48%) 0%, hsl(25 95% 55%) 100%)",
              }}
            >
              <BookOpen className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.01em",
              }}
            >
              Authoryti
            </h1>
          </a>

          <div className="flex items-center gap-3">
            <TooltipProvider delayDuration={300}>
              {/* Streak badge */}
              {!turbo.isLoading && turbo.streakDays > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 cursor-help">
                      <Flame className="w-3.5 h-3.5" />
                      {turbo.streakDays}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Your writing streak — consecutive days you've been active. Keep it going!
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Words written badge */}
              {!turbo.isLoading && turbo.totalWordsWritten > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary cursor-help">
                      <PenTool className="w-3.5 h-3.5" />
                      {(turbo.totalWordsWritten / 1000).toFixed(1)}K
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Total words written across all your books.
                  </TooltipContent>
                </Tooltip>
              )}

              {turbo.turboUnlocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 cursor-help">
                      <Zap className="w-3.5 h-3.5" />
                      Turbo
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Turbo mode unlocked! Enjoy boosted word generation capacity.
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            <Button variant="hero" size="sm" onClick={onCreateBook} className="hidden sm:inline-flex">
              <Sparkles className="w-4 h-4" />
              New Book
            </Button>
            <Button variant="hero" size="icon" onClick={onCreateBook} className="sm:hidden">
              <Plus className="w-5 h-5" />
            </Button>

            <AppSidebar />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
