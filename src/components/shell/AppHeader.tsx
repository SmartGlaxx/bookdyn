import { BookOpen, Plus, Flame, HelpCircle, ChevronDown, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTurbo } from "@/hooks/useTurbo";
import { useBooks } from "@/hooks/useBooks";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";

interface Props {
  projectLabel?: string;
  onMenuClick?: () => void;
}

export function AppHeader({ projectLabel, onMenuClick }: Props) {
  const navigate = useNavigate();
  const turbo = useTurbo();
  const { books } = useBooks();
  const location = useLocation();

  const currentLabel = useMemo(() => {
    if (projectLabel) return projectLabel;
    const match = location.pathname.match(/^\/dashboard\/([^/]+)/);
    if (match) {
      const id = match[1];
      const book = books.find((b) => b.id === id);
      if (book) return book.title;
      if (id === "new-book") return "New Book Project";
    }
    return "Library";
  }, [projectLabel, location.pathname, books]);

  return (
    <header
      className="sticky top-0 z-40 h-16 border-b border-border bg-background/90 backdrop-blur flex items-center gap-2 sm:gap-3 px-3 sm:px-6"
    >
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
      >
        <div className="p-1.5 rounded-md bg-primary/15 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" strokeWidth={2.2} />
        </div>
        <span className="font-serif font-bold text-[20px] tracking-tight hidden sm:inline">
          Authoryti
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1 sm:ml-4 inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md hover:bg-muted/50 text-sm font-medium max-w-[140px] sm:max-w-[220px]">
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Your projects
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("/dashboard")}>Library</DropdownMenuItem>
          {books.slice(0, 8).map((b) => (
            <DropdownMenuItem key={b.id} onClick={() => navigate(`/dashboard/${b.id}`)} className="truncate">
              {b.title || "Untitled"}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/dashboard/new-book")}>
            <Plus className="w-3.5 h-3.5 mr-2" /> New book
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {!turbo.isLoading && turbo.streakDays > 0 && (
        <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400">
          <Flame className="w-3.5 h-3.5" />
          {turbo.streakDays}
        </div>
      )}

      <Button variant="hero" size="sm" onClick={() => navigate("/dashboard/new-book")} className="rounded-full px-3 sm:px-4">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">New Book</span>
      </Button>

      <button
        type="button"
        aria-label="Help"
        className="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
        onClick={() => window.open("https://docs.authoryti.com", "_blank")}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </header>
  );
}