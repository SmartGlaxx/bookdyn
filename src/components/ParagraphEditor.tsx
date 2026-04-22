import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, RefreshCw, Check, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeHtml, sanitizeRichText } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextToolbar } from "@/components/RichTextToolbar";
import { TypewriterText } from "@/components/TypewriterText";
import { markRevealed } from "@/lib/revealRegistry";

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
  totalParagraphs?: number;
  highlightText?: (text: string) => React.ReactNode;
  /**
   * When true, reveal this paragraph word-by-word via the typewriter animation
   * (used for freshly-generated content). When false/undefined, render instantly.
   */
  animateReveal?: boolean;
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
  totalParagraphs = 1,
  highlightText,
  animateReveal = false,
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

  const MAX_PARAGRAPH_LENGTH = 5000;

  const normalizeWhitespace = (text: string) =>
    text.replace(/\n{3,}/g, "\n\n").trim();

  const handleSave = () => {
    if (!editText.trim()) return;
    const cleaned = sanitizeRichText(normalizeWhitespace(editText)).substring(0, MAX_PARAGRAPH_LENGTH);
    if (!cleaned) return;
    const newContent = updateParagraph(cleaned);
    onContentUpdate(newContent);
    setEditText(cleaned);
    setIsEditing(false);
    toast.success("Paragraph updated");
  };

  const handleCancel = () => {
    setEditText(paragraph);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (totalParagraphs <= 1) {
      toast.error("Cannot delete the only paragraph");
      return;
    }
    const updated = [...paragraphs];
    updated.splice(paragraphIndex, 1);
    onContentUpdate(updated.join("\n\n"));
    toast.success("Paragraph deleted");
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    // Rich text shortcuts
    if ((e.metaKey || e.ctrlKey) && textareaRef.current) {
      const tag = e.key === "b" ? "b" : e.key === "i" ? "i" : e.key === "u" ? "u" : null;
      if (tag) {
        e.preventDefault();
        const ta = textareaRef.current;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = editText.substring(start, end);
        if (!selected) return;
        const open = `<${tag}>`;
        const close = `</${tag}>`;
        const newVal = editText.substring(0, start) + open + selected + close + editText.substring(end);
        if (newVal.length <= MAX_PARAGRAPH_LENGTH) {
          setEditText(newVal);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(start + open.length, end + open.length);
          });
        }
      }
    }
  }, [editText, handleCancel, handleSave]);

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative group"
      >
         <div className="flex items-center gap-2 mb-1.5">
           <RichTextToolbar textareaRef={textareaRef} value={editText} onChange={(v) => { if (v.length <= MAX_PARAGRAPH_LENGTH) setEditText(v); }} />
           <span className="text-[11px] text-muted-foreground">Select text then format</span>
         </div>
         <Textarea
           ref={textareaRef}
           value={editText}
           onChange={(e) => {
             if (e.target.value.length <= MAX_PARAGRAPH_LENGTH) setEditText(e.target.value);
           }}
           onKeyDown={handleKeyDown}
           maxLength={MAX_PARAGRAPH_LENGTH}
           className="min-h-[100px] leading-relaxed text-foreground/90 resize-y font-mono text-sm"
           placeholder="Write your paragraph..."
         />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
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
            <span className={cn("text-[11px]", editText.length > 4500 ? "text-destructive" : "text-muted-foreground")}>
              {editText.length}/{MAX_PARAGRAPH_LENGTH.toLocaleString()}
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
      {animateReveal && !/<[a-z][^>]*>/i.test(paragraph) ? (
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 break-words">
          <TypewriterText
            text={paragraph}
            intervalMs={60}
            fadeMs={350}
            onComplete={() => markRevealed(subsectionId)}
          />
        </p>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 break-words"
           dangerouslySetInnerHTML={{ __html: sanitizeHtml(paragraph) }} />
      )}

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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
                Delete
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
