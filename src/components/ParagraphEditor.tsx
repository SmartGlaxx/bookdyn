import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParagraphEditorProps {
  paragraph: string;
  paragraphIndex: number;
  subsectionId: string;
  fullContent: string;
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  subsectionTitle: string;
  onContentUpdate: (newFullContent: string) => void;
  readOnly?: boolean;
}

export function ParagraphEditor({
  paragraph,
  paragraphIndex,
  subsectionId,
  fullContent,
  bookId,
  bookTitle,
  chapterTitle,
  subsectionTitle,
  onContentUpdate,
  readOnly = false,
}: ParagraphEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [editText, setEditText] = useState(paragraph);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const paragraphs = fullContent.split(/\n\n+/);

  const updateParagraph = (newText: string) => {
    const updated = [...paragraphs];
    updated[paragraphIndex] = newText;
    return updated.join("\n\n");
  };

  const handleSave = () => {
    if (!editText.trim()) return;
    const newContent = updateParagraph(editText.trim());
    onContentUpdate(newContent);
    setIsEditing(false);
    toast.success("Paragraph updated");
  };

  const handleCancel = () => {
    setEditText(paragraph);
    setIsEditing(false);
  };

  const handleRewrite = async () => {
    setIsRewriting(true);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-paragraph", {
        body: {
          paragraph,
          bookTitle,
          chapterTitle,
          subsectionTitle,
        },
      });

      if (error) throw error;

      const rewritten = data?.content;
      if (typeof rewritten === "string" && rewritten.trim()) {
        const newContent = updateParagraph(rewritten.trim());
        onContentUpdate(newContent);
        setEditText(rewritten.trim());
        toast.success("Paragraph rewritten");
      } else {
        throw new Error("No content returned");
      }
    } catch (err) {
      console.error("Rewrite failed:", err);
      toast.error("Failed to rewrite paragraph. Please try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative group"
      >
        <Textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
          }}
          className="min-h-[100px] leading-relaxed text-foreground/90 resize-y"
          placeholder="Write your paragraph..."
        />
        <div className="flex items-center gap-1.5 mt-2">
          <Button variant="hero" size="sm" onClick={handleSave}>
            <Check className="w-3.5 h-3.5" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <span className="text-[11px] text-muted-foreground ml-2">
            ⌘+Enter to save · Esc to cancel
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "relative group/para rounded-md transition-colors -mx-2 px-2 py-0.5",
        !readOnly && "hover:bg-muted/40 cursor-pointer"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 break-words">
        {sanitizeText(paragraph)}
      </p>

      {/* Floating toolbar */}
      {!readOnly && (
        <AnimatePresence>
          {isHovered && !isRewriting && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-3 right-0 flex items-center gap-1 bg-card border rounded-lg shadow-md px-1.5 py-1 z-10"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditText(paragraph);
                  setIsEditing(true);
                }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRewrite();
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Rewrite
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Rewriting overlay */}
      {isRewriting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md"
        >
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Rewriting...
          </div>
        </motion.div>
      )}
    </div>
  );
}
