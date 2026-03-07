import { useState, useEffect } from "react";
import { BookOpen, Sparkles, LogOut, User, Plus, CreditCard, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";

interface NavigationProps {
  onCreateBook: () => void;
}

const PLAN_LABELS: Record<string, { label: string; icon: typeof Zap }> = {
  free: { label: "Free", icon: Zap },
  starter: { label: "Starter", icon: Sparkles },
  pro: { label: "Pro", icon: Crown },
  unlimited: { label: "Unlimited", icon: Crown },
};

const Navigation = ({ onCreateBook }: NavigationProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ plan: string; credits_used: number; credits_limit: number } | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, credits_used, credits_limit")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleManageSubscription = async () => {
    if (profile?.plan === "free") {
      navigate("/plans");
      return;
    }
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not open subscription portal.", variant: "destructive" });
    } finally {
      setLoadingPortal(false);
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const planInfo = PLAN_LABELS[profile?.plan || "free"] || PLAN_LABELS.free;
  const PlanIcon = planInfo.icon;
  const isUnlimited = profile?.plan === "unlimited";
  const creditsPercent = profile && !isUnlimited
    ? Math.min(100, (profile.credits_used / profile.credits_limit) * 100)
    : 0;

  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl">BookForge</h1>
              <p className="text-xs text-muted-foreground">AI Book Creation Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="hero" size="sm" onClick={onCreateBook} className="hidden sm:inline-flex">
              <Sparkles className="w-4 h-4" />
              New Book
            </Button>
            <Button variant="hero" size="icon" onClick={onCreateBook} className="sm:hidden">
              <Plus className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* User email */}
                <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate text-sm">{user?.email}</span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Plan & Credits */}
                {profile && (
                  <div className="px-2 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <PlanIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{planInfo.label} Plan</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {isUnlimited ? "∞" : `${profile.credits_limit - profile.credits_used}/${profile.credits_limit}`}
                      </Badge>
                    </div>
                    {!isUnlimited && (
                      <div className="space-y-1">
                        <Progress value={creditsPercent} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {profile.credits_used} of {profile.credits_limit} credits used
                        </p>
                      </div>
                    )}
                    {isUnlimited && (
                      <p className="text-xs text-muted-foreground">Unlimited credits</p>
                    )}
                  </div>
                )}

                <DropdownMenuSeparator />

                {/* Manage Subscription */}
                <DropdownMenuItem onClick={handleManageSubscription} disabled={loadingPortal}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {profile?.plan === "free" ? "Upgrade Plan" : "Manage Subscription"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Sign out */}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
