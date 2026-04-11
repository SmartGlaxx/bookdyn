import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { BookTemplate, BOOK_TEMPLATES, BookType, ImageShape } from "@/types/book";

interface TemplateSelectorProps {
  bookType: BookType;
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
}

const shapeStyles: Record<ImageShape, string> = {
  square: "rounded-sm",
  rectangle: "rounded-sm",
  circle: "rounded-full",
  hexagon: "rounded-lg",
  triangle: "",
  "rounded-rect": "rounded-xl",
};

const sizeMap = {
  small: { w: "w-10", h: "h-10" },
  medium: { w: "w-16", h: "h-14" },
  large: { w: "w-full", h: "h-20" },
};

function TemplatePreview({ template }: { template: BookTemplate }) {
  return (
    <div className="w-full aspect-[3/4] bg-background rounded-lg border border-border/50 p-3 flex flex-col gap-2 overflow-hidden relative">
      {template.layouts.map((slot, i) => {
        const size = sizeMap[slot.size];
        const isFullWidth = slot.position === "full-width";
        const isCenter = slot.position === "center";

        if (isFullWidth) {
          return (
            <div key={i} className="w-full flex flex-col gap-1.5">
              <div
                className={`${size.h} w-full bg-primary/15 border border-primary/20 ${shapeStyles[slot.shape]} flex items-center justify-center`}
              >
                <span className="text-[8px] text-primary/50">IMG</span>
              </div>
              {!slot.wrapText && (
                <div className="space-y-1">
                  <div className="h-1 bg-muted-foreground/15 rounded-full w-full" />
                  <div className="h-1 bg-muted-foreground/15 rounded-full w-4/5" />
                  <div className="h-1 bg-muted-foreground/15 rounded-full w-3/5" />
                </div>
              )}
            </div>
          );
        }

        if (isCenter) {
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`${size.w} ${size.h} bg-primary/15 border border-primary/20 ${shapeStyles[slot.shape]} flex items-center justify-center mx-auto`}
              >
                <span className="text-[8px] text-primary/50">IMG</span>
              </div>
              <div className="space-y-1 w-full">
                <div className="h-1 bg-muted-foreground/15 rounded-full w-full" />
                <div className="h-1 bg-muted-foreground/15 rounded-full w-3/4 mx-auto" />
              </div>
            </div>
          );
        }

        // Left or Right with text wrapping
        const isLeft = slot.position === "left";
        return (
          <div key={i} className={`flex gap-2 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
            <div
              className={`${size.w} ${size.h} bg-primary/15 border border-primary/20 ${shapeStyles[slot.shape]} flex items-center justify-center shrink-0`}
              style={slot.shape === "triangle" ? { clipPath: isLeft ? "polygon(0 0, 100% 50%, 0 100%)" : "polygon(100% 0, 0 50%, 100% 100%)" } : undefined}
            >
              <span className="text-[8px] text-primary/50">IMG</span>
            </div>
            <div className="flex-1 space-y-1 pt-0.5">
              <div className="h-1 bg-muted-foreground/15 rounded-full w-full" />
              <div className="h-1 bg-muted-foreground/15 rounded-full w-4/5" />
              <div className="h-1 bg-muted-foreground/15 rounded-full w-full" />
              <div className="h-1 bg-muted-foreground/15 rounded-full w-2/3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TemplateSelector({ bookType, selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const templates = BOOK_TEMPLATES.filter(t => t.bookType === bookType);

  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          🎨 Choose a layout template for your book. This determines how images and text are arranged on each page.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <motion.button
              key={template.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(template.id)}
              className={`relative rounded-xl p-3 text-left transition-all border ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 z-10">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              <TemplatePreview template={template} />
              <div className="mt-2">
                <div className="font-medium text-xs text-foreground">{template.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {template.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
