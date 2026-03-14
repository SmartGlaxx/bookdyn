import { useState } from "react";
import { Sparkles, Crown, Zap, Check, ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$9",
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
    price: "$29",
    period: "/mo",
    credits: "500 credits (500K words)",
    icon: Crown,
    popular: false,
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
    price: "$79",
    period: "/mo",
    credits: "Unlimited credits & words",
    icon: Crown,
    popular: false,
    highlights: [
      "Edits at half credit cost",
      "Advanced Plot Check editing",
      "Highest priority queue",
      "Unlimited everything",
    ],
  },
];

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const UpgradeModal = ({ open, onOpenChange, reason }: UpgradeModalProps) => {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
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
      toast({
        title: "Checkout failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-serif flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason || "Unlock more credits, faster generation, and advanced editing tools."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={`relative rounded-xl border p-4 flex flex-col gap-3 ${
                plan.popular
                  ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                  : "border-border/50"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  <Sparkles className="w-3 h-3 mr-1" /> Popular
                </Badge>
              )}

              <div className="flex items-center gap-2">
                <plan.icon className="w-4 h-4 text-primary" />
                <span className="font-serif font-bold">{plan.name}</span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold">{plan.price}</span>
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
                variant={plan.popular ? "hero" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => handleUpgrade(plan.id)}
                disabled={loadingPlan === plan.id}
              >
                {loadingPlan === plan.id ? (
                  <span className="flex items-center gap-1.5">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </motion.div>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Upgrade
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-2">
          <a
            href="https://authoryti.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Compare all features
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
