import { useState } from "react";
import { Pen, RefreshCw, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}: GuidedWritingToolbarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const callGuidedAction = async (action: "continue" | "rewrite" | "improve" | "dialogue") => {
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
      if (action === "continue" || action === "dialogue") {
        onContentAppend("\n\n" + result);
      } else {
        // For rewrite/improve, replace the last paragraph
        const paragraphs = currentContent.split(/\n\n+/).filter(Boolean);
        if (paragraphs.length > 0) {
          paragraphs[paragraphs.length - 1] = result;
          onContentReplace(paragraphs.join("\n\n"));
        }
      }
      toast.success(
        action === "continue" ? "Content continued" :
        action === "rewrite" ? "Sentence rewritten" :
        action === "improve" ? "Sentence improved" :
        "Dialogue added"
      );
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => callGuidedAction("rewrite")}
        disabled={isLoading}
        className="gap-1.5 text-xs h-7"
      >
        {loading === "rewrite" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Rewrite Sentence
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => callGuidedAction("improve")}
        disabled={isLoading}
        className="gap-1.5 text-xs h-7"
      >
        {loading === "improve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        Improve Sentence
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => callGuidedAction("dialogue")}
        disabled={isLoading}
        className="gap-1.5 text-xs h-7"
      >
        {loading === "dialogue" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
        Add Dialogue
      </Button>
    </div>
  );
}
