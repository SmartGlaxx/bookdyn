import { useState } from "react";
import { Star, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TestimonialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestimonialModal({ open, onOpenChange }: TestimonialModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    try {
      // Submit testimonial
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        email: user.email || "",
        rating,
        category: "testimonial",
        message: message || `Rated ${rating}/5 after first chapter.`,
      });
      if (error) throw error;

      // Mark as prompted so it never shows again
      await supabase.rpc("mark_testimonial_prompted", { _user_id: user.id });

      toast.success("Thanks for sharing! 🎉");
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!user) return;
    // Mark prompted even on dismiss
    await supabase.rpc("mark_testimonial_prompted", { _user_id: user.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            How was your first chapter?
          </DialogTitle>
          <DialogDescription>
            We'd love to hear your thoughts!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-1.5">
            <Label>Rating</Label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Optional message */}
          <div className="space-y-1.5">
            <Label>Tell us more <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did you like? What could be better?"
              className="min-h-[80px]"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Maybe later
            </Button>
            <Button onClick={handleSubmit} disabled={rating === 0 || submitting} className="flex-1">
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
