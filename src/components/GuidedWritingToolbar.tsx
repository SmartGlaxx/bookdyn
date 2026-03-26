import { useState } from "react";
import { Pen, MessageSquare, Loader2, PenLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GuidedWritingToolbarProps {
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  subsectionTitle: string;
  currentContent: string;
  subsectionGoal?: string;
  onContentAppend: (newContent: string) => void;
  onContentReplace: (newContent: string) => void;
  onManualAdd: (type: "text" | "dialogue") => void;
}

export function GuidedWritingToolbar({
  bookId,
  bookTitle,
  chapterTitle,
  subsectionTitle,
  currentContent,
  subsectionGoal,
  onContentAppend,
  onContentReplace,
  onManualAdd,
}: GuidedWritingToolbarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const callGuidedAction = async (action: "continue" | "dialogue") => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-paragraph", {
        body: {
          paragraph: currentContent.split(/\n\n+/).filter(Boolean).pop() || currentContent,
          bookTitle,
          chapterTitle,
          subsectionTitle,
          guidedAction: action,
          fullContent: currentContent,
          subsectionGoal,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.rewritten || data.content || "";
      onContentAppend("\n\n" + result);
      toast.success(action === "continue" ? "Content continued" : "Dialogue added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => callGuidedAction("continue")}
        disabled={isLoading}
        className="gap-1.5 text-xs h-7"
      >
        {loading === "continue" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pen className="w-3 h-3" />}
        Continue Writing
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-1.5 text-xs h-7"
          >
            <PenLine className="w-3 h-3" />
            Manual Write
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onManualAdd("text")}>
            <PenLine className="w-3.5 h-3.5 mr-2" />
            Add Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onManualAdd("dialogue")}>
            <MessageSquare className="w-3.5 h-3.5 mr-2" />
            Add Dialogue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
