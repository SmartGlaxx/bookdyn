import React from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (newValue: string) => void;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  tag: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.substring(start, end);

  if (!selected) return;

  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  // Check if already wrapped — toggle off
  const before = value.substring(0, start);
  const after = value.substring(end);

  if (
    before.endsWith(openTag) &&
    after.startsWith(closeTag)
  ) {
    // Remove tags
    const newValue =
      before.slice(0, -openTag.length) + selected + after.slice(closeTag.length);
    onChange(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start - openTag.length, end - openTag.length);
    });
    return;
  }

  const newValue = before + openTag + selected + closeTag + after;
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + openTag.length, end + openTag.length);
  });
}

export function RichTextToolbar({ textareaRef, value, onChange }: RichTextToolbarProps) {
  const actions = [
    { icon: Bold, tag: "b", label: "Bold (Ctrl+B)", shortcut: "B" },
    { icon: Italic, tag: "i", label: "Italic (Ctrl+I)", shortcut: "I" },
    { icon: Underline, tag: "u", label: "Underline (Ctrl+U)", shortcut: "U" },
  ] as const;

  return (
    <div className="flex items-center gap-0.5 border rounded-md px-1 py-0.5 bg-muted/30">
      {actions.map(({ icon: Icon, tag, label }) => (
        <Tooltip key={tag}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                if (textareaRef.current) {
                  wrapSelection(textareaRef.current, value, tag, onChange);
                }
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
