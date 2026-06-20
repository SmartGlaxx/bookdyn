import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { LeftRail, type RailItem } from "./LeftRail";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /** Sidebar items override. If omitted, the shell picks a sensible default from the route. */
  sidebarItems?: RailItem[];
  /** Optional label shown in the top "project switcher" slot. */
  projectLabel?: string;
  /** When true (default), wraps children in the large bordered page card. */
  pageCard?: boolean;
  className?: string;
}

export function AppShell({
  children,
  sidebarItems,
  projectLabel,
  pageCard = true,
  className,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader projectLabel={projectLabel} />
      <div className="flex-1 flex min-h-0">
        <LeftRail items={sidebarItems} />
        <main className={cn("flex-1 min-w-0 p-4 sm:p-6", className)}>
          {pageCard ? (
            <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-8 min-h-[calc(100vh-64px-3rem)]">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}