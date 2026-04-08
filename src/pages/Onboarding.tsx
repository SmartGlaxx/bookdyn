import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  PenTool,
  BookMarked,
  Baby,
  Cpu,
  Target,
  Rocket,
  Palette,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const bookTypes = [
  { id: "novel", label: "Novel / Fiction", icon: PenTool, description: "Stories, narratives, creative fiction" },
  { id: "nonfiction", label: "Non-Fiction", icon: BookMarked, description: "Self-help, business, memoir" },
  { id: "technical", label: "Technical Guide", icon: Cpu, description: "Tutorials, documentation, how-tos" },
  { id: "children", label: "Children's Book", icon: Baby, description: "Picture books, early readers" },
];

const goals = [
  { id: "personal", label: "Personal Project", icon: Sparkles, description: "Writing for myself or friends" },
  { id: "publishing", label: "Publishing", icon: Rocket, description: "Self-publish or submit to publishers" },
  { id: "content", label: "Content Creation", icon: Palette, description: "Blog posts, courses, marketing" },
  { id: "business", label: "Business / Brand", icon: Target, description: "Authority building, lead magnets" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedBookType, setSelectedBookType] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("id", user.id);

      if (error) throw error;

      // Check if user came from marketing site with a plan selection
      const pendingPlan = sessionStorage.getItem("pending_plan");
      if (pendingPlan && ["starter", "pro", "unlimited"].includes(pendingPlan)) {
        sessionStorage.removeItem("pending_plan");
        try {
          const { data, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
            body: { planId: pendingPlan },
          });
          if (!checkoutError && data?.url) {
            window.location.href = data.url;
            return;
          }
        } catch {
          // Fall through to dashboard if checkout fails
        }
      }

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 0) setStep(1);
    else completeOnboarding();
  };

  const handleSkip = () => completeOnboarding();

  const steps = [
    {
      title: "What type of books do you want to create?",
      description: "This helps us tailor your experience",
      items: bookTypes,
      selected: selectedBookType,
      onSelect: setSelectedBookType,
    },
    {
      title: "What is your primary goal?",
      description: "We'll customize features for your needs",
      items: goals,
      selected: selectedGoal,
      onSelect: setSelectedGoal,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: "hsla(35,92%,55%,0.12)",
              display: "flex",
            }}
          >
            <BookOpen size={20} color="var(--primary)" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl">Welcome to Authoryti</h1>
            <p className="text-xs text-muted-foreground">Let's personalize your experience</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 justify-center mb-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "w-12 bg-primary" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CardTitle className="text-xl font-serif">{current.title}</CardTitle>
                <CardDescription className="mt-1">{current.description}</CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>
          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                {current.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = current.selected === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => current.onSelect(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1" onClick={handleSkip} disabled={saving}>
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleNext} disabled={saving}>
                {saving ? "Saving..." : step === 1 ? "Get Started" : "Next"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
