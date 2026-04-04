import { useState, useEffect } from "react";
import { LogOut, User, Flame, PenTool, MessageSquare, Coins, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
        <SheetContent side="right" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 pb-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-normal">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{user?.email}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Separator className="my-2" />

            {/* Plan */}
            <div className="px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Plan</span>
                <span className="text-xs font-semibold text-foreground">
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

            <Separator className="my-2" />

            {/* Streak & Words progress */}
            {!turbo.isLoading && (
              <div className="px-4 py-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
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

                <div className="flex items-center justify-between text-xs mt-1">
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

            <Separator className="my-2" />

            {/* Extra items injected by book display page */}
            {children && (
              <>
                {children}
                <Separator className="my-2" />
              </>
            )}

            {/* Menu items */}
            <div className="px-2 py-1 space-y-0.5">
              <button
                onClick={handleManageBilling}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              >
                <Coins className="w-4 h-4" />
                Billing & Credits
              </button>
              <button
                onClick={() => { setFeedbackOpen(true); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              >
                <MessageSquare className="w-4 h-4" />
                Give Feedback
              </button>
              {user?.email === "mailsmartcodes@gmail.com" && (
                <button
                  onClick={() => { navigate("/admin/feedback"); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                >
                  <MessageSquare className="w-4 h-4" />
                  Feedback Dashboard
                </button>
              )}
            </div>

            <Separator className="my-2" />

            <div className="px-2 py-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left text-destructive"
              >
                <LogOut className="w-4 h-4" />
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
