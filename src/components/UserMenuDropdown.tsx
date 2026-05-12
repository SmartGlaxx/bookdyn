import { useState, useEffect } from "react";
import { LogOut, User, Flame, PenTool, MessageSquare } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTurbo } from "@/hooks/useTurbo";
import { getPlanDisplayName } from "@/lib/plans";
import { isAdminEmail } from "@/lib/admin";
import { UnifiedMeter } from "@/components/UnifiedMeter";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coins } from "lucide-react";

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
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://bookdyn.com?logout=true";
  };

  const handleManageBilling = () => {
    navigate("/manage-subscription");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

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

        {/* Plan */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Plan</span>
            <span className="text-xs font-semibold text-foreground">
              {getPlanDisplayName(turbo.plan)}
            </span>
          </div>

          {/* Unified Meter */}
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

        <DropdownMenuSeparator />

        {/* Streak & Words progress */}
        {!turbo.isLoading && (
          <div className="px-2 py-2 space-y-2">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Unlock Turbo
            </div>
            <div className="pl-3 border-l border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Streak
              </span>
              <span className="font-semibold">{turbo.streakDays} / {turbo.STREAK_GOAL} days</span>
            </div>
            <Progress value={turbo.streakProgress} className="h-1.5" variant="warning" />

            <div className="flex items-center justify-between text-xs mt-1">
              <span className="flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-primary" />
                Words Written
              </span>
              <span className="font-semibold">{(turbo.totalWordsWritten / 1000).toFixed(1)}K / {(turbo.WORDS_GOAL / 1000).toFixed(0)}K</span>
            </div>
            <Progress value={turbo.wordsProgress} className="h-1.5" />
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

        {isAdminEmail(user?.email) && (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin/feedback")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/errors")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Error Logs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/users")}>
              <User className="w-4 h-4 mr-2" />
              User Admin
            </DropdownMenuItem>
          </>
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
