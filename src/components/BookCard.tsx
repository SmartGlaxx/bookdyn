import { useState } from "react";
import { motion } from "framer-motion";
import { Book as BookIcon, Clock, FileText, MoreVertical, Play, Trash2, ImagePlus, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Book as BookType, BOOK_TYPE_INFO } from "@/types/book";
import { CoverGeneratorModal } from "@/components/CoverGeneratorModal";

interface BookCardProps {
  book: BookType;
  onSelect: (book: BookType) => void;
  onDelete: (id: string) => void;
  onUpdateCover: (id: string, coverUrl: string) => void;
  index: number;
}

const statusColors = {
  planning: "amber",
  ready_to_write: "secondary",
  writing: "success",
  completed: "default",
  paused: "warning",
} as const;

const statusLabels = {
  planning: "Planning",
  ready_to_write: "Ready",
  writing: "Writing",
  completed: "Completed",
  paused: "Paused",
};

const BookCard = ({ book, onSelect, onDelete, onUpdateCover, index }: BookCardProps) => {
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const hasCover = !!book.coverUrl;

  const typeInfo = BOOK_TYPE_INFO[book.bookType] ?? {
    label: book.bookType.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" "),
    icon: "📘",
    description: "Legacy book type",
    category: "specialized" as const,
  };

  const chapterCount = book.outline?.chapters.length || 0;

  // Cover image generation is temporarily disabled for the test launch.
  // To re-enable, restore the menu item below.
  const menuContent = (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(book); }}>
        <Play className="w-4 h-4 mr-2" />
        Open
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="opacity-60">
        {hasCover ? <Image className="w-4 h-4 mr-2" /> : <ImagePlus className="w-4 h-4 mr-2" />}
        {hasCover ? "Change Book Cover" : "Add Book Cover"} (coming soon)
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <div
          className="relative aspect-[2/3] rounded-[2px_6px_6px_2px] overflow-hidden cursor-pointer group"
          style={{
            boxShadow: "4px 4px 0px rgba(0,0,0,0.3), 8px 8px 16px rgba(0,0,0,0.4)",
          }}
          onClick={() => onSelect(book)}
        >
          {/* Left spine */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/30 z-10" />

          {hasCover ? (
            /* ── Cover Card ── */
            <>
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center">
                <h3 className="text-white font-serif text-lg font-bold text-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                  {book.title}
                </h3>
              </div>
              {/* Menu on hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 text-white h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  {menuContent}
                </DropdownMenu>
              </div>
            </>
          ) : (
            /* ── Generic Card ── */
            <div className="w-full h-full bg-card border border-border flex flex-col p-4 pl-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="font-serif font-bold text-sm leading-tight line-clamp-2 text-foreground">
                    {book.title}
                  </h3>
                  {book.subtitle && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{book.subtitle}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  {menuContent}
                </DropdownMenu>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant={statusColors[book.status]} className="text-[10px] px-1.5 py-0">
                  {statusLabels[book.status]}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {typeInfo.label}
                </Badge>
              </div>

              {/* Theme */}
              <p className="text-[11px] text-muted-foreground line-clamp-3 flex-1">{book.theme}</p>

              {/* Footer */}
              <div className="mt-auto pt-2 space-y-1">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <BookIcon className="w-3 h-3" />
                    {chapterCount}ch
                  </span>
                  <span className="flex items-center gap-0.5">
                    <FileText className="w-3 h-3" />
                    {book.wordCount.toLocaleString()}w
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(book.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <CoverGeneratorModal
        open={coverModalOpen}
        onOpenChange={setCoverModalOpen}
        book={book}
        onCoverSelected={(url) => onUpdateCover(book.id, url)}
      />
    </>
  );
};

export default BookCard;
