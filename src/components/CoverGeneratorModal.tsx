import { useState } from "react";
import { sanitizeText } from "@/lib/sanitize";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, Check, ArrowLeft, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Book } from "@/types/book";
import { CoverTextEditor, CoverTextElement } from "@/components/CoverTextEditor";

interface CoverGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  onCoverSelected: (coverUrl: string) => void;
}

type Step = "generate" | "select" | "edit";

export function CoverGeneratorModal({ open, onOpenChange, book, onCoverSelected }: CoverGeneratorModalProps) {
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [covers, setCovers] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("generate");
  const [textElements, setTextElements] = useState<CoverTextElement[]>([]);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (description.length < 5) {
      toast.error("Please describe your ideal cover (at least 5 characters)");
      return;
    }
    setGenerating(true);
    setCovers([]);
    setSelectedIndex(null);
    setStep("generate");

    try {
      const cleanDesc = sanitizeText(description.trim()).substring(0, 2000);
      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: { description: cleanDesc, count, bookTitle: book.title, bookType: book.bookType, theme: book.theme },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCovers(data.covers || []);
      if (data.covers?.length === 1) setSelectedIndex(0);
      setStep("select");
    } catch (err: any) {
      console.error("Cover generation failed:", err);
      toast.error(err.message || "Failed to generate covers");
    } finally {
      setGenerating(false);
    }
  };

  const handleProceedToEdit = () => {
    if (selectedIndex === null) return;
    setTextElements([]);
    setStep("edit");
  };

  const handleUseWithoutText = () => {
    if (selectedIndex === null || !covers[selectedIndex]) return;
    onCoverSelected(covers[selectedIndex]);
    onOpenChange(false);
    toast.success("Book cover set!");
  };

  const handleFinalCover = (dataUrl: string) => {
    setSaving(true);
    try {
      onCoverSelected(dataUrl);
      onOpenChange(false);
      toast.success("Book cover set with text!");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCovers([]);
      setSelectedIndex(null);
      setDescription("");
      setStep("generate");
      setTextElements([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Book Cover Generation</DialogTitle>
          <DialogDescription>
            {step === "generate" && `Generate AI-powered cover art for "${book.title}". Costs 1 credit per generation.`}
            {step === "select" && "Select a cover, then optionally add text overlays."}
            {step === "edit" && "Add and position text on your cover. Drag elements to move them."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Step: Generate */}
          {step === "generate" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Describe your ideal cover</label>
                <Textarea
                  placeholder="e.g. A misty forest at dawn with a lone figure, dark fantasy style"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">How many options?</label>
                  <span className="text-sm font-semibold text-primary">{count}</span>
                </div>
                <Slider value={[count]} onValueChange={([v]) => setCount(v)} min={1} max={5} step={1} />
              </div>
              <Button onClick={handleGenerate} disabled={generating || description.length < 5} className="w-full" variant="hero">
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating {count} cover{count > 1 ? "s" : ""}…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Covers</>
                )}
              </Button>
            </>
          )}

          {/* Step: Select */}
          {step === "select" && covers.length > 0 && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("generate")} className="text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to prompt
              </Button>
              <p className="text-sm text-muted-foreground">Click a cover to select it:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {covers.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`relative aspect-[2/3] rounded-md overflow-hidden border-2 transition-all ${
                      selectedIndex === i ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={url} alt={`Cover option ${i + 1}`} className="w-full h-full object-cover" />
                    {selectedIndex === i && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary rounded-full p-2">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUseWithoutText} disabled={selectedIndex === null} variant="outline" className="flex-1">
                  Use Without Text
                </Button>
                <Button onClick={handleProceedToEdit} disabled={selectedIndex === null} className="flex-1">
                  <Pencil className="w-4 h-4 mr-2" /> Add Text
                </Button>
              </div>
            </div>
          )}

          {/* Step: Edit */}
          {step === "edit" && selectedIndex !== null && covers[selectedIndex] && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("select")} className="text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to selection
              </Button>
              <CoverTextEditor
                coverUrl={covers[selectedIndex]}
                elements={textElements}
                onChange={setTextElements}
                onConfirm={handleFinalCover}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
