import { AppShell } from "@/components/shell/AppShell";
import { Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/dashboard/content": "Content",
  "/dashboard/characters": "Characters",
  "/dashboard/world": "World",
  "/dashboard/analytics": "Analytics",
  "/dashboard/notes": "Notes",
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Coming Soon";
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center text-center py-24">
        <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Coming soon. We're polishing this part of Authoryti.
        </p>
      </div>
    </AppShell>
  );
}