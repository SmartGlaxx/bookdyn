import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SortableCardProps {
  id: string;
  className?: string;
  children: ReactNode;
  /** kept for backwards-compat; ignored. */
  handleClassName?: string;
}

/**
 * The entire card is the drag handle. Inner inputs/buttons still receive
 * focus and clicks because the dnd-kit PointerSensor only activates after
 * the configured movement distance.
 */
export function SortableCard({ id, className, children }: SortableCardProps) {
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
      {...attributes}
      {...listeners}
      className={cn(
        "relative rounded-xl border bg-card/60 backdrop-blur-sm cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {children}
    </div>
  );
}