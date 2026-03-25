import { useState, useEffect, useCallback } from "react";
import {
  Zap, Loader2, Coins, X,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// $1 = 30 credits = 30,000 words. Min $10, max $1000.
const CREDITS_PER_DOLLAR = 30;
const WORDS_PER_CREDIT = 1000;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 1000;

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000];

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const PricingModal = ({ open, onOpenChange, reason }: PricingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    credits_used: number;
    credits_limit: number;
    plan: string;
  } | null>(null);

  const credits = amount * CREDITS_PER_DOLLAR;
  const words = credits * WORDS_PER_CREDIT;

  useEffect(() => {
    if (open && user) {
      supabase
        .from("profiles")
        .select("credits_used, credits_limit, plan")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [open, user]);

  const handlePurchase = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-checkout", {
        body: { amount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, amount, toast]);

  const formatWords = (w: number) => {
    if (w >= 1_000_000) return `${(w / 1_000_000).toFixed(1)}M`;
    if (w >= 1_000) return `${(w / 1_000).toFixed(0)}K`;
    return w.toString();
  };

  const remainingCredits = profile
    ? Math.max(0, profile.credits_limit - profile.credits_used)
    : null;

  return (
    <Dialog open={open} onOpenChange={() => {/* prevent background close */}}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Custom close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-serif flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Buy Credits
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason || "Top up your credits to keep writing. Credits never expire."}
          </DialogDescription>
        </DialogHeader>

        {/* Current balance */}
        {profile && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
            <span className="text-muted-foreground">Current balance</span>
            <span className="font-semibold text-foreground">
              {remainingCredits} credit{remainingCredits !== 1 ? "s" : ""} remaining
            </span>
          </div>
        )}

        <div className="space-y-6 mt-2">
          {/* Quick amount buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_AMOUNTS.map((q) => (
              <Button
                key={q}
                variant={amount === q ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(q)}
                className="min-w-[60px]"
              >
                ${q}
              </Button>
            ))}
          </div>

          {/* Slider */}
          <div className="space-y-3 px-1">
            <Slider
              value={[amount]}
              onValueChange={(v) => setAmount(v[0])}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${MIN_AMOUNT}</span>
              <span>${MAX_AMOUNT}</span>
            </div>
          </div>

          {/* Summary card */}
          <motion.div
            key={amount}
            initial={{ opacity: 0.5, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center space-y-1"
          >
            <p className="text-3xl font-serif font-bold text-foreground">
              ${amount}
            </p>
            <p className="text-lg font-semibold text-primary">
              {credits.toLocaleString()} credits
            </p>
            <p className="text-sm text-muted-foreground">
              ≈ {formatWords(words)} words of content
            </p>
          </motion.div>

          {/* Conversion info */}
          <p className="text-xs text-muted-foreground text-center">
            $1 = 30 credits (30,000 words) · Credits never expire · 5 free credits/month
          </p>

          {/* Purchase button */}
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to checkout...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Buy {credits.toLocaleString()} Credits for ${amount}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
