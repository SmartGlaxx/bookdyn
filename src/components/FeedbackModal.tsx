import { useState, useEffect } from "react";
import { sanitizeText } from "@/lib/sanitize";
import { Star, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug Report" },
  { value: "feature", label: "✨ Feature Request" },
  { value: "general", label: "💬 General Feedback" },
  { value: "other", label: "📝 Other" },
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setCheckingCooldown(true);
    supabase
      .from("user_feedback")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const lastSubmit = new Date(data[0].created_at);
          const daysSince = (Date.now() - lastSubmit.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 7) {
            setCooldown(Math.ceil(7 - daysSince));
          } else {
            setCooldown(null);
          }
        } else {
          setCooldown(null);
        }
        setCheckingCooldown(false);
      });
  }, [open, user]);

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setCategory("");
    setMessage("");
  };

  const handleSubmit = async () => {
    if (!user || rating === 0 || !category || message.length < 20) return;
    setSubmitting(true);
    try {
      const cleanMessage = sanitizeText(message.trim()).substring(0, 2000);
      if (cleanMessage.length < 20) {
        toast.error("Feedback message too short after cleanup");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        email: user.email || "",
        rating,
        category,
        message: cleanMessage,
      });
      if (error) throw error;
      toast.success("Thank you for your feedback! 🙏");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = rating > 0 && category && message.length >= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Give Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Bookdyn with your feedback.
          </DialogDescription>
        </DialogHeader>

        {checkingCooldown ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Checking...</div>
        ) : cooldown !== null ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You've already shared feedback recently — we're still working through it.
            </p>
            <p className="text-sm font-medium text-foreground">
              Come back in {cooldown} day{cooldown !== 1 ? "s" : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Star Rating */}
            <div className="space-y-1.5">
              <Label>Rating *</Label>
              <div className="flex gap-1">
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
                      className={`w-7 h-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label>Your feedback * <span className="text-muted-foreground text-xs">(min 20 chars)</span></Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly className="bg-muted/50" />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
