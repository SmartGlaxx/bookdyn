import { useState, useEffect, useCallback } from "react";
import {
  Zap, Loader2, Coins, X, Check, Lock, Sparkles, Crown, Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

// Credit purchase constants
const CREDITS_PER_DOLLAR = 10;
const WORDS_PER_CREDIT = 1000;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 1000;
const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000];

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const PLAN_ICONS: Record<PlanId, typeof Zap> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  elite: Rocket,
};

const PricingModal = ({ open, onOpenChange, reason }: PricingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(25);
  const [loading, setLoading] = useState<string | false>(false);
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

  const handleSubscribe = useCallback(async (planId: PlanId) => {
    if (!user || planId === "free") return;
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handleCreditPurchase = useCallback(async () => {
    if (!user) return;
    setLoading("credits");
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
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, amount, toast]);

  const formatWords = (w: number) => {
    if (w >= 1_000_000) return `${(w / 1_000_000).toFixed(1)}M`;
    if (w >= 1_000) return `${(w / 1_000).toFixed(0)}K`;
    return w.toString();
  };

  const currentPlan = (profile?.plan || "free") as PlanId;
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  const remainingCredits = profile
    ? Math.max(0, profile.credits_limit - profile.credits_used)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
        onInteractOutside={(e) => e.preventDefault()}
      >

        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-serif">
            {reason || "Upgrade Your Writing Power"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose a plan or buy credits. Consistency unlocks Turbo Mode.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="plans" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          </TabsList>

          {/* ─── Plans Tab ─── */}
          <TabsContent value="plans" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_ORDER.filter(id => id !== "free").map((planId) => {
                const plan = PLANS[planId];
                const Icon = PLAN_ICONS[planId];
                const isCurrent = currentPlan === planId;
                const isDowngrade = PLAN_ORDER.indexOf(planId) < currentPlanIndex;

                return (
                  <motion.div
                    key={planId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                      plan.popular
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                        Most Popular
                      </Badge>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-serif font-semibold text-sm">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">{plan.words}</div>
                      </div>
                    </div>

                    <div className="font-serif text-2xl font-bold">
                      ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>

                    {plan.badge && (
                      <Badge variant="outline" className="w-fit text-[10px] border-primary/30 text-primary">
                        {plan.badge}
                      </Badge>
                    )}

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                      {plan.turboAccess === "none" && (
                        <li className="flex items-start gap-1.5 text-xs text-muted-foreground/60">
                          <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                          No Turbo access
                        </li>
                      )}
                    </ul>

                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={isCurrent || loading === planId}
                      onClick={() => handleSubscribe(planId)}
                    >
                      {loading === planId ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      {isCurrent
                        ? "Current Plan"
                        : isDowngrade
                        ? "Downgrade"
                        : "Upgrade"}
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Free tier info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground text-center">
              Free tier: 5 credits/month · Guided Mode only · 1 active book
            </div>
          </TabsContent>

          {/* ─── Credits Tab ─── */}
          <TabsContent value="credits" className="mt-4 space-y-5">
            {profile && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-semibold text-foreground">
                  {remainingCredits} credit{remainingCredits !== 1 ? "s" : ""}
                </span>
              </div>
            )}

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

            <motion.div
              key={amount}
              initial={{ opacity: 0.5, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center space-y-1"
            >
              <p className="text-3xl font-serif font-bold text-foreground">${amount}</p>
              <p className="text-lg font-semibold text-primary">
                {credits.toLocaleString()} credits
              </p>
              <p className="text-sm text-muted-foreground">
                ≈ {formatWords(words)} words of content
              </p>
            </motion.div>

            <p className="text-xs text-muted-foreground text-center">
              $1 = 10 credits (10,000 words) · Purchased credits never expire
            </p>

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handleCreditPurchase}
              disabled={!!loading}
            >
              {loading === "credits" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to checkout...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Buy {credits.toLocaleString()} Credits for ${amount}
                </span>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
