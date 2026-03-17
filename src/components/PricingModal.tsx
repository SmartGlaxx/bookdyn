import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Crown, Zap, Check, ArrowRight, ArrowUp, ArrowDown,
  AlertTriangle, X, RotateCcw, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "/mo",
    credits: "5 credits (5K words)",
    icon: Zap,
    highlights: [
      "5 credits per month",
      "Basic generation",
      "1 book at a time",
      "Standard queue",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    period: "/mo",
    credits: "100 credits (100K words)",
    icon: Sparkles,
    popular: true,
    highlights: [
      "Edits at half credit cost",
      "Style & Tone Shift editing",
      "Priority generation",
      "Unlimited books",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "/mo",
    credits: "500 credits (500K words)",
    icon: Crown,
    highlights: [
      "Edits at half credit cost",
      "Advanced Plot Check editing",
      "Fastest generation speed",
      "Unlimited books",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: 79,
    period: "/mo",
    credits: "Unlimited credits & words",
    icon: Crown,
    highlights: [
      "Edits at half credit cost",
      "Advanced Plot Check editing",
      "Highest priority queue",
      "Unlimited everything",
    ],
  },
];

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  unlimited: 3,
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "N/A";
  }
}

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const PricingModal = ({ open, onOpenChange, reason }: PricingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [pendingPlanAt, setPendingPlanAt] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Confirm downgrade to free
  const [confirmFreeDowngrade, setConfirmFreeDowngrade] = useState(false);
  // Cancel pending downgrade
  const [cancellingDowngrade, setCancellingDowngrade] = useState(false);
  // Pending plan conflict resolution
  const [pendingConflict, setPendingConflict] = useState<{ targetPlan: string } | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "get_subscription" },
      });
      if (!error && data?.subscription) {
        setCurrentPlan(data.subscription.plan);
        setPendingPlan(data.subscription.pending_plan || null);
        setPendingPlanAt(data.subscription.pending_plan_at || null);
        setPeriodEnd(data.subscription.current_period_end || null);
        setHasSubscription(true);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, pending_plan, pending_plan_at")
          .eq("id", user.id)
          .single();
        setCurrentPlan((profile as any)?.plan || "free");
        setPendingPlan((profile as any)?.pending_plan || null);
        setPendingPlanAt((profile as any)?.pending_plan_at || null);
        setHasSubscription(false);
      }
    } catch {
      // fallback
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) loadProfile();
  }, [open, loadProfile]);

  const redirectToStripePortal = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "create_portal_update", new_plan: planId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      toast({ title: "Failed to open plan change", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const proceedWithPlanChange = async (planId: string) => {
    if (planId === "free") {
      setConfirmFreeDowngrade(true);
      return;
    }

    // Both upgrades AND downgrades go to Stripe's hosted confirmation page
    // Stripe natively handles proration for upgrades and end-of-period scheduling for downgrades
    await redirectToStripePortal(planId);
  };

  const handlePlanAction = async (planId: string) => {
    if (!user) return;
    if (planId === currentPlan) return;

    // Free user upgrading → checkout
    if (currentPlan === "free" || !hasSubscription) {
      setLoadingPlan(planId);
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { planId },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (err: any) {
        toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // If there's a pending plan change and the user picks a different plan, show conflict resolution
    if (pendingPlan && planId !== pendingPlan) {
      setPendingConflict({ targetPlan: planId });
      return;
    }

    await proceedWithPlanChange(planId);
  };

  const handleConflictResolve = async () => {
    if (!pendingConflict) return;
    const targetPlan = pendingConflict.targetPlan;
    setCancellingDowngrade(true);
    try {
      // Cancel the pending downgrade first
      const result = await supabase.functions.invoke("manage-subscription", {
        body: { action: "cancel_downgrade" },
      });
      if (result.data?.error) throw new Error(result.data.error);
      setPendingPlan(null);
      setPendingPlanAt(null);
      setPendingConflict(null);
      // Now proceed with the new plan change
      await proceedWithPlanChange(targetPlan);
    } catch (err: any) {
      toast({ title: "Failed to cancel pending change", description: err.message, variant: "destructive" });
    } finally {
      setCancellingDowngrade(false);
    }
  };

  // executeDowngrade removed — Stripe's hosted page handles downgrade scheduling natively

  const executeCancelToFree = async () => {
    setLoadingPlan("free");
    try {
      const result = await supabase.functions.invoke("manage-subscription", {
        body: { action: "cancel_subscription" },
      });
      if (result.data?.error) throw new Error(result.data.error);
      toast({
        title: "Subscription canceled",
        description: `You'll retain access until ${formatDate(result.data?.effective_date || periodEnd)}. After that, you'll move to Free.`,
      });
      setConfirmFreeDowngrade(false);
      await loadProfile();
    } catch (err: any) {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelDowngrade = async () => {
    setCancellingDowngrade(true);
    try {
      const result = await supabase.functions.invoke("manage-subscription", {
        body: { action: "cancel_downgrade" },
      });
      if (result.data?.error) throw new Error(result.data.error);
      toast({ title: "Downgrade canceled", description: "You'll stay on your current plan." });
      await loadProfile();
    } catch (err: any) {
      toast({ title: "Failed to cancel downgrade", description: err.message, variant: "destructive" });
    } finally {
      setCancellingDowngrade(false);
    }
  };

  const getButtonLabel = (planId: string) => {
    if (planId === currentPlan) return "Current Plan";
    const targetOrder = PLAN_ORDER[planId] ?? 0;
    const currentOrderVal = PLAN_ORDER[currentPlan] ?? 0;
    if (currentPlan === "free" || !hasSubscription) return `Upgrade to ${PLANS.find(p => p.id === planId)?.name}`;
    if (targetOrder > currentOrderVal) return `Upgrade to ${PLANS.find(p => p.id === planId)?.name}`;
    return `Downgrade to ${PLANS.find(p => p.id === planId)?.name}`;
  };

  const getButtonVariant = (planId: string): "hero" | "outline" | "ghost" | "destructive" => {
    if (planId === currentPlan) return "ghost";
    const targetOrder = PLAN_ORDER[planId] ?? 0;
    const currentOrderVal = PLAN_ORDER[currentPlan] ?? 0;
    if (targetOrder > currentOrderVal) return "hero";
    return "outline";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-2xl font-serif flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Choose Your Plan
            </DialogTitle>
            <DialogDescription className="text-base">
              {reason || "Pick the plan that fits your writing ambitions."}
            </DialogDescription>
          </DialogHeader>

          {/* Pending downgrade banner */}
          {pendingPlan && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <span>
                  Switching to <strong className="capitalize">{pendingPlan}</strong> on {formatDate(pendingPlanAt)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelDowngrade}
                disabled={cancellingDowngrade}
                className="text-xs"
              >
                {cancellingDowngrade ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RotateCcw className="w-3 h-3 mr-1" /> Cancel</>}
              </Button>
            </motion.div>
          )}

          {profileLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {PLANS.map((plan, i) => {
                const isCurrent = plan.id === currentPlan;
                const isPending = plan.id === pendingPlan;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className={`relative rounded-xl border p-4 flex flex-col gap-3 ${
                      isCurrent
                        ? "border-primary/50 shadow-md ring-1 ring-primary/20 bg-primary/5"
                        : isPending
                        ? "border-warning/40 ring-1 ring-warning/20"
                        : plan.popular
                        ? "border-primary/30 shadow-sm"
                        : "border-border/50"
                    }`}
                  >
                    {isCurrent && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
                        Current Plan
                      </Badge>
                    )}
                    {isPending && !isCurrent && (
                      <Badge variant="warning" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5">
                        Pending
                      </Badge>
                    )}
                    {plan.popular && !isCurrent && !isPending && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
                        <Sparkles className="w-3 h-3 mr-1" /> Popular
                      </Badge>
                    )}

                    <div className="flex items-center gap-2">
                      <plan.icon className="w-4 h-4 text-primary" />
                      <span className="font-serif font-bold">{plan.name}</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif font-bold">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">{plan.credits}</p>

                    <div className="space-y-1.5 flex-1">
                      {plan.highlights.map((h) => (
                        <div key={h} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs text-foreground">{h}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={getButtonVariant(plan.id)}
                      size="sm"
                      className="w-full"
                      onClick={() => handlePlanAction(plan.id)}
                      disabled={isCurrent || loadingPlan === plan.id}
                    >
                      {loadingPlan === plan.id ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {getButtonLabel(plan.id)}
                          {!isCurrent && (
                            (PLAN_ORDER[plan.id] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0)
                              ? <ArrowUp className="w-3.5 h-3.5" />
                              : <ArrowDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel to Free Dialog */}
      <AlertDialog open={confirmFreeDowngrade} onOpenChange={setConfirmFreeDowngrade}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Cancel Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Your subscription will remain active until{" "}
                  <strong>{formatDate(periodEnd)}</strong>.
                  After that, you'll be moved to the Free plan with 5 credits/month.
                </p>
                <p className="text-destructive/80 font-medium">
                  You'll lose access to all paid features including priority generation, advanced editing, and unlimited books.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeCancelToFree}
              disabled={!!loadingPlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingPlan === "free" ? "Canceling..." : "Yes, Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Plan Conflict Resolution Dialog */}
      <AlertDialog open={!!pendingConflict} onOpenChange={(open) => !open && setPendingConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Pending Plan Change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You currently have a pending switch to{" "}
                  <strong className="capitalize">{pendingPlan}</strong> on{" "}
                  <strong>{formatDate(pendingPlanAt)}</strong>.
                </p>
                <p className="text-muted-foreground">
                  To switch to <strong className="capitalize">{pendingConflict?.targetPlan}</strong> instead,
                  we need to cancel your pending change first.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Keep my pending {pendingPlan} switch
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictResolve}
              disabled={cancellingDowngrade}
            >
              {cancellingDowngrade ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                </span>
              ) : (
                `Cancel pending & switch to ${pendingConflict?.targetPlan || ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PricingModal;
