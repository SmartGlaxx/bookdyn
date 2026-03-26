import { useState, useEffect } from "react";
import { LogOut, User, Coins, Flame, Zap, PenTool, Lock, Crown, MessageSquare } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTurbo } from "@/hooks/useTurbo";
import { getPlanDisplayName, canAccessTurbo } from "@/lib/plans";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface UserMenuDropdownProps {
  className?: string;
}

export function UserMenuDropdown({ className }: UserMenuDropdownProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ credits_used: number; credits_limit: number } | null>(null);
  const turbo = useTurbo();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://authoryti.com?logout=true";
  };

  const handleManageBilling = () => {
    navigate("/manage-subscription");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const remainingCredits = profile
    ? Math.max(0, profile.credits_limit - profile.credits_used)
    : null;
  const creditsPercent = profile
    ? Math.min(100, (profile.credits_used / profile.credits_limit) * 100)
    : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`rounded-full ${className || ""}`}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="truncate text-sm">{user?.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Plan & Credits */}
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Plan</span>
            <span className="text-xs font-semibold text-foreground">
              {getPlanDisplayName(turbo.plan)}
            </span>
          </div>
          {profile && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">Credits</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {remainingCredits} remaining
                </span>
              </div>
              <Progress value={creditsPercent} className="h-1.5" />
            </>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Turbo Progress */}
        {!turbo.isLoading && (
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Streak
              </span>
              <span className="font-semibold">{turbo.streakDays} days</span>
            </div>
            <Progress value={turbo.streakProgress} className="h-1.5" variant="warning" />
            <p className="text-[11px] text-muted-foreground">
              {turbo.streakDays >= turbo.STREAK_GOAL
                ? "🔥 Streak goal reached!"
                : `${turbo.STREAK_GOAL - turbo.streakDays} more days to unlock Turbo`}
            </p>

            <div className="flex items-center justify-between text-xs mt-1">
              <span className="flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-primary" />
                Words
              </span>
              <span className="font-semibold">{(turbo.totalWordsWritten / 1000).toFixed(1)}K</span>
            </div>
            <Progress value={turbo.wordsProgress} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {turbo.totalWordsWritten >= turbo.WORDS_GOAL
                ? "✍️ Word goal reached!"
                : `${((turbo.WORDS_GOAL - turbo.totalWordsWritten) / 1000).toFixed(1)}K more words to go`}
            </p>

            {/* Turbo status message */}
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground rounded-md bg-muted/50 p-2">
              {canAccessTurbo(turbo.plan) && turbo.turboUnlocked ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Turbo Active — {(turbo.turboWordsRemaining / 1000).toFixed(0)}K words remaining</span>
                </>
              ) : !canAccessTurbo(turbo.plan) ? (
                <>
                  <Crown className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Upgrade to Pro or Elite to unlock Turbo Mode.</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Maintain a {turbo.STREAK_GOAL}-day streak and write {(turbo.WORDS_GOAL / 1000).toFixed(0)}K+ words to unlock Auto Draft mode.</span>
                </>
              )}
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleManageBilling}>
          <Coins className="w-4 h-4 mr-2" />
          Billing & Credits
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Give Feedback
        </DropdownMenuItem>

        {user?.email === "mailsmartcodes@gmail.com" && (
          <DropdownMenuItem onClick={() => navigate("/admin/feedback")}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback Dashboard
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </DropdownMenu>
  );
}
