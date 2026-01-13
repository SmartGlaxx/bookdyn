import { Menu, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  onCreateBook: () => void;
}

const Navigation = ({ onCreateBook }: NavigationProps) => {
  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl">BookForge</h1>
              <p className="text-xs text-muted-foreground">AI Book Creation Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="hero" size="sm" onClick={onCreateBook}>
              <Sparkles className="w-4 h-4" />
              New Book
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
