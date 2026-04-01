import { BookOpen, Sparkles, Plus, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTurbo } from "@/hooks/useTurbo";
import { AppSidebar } from "@/components/AppSidebar";

interface NavigationProps {
  onCreateBook: () => void;
}

const Navigation = ({ onCreateBook }: NavigationProps) => {
  const turbo = useTurbo();

  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl">Authoryti</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Book Creation</p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            {/* Streak badge */}
            {!turbo.isLoading && turbo.streakDays > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-500">
                <Flame className="w-3.5 h-3.5" />
                {turbo.streakDays}
              </div>
            )}

            {turbo.turboUnlocked && (
              <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                <Zap className="w-3.5 h-3.5" />
                Turbo
              </div>
            )}

            <Button variant="hero" size="sm" onClick={onCreateBook} className="hidden sm:inline-flex">
              <Sparkles className="w-4 h-4" />
              New Book
            </Button>
            <Button variant="hero" size="icon" onClick={onCreateBook} className="sm:hidden">
              <Plus className="w-5 h-5" />
            </Button>

            <UserMenuDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
