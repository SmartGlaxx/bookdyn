import { useState, useEffect } from "react";
import { BookOpen, Sparkles, LogOut, User, Plus, Coins } from "lucide-react";
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

interface NavigationProps {
  onCreateBook: () => void;
}


const Navigation = ({ onCreateBook }: NavigationProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ credits_used: number; credits_limit: number } | null>(null);
  

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("credits_used, credits_limit")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
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
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl">Authoryti</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Book Creation</p>
            </div>
          </a>

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

                {/* Credits */}
                {profile && (
                  <div className="px-2 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Credits</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {remainingCredits} remaining
                      </span>
                    </div>
                    <Progress value={creditsPercent} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {profile.credits_used} of {profile.credits_limit} used
                    </p>
                  </div>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleManageBilling}>
                  <Coins className="w-4 h-4 mr-2" />
                  Billing & Credits
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
