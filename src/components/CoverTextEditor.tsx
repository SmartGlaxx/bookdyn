import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Type, Check, GripVertical } from "lucide-react";

export interface CoverTextElement {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // px
  fontWeight: "normal" | "bold" | "extrabold";
  color: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  role: "title" | "subtitle" | "author" | "tagline" | "custom";
}

interface CoverTextEditorProps {
  coverUrl: string;
  elements: CoverTextElement[];
  onChange: (elements: CoverTextElement[]) => void;
  onConfirm: (finalDataUrl: string) => void;
}

const FONT_OPTIONS = [
  { value: "serif", label: "Serif" },
  { value: "sans-serif", label: "Sans Serif" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Garamond, serif", label: "Garamond" },
  { value: "monospace", label: "Monospace" },
];

const ROLE_DEFAULTS: Record<string, Partial<CoverTextElement>> = {
  title: { fontSize: 36, fontWeight: "extrabold", y: 15, fontFamily: "serif", textAlign: "center" },
  subtitle: { fontSize: 20, fontWeight: "normal", y: 30, fontFamily: "serif", textAlign: "center" },
  author: { fontSize: 18, fontWeight: "bold", y: 85, fontFamily: "sans-serif", textAlign: "center" },
  tagline: { fontSize: 14, fontWeight: "normal", y: 75, fontFamily: "sans-serif", textAlign: "center" },
  custom: { fontSize: 16, fontWeight: "normal", y: 50, fontFamily: "sans-serif", textAlign: "center" },
};

const COLOR_PRESETS = ["#FFFFFF", "#000000", "#F5F5DC", "#FFD700", "#C0C0C0", "#FF4444", "#2196F3"];

export function CoverTextEditor({ coverUrl, elements, onChange, onConfirm }: CoverTextEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const addElement = (role: CoverTextElement["role"]) => {
    const defaults = ROLE_DEFAULTS[role];
    const newEl: CoverTextElement = {
      id: crypto.randomUUID(),
      text: role === "title" ? "Book Title" : role === "subtitle" ? "Subtitle" : role === "author" ? "Author Name" : role === "tagline" ? "A compelling tagline" : "Custom text",
      x: 50,
      y: defaults?.y ?? 50,
      fontSize: defaults?.fontSize ?? 20,
      fontWeight: (defaults?.fontWeight as CoverTextElement["fontWeight"]) ?? "normal",
      color: "#FFFFFF",
      fontFamily: defaults?.fontFamily ?? "serif",
      textAlign: (defaults?.textAlign as CoverTextElement["textAlign"]) ?? "center",
      role,
    };
    onChange([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const updateElement = (id: string, updates: Partial<CoverTextElement>) => {
    onChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    onChange(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = elements.find(el => el.id === selectedId);

  // Drag handling
  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(id);
    setSelectedId(id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const el = elements.find(el => el.id === id);
    if (!el) return;
    dragOffset.current = {
      x: e.clientX - (el.x / 100) * rect.width,
      y: e.clientY - (el.y / 100) * rect.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - dragOffset.current.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - dragOffset.current.y) / rect.height) * 100));
    updateElement(dragging, { x, y });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Render to canvas for export
  const exportToDataUrl = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        for (const el of elements) {
          const x = (el.x / 100) * canvas.width;
          const y = (el.y / 100) * canvas.height;
          const scaledFontSize = (el.fontSize / 400) * canvas.width; // scale relative to canvas
          ctx.font = `${el.fontWeight === "extrabold" ? "800" : el.fontWeight === "bold" ? "700" : "400"} ${scaledFontSize}px ${el.fontFamily}`;
          ctx.fillStyle = el.color;
          ctx.textAlign = el.textAlign;
          ctx.textBaseline = "middle";
          // Add text shadow for readability
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = scaledFontSize * 0.15;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(el.text, x, y);
          ctx.shadowColor = "transparent";
        }
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = coverUrl;
    });
  }, [coverUrl, elements]);

  const handleConfirm = async () => {
    const dataUrl = await exportToDataUrl();
    onConfirm(dataUrl);
  };

  return (
    <div className="space-y-4">
      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="relative aspect-[2/3] w-full max-w-sm mx-auto rounded-md overflow-hidden border border-border bg-muted select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => setSelectedId(null)}
      >
        <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" draggable={false} />
        {elements.map(el => (
          <div
            key={el.id}
            className={`absolute cursor-move flex items-center gap-1 ${selectedId === el.id ? "ring-2 ring-primary rounded" : ""}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              transform: `translate(${el.textAlign === "center" ? "-50%" : el.textAlign === "right" ? "-100%" : "0"}, -50%)`,
              fontFamily: el.fontFamily,
              fontSize: `${el.fontSize}px`,
              fontWeight: el.fontWeight === "extrabold" ? 800 : el.fontWeight === "bold" ? 700 : 400,
              color: el.color,
              textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
              textAlign: el.textAlign,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
            onPointerDown={(e) => handlePointerDown(e, el.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
          >
            {selectedId === el.id && <GripVertical className="w-3 h-3 opacity-70 shrink-0" />}
            {el.text}
          </div>
        ))}
      </div>

      {/* Add text buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {(["title", "subtitle", "author", "tagline", "custom"] as const).map(role => (
          <Button key={role} variant="outline" size="sm" onClick={() => addElement(role)} className="text-xs capitalize">
            <Plus className="w-3 h-3 mr-1" /> {role}
          </Button>
        ))}
      </div>

      {/* Properties panel */}
      {selected && (
        <div className="bg-muted/50 rounded-md p-3 space-y-3 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Type className="w-3 h-3" /> Editing: {selected.role}
            </span>
            <Button variant="ghost" size="sm" onClick={() => removeElement(selected.id)} className="text-destructive h-7 px-2">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <Input
            value={selected.text}
            onChange={(e) => updateElement(selected.id, { text: e.target.value })}
            placeholder="Text content"
            className="h-8 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Font</label>
              <Select value={selected.fontFamily} onValueChange={(v) => updateElement(selected.id, { fontFamily: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Weight</label>
              <Select value={selected.fontWeight} onValueChange={(v: any) => updateElement(selected.id, { fontWeight: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="extrabold">Extra Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Size</label>
              <span className="text-[10px] font-mono">{selected.fontSize}px</span>
            </div>
            <Slider
              value={[selected.fontSize]}
              onValueChange={([v]) => updateElement(selected.id, { fontSize: v })}
              min={10}
              max={72}
              step={1}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Color</label>
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 ${selected.color === c ? "border-primary" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateElement(selected.id, { color: c })}
                />
              ))}
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Align</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map(a => (
                <Button
                  key={a}
                  variant={selected.textAlign === a ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-3 text-xs capitalize flex-1"
                  onClick={() => updateElement(selected.id, { textAlign: a })}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm */}
      <Button onClick={handleConfirm} className="w-full" disabled={elements.length === 0}>
        <Check className="w-4 h-4 mr-2" /> Finalize Cover with Text
      </Button>
    </div>
  );
}
