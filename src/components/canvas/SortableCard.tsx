import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableCardProps {
  id: string;
  className?: string;
  children: ReactNode;
  handleClassName?: string;
}

export function SortableCard({ id, className, children, handleClassName }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative rounded-xl border bg-card/60 backdrop-blur-sm", className)}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-1.5 left-1.5 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing",
          handleClassName
        )}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {children}
    </div>
  );
}