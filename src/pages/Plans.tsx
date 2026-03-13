import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Check, Sparkles, Crown, Zap, ArrowRight,
  PenTool, Palette, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    credits: 5,
    words: "5,000",
    description: "Try Authoryti and see what AI can do for your writing.",
    features: [
      "5 credits/month (5K words)",
      "Basic AI generation",
      "Basic Polish editing",
      "PDF export",
      "1 book at a time",
    ],
    editingTier: "Basic Polish",
    editingIcon: PenTool,
    cta: "Try Authoryti Free",
    variant: "outline" as const,
    popular: false,
    stripePriceId: null,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9",
    period: "/month",
    credits: 100,
    words: "100,000",
    description: "For serious writers ready to create full-length books.",
    features: [
      "100 credits/month (100K words)",
      "Edits at half credit cost",
      "Style & Tone Shift editing",
      "Priority generation",
      "Unlimited books",
    ],
    editingTier: "Style & Tone Shift",
    editingIcon: Palette,
    cta: "Get Started",
    variant: "hero" as const,
    popular: true,
    stripePriceId: "starter",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    credits: 500,
    words: "500,000",
    description: "For prolific authors and content professionals.",
    features: [
      "500 credits/month (500K words)",
      "Edits at half credit cost",
      "Advanced Plot Check editing",
      "Fastest generation speed",
      "Unlimited books",
    ],
    editingTier: "Advanced Plot Check",
    editingIcon: Search,
    cta: "Go Pro",
    variant: "hero" as const,
    popular: false,
    stripePriceId: "pro",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$79",
    period: "/month",
    credits: null,
    words: "Unlimited",
    description: "No limits. Write as much as you want, whenever you want.",
    features: [
      "Unlimited credits & words",
      "Edits at half credit cost",
      "Advanced Plot Check editing",
      "Highest priority queue",
      "Unlimited everything",
    ],
    editingTier: "Advanced Plot Check",
    editingIcon: Search,
    cta: "Go Unlimited",
    variant: "hero" as const,
    popular: false,
    stripePriceId: "unlimited",
  },
];

const Plans = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(true);

  // Auto-redirect returning paid users to dashboard
  useEffect(() => {
    if (!user) { setCheckingPlan(false); return; }
    const checkExistingPlan = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();
        if (data?.plan && data.plan !== "free") {
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch {}
      setCheckingPlan(false);
    };
    checkExistingPlan();
  }, [user, navigate]);

  if (loading || checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?mode=signup" replace />;

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (plan.id === "free") {
      // Free plan — just go to the app
      toast({ title: "Welcome to Authoryti!", description: "You're on the Free plan with 5 credits/month." });
      navigate("/dashboard");
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId: plan.id },
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-16 lg:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent glow">
              <BookOpen className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-serif font-bold text-2xl">Authoryti</h1>
          </div>

          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            Choose Your <span className="text-gradient">Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            1 credit = 1,000 words of generation. AI edits cost half a credit per 1,000 words.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col border-border/50 ${plan.popular ? "border-primary/50 shadow-lg ring-1 ring-primary/20" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Sparkles className="w-3 h-3 mr-1" /> Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.id === "free" && <Zap className="w-5 h-5 text-muted-foreground" />}
                    {plan.id === "starter" && <Sparkles className="w-5 h-5 text-primary" />}
                    {plan.id === "pro" && <Crown className="w-5 h-5 text-primary" />}
                    {plan.id === "unlimited" && <Crown className="w-5 h-5 text-primary" />}
                    <CardTitle className="text-xl font-serif">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}

                    {/* AI Editing tier badge */}
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <plan.editingIcon className="w-4 h-4 text-primary" />
                        <span className="font-medium">AI Editing:</span>
                        <Badge variant="secondary" className="text-xs">{plan.editingTier}</Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={plan.variant === "hero" ? "hero" : "outline"}
                    className="w-full"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Loading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {plan.cta}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Skip to free */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <button
            type="button"
            onClick={() => {
              toast({ title: "Welcome!", description: "You're on the Free plan. Start creating!" });
              navigate("/dashboard");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now — <span className="text-primary font-medium">continue with Free plan</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Plans;
