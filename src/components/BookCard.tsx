import { motion } from "framer-motion";
import { Book, Clock, FileText, MoreVertical, Play, Pause, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Book as BookType, BOOK_TYPE_INFO } from "@/types/book";

interface BookCardProps {
  book: BookType;
  onSelect: (book: BookType) => void;
  onDelete: (id: string) => void;
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

const BookCard = ({ book, onSelect, onDelete, index }: BookCardProps) => {
  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  
  const calculateProgress = () => {
    if (!book.outline) return 0;
    const totalSubsections = book.outline.chapters.reduce(
      (acc, ch) => acc + ch.subsections.length,
      0
    );
    const completedSubsections = book.outline.chapters.reduce(
      (acc, ch) => acc + ch.subsections.filter((s) => s.status === "completed").length,
      0
    );
    return totalSubsections > 0 ? Math.round((completedSubsections / totalSubsections) * 100) : 0;
  };

  const progress = calculateProgress();
  const chapterCount = book.outline?.chapters.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        variant="interactive"
        className="h-full group aspect-square flex flex-col"
        onClick={() => onSelect(book)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
              {book.subtitle && (
                <CardDescription className="line-clamp-1">{book.subtitle}</CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(book); }}>
                  <Play className="w-4 h-4 mr-2" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusColors[book.status]}>{statusLabels[book.status]}</Badge>
            <Badge variant="outline">{typeInfo.label}</Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{book.theme}</p>


          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Book className="w-4 h-4" />
              <span>{chapterCount} chapters</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{book.wordCount.toLocaleString()} words</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Updated {new Date(book.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookCard;
