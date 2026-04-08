import { useState, useEffect } from "react";
import { LogOut, User, Flame, PenTool, MessageSquare, Coins } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTurbo } from "@/hooks/useTurbo";
import { getPlanDisplayName } from "@/lib/plans";
import { UnifiedMeter } from "@/components/UnifiedMeter";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppSidebarProps {
  className?: string;
  children?: React.ReactNode;
}

export function AppSidebar({ className, children }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ credits_used: number; credits_limit: number } | null>(null);
  const turbo = useTurbo();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = () => {
      supabase
        .from("profiles")
        .select("credits_used, credits_limit")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    };
    fetchProfile();
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    window.location.href = "https://authoryti.com?logout=true";
  };

  const handleManageBilling = () => {
    setOpen(false);
    navigate("/manage-subscription");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className={`rounded-full ${className || ""}`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[80%] max-w-[320px] p-0 flex flex-col border-l border-border"
          style={{
            background: "hsl(222 30% 7%)",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header with email */}
          <div className="px-6 pt-6 pb-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ marginTop: 16 }}>
            <div className="h-px w-full" style={{ background: "hsl(var(--border))" }} />

            {/* Plan */}
            <div className="px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-semibold text-foreground">
                  {getPlanDisplayName(turbo.plan)}
                </span>
              </div>
              {profile && (
                <UnifiedMeter
                  creditsUsed={profile.credits_used}
                  creditsLimit={profile.credits_limit}
                  turboUnlocked={turbo.turboUnlocked}
                  turboWordsRemaining={turbo.turboWordsRemaining}
                  turboWordsCapacity={turbo.turboWordsCapacity}
                  hasTurboPlanAccess={turbo.hasTurboPlanAccess}
                  compact
                />
              )}
            </div>

            <div className="h-px w-full" style={{ background: "hsl(var(--border))" }} />

            {/* Streak & Words progress */}
            {!turbo.isLoading && (
              <div className="px-6 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          Streak
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                        Your writing streak counts consecutive days you've been active. Keep it going!
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-semibold">{turbo.streakDays} / {turbo.STREAK_GOAL} days</span>
                </div>
                <Progress value={turbo.streakProgress} className="h-1.5" variant="warning" />

                <div className="flex items-center justify-between text-sm mt-1">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <PenTool className="w-3.5 h-3.5 text-primary" />
                          Words Written
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                        Total words generated across all your books. Keep writing to unlock Turbo!
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-semibold">{(turbo.totalWordsWritten / 1000).toFixed(1)}K / {(turbo.WORDS_GOAL / 1000).toFixed(0)}K</span>
                </div>
                <Progress value={turbo.wordsProgress} className="h-1.5" />
              </div>
            )}

            <div className="h-px w-full" style={{ background: "hsl(var(--border))" }} />

            {/* Extra items injected by book display page */}
            {children && (
              <>
                {children}
                <div className="h-px w-full" style={{ background: "hsl(var(--border))" }} />
              </>
            )}

            {/* Menu items — SiteLayout style */}
            <div className="px-6">
              <button
                onClick={handleManageBilling}
                className="w-full flex items-center gap-3 text-left text-foreground transition-colors"
                style={{ fontSize: 18, fontWeight: 600, padding: "14px 0", borderBottom: "1px solid hsl(var(--border))" }}
              >
                <Coins className="w-5 h-5" />
                Billing & Credits
              </button>
              <button
                onClick={() => { setFeedbackOpen(true); setOpen(false); }}
                className="w-full flex items-center gap-3 text-left text-foreground transition-colors"
                style={{ fontSize: 18, fontWeight: 600, padding: "14px 0", borderBottom: "1px solid hsl(var(--border))" }}
              >
                <MessageSquare className="w-5 h-5" />
                Give Feedback
              </button>
              {user?.email === "mailsmartcodes@gmail.com" && (
                <button
                  onClick={() => { navigate("/admin/feedback"); setOpen(false); }}
                  className="w-full flex items-center gap-3 text-left text-foreground transition-colors"
                  style={{ fontSize: 18, fontWeight: 600, padding: "14px 0", borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <MessageSquare className="w-5 h-5" />
                  Feedback Dashboard
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 text-left text-destructive transition-colors"
                style={{ fontSize: 18, fontWeight: 600, padding: "14px 0" }}
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
