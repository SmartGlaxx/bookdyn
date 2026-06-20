import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, FileText, Users, Globe, Settings,
  LayoutGrid, Library, Plus, Download, RefreshCw, Search, ShieldAlert,
  MessageSquare, UserCog, ChevronLeft, PenTool, Map, Sparkles,
  Coins, LogOut, ChevronDown, ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/lib/admin";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export interface RailItem {
  label: string;
  icon: LucideIcon;
  /** A route to navigate to. Either url or onClick must be set. */
  url?: string;
  /** Optional click handler — used for in-page actions. */
  onClick?: () => void;
  /** Force-active state. If omitted, NavLink computes from url. */
  active?: boolean;
  /** When true, item is muted and routes to a coming-soon page when clicked. */
  disabled?: boolean;
  /** Optional expandable sub-items rendered below this item when toggled open. */
  children?: RailItem[];
  /** When true, item starts expanded. */
  defaultOpen?: boolean;
}

interface Props {
  items?: RailItem[];
}

type Layout = "rail" | "list";

function defaultItemsForPath(pathname: string): RailItem[] {
  // New Book wizard — matches the uploaded mockup.
  if (pathname.startsWith("/dashboard/new-book")) {
    return [
      { label: "Setup",       icon: Sparkles,   url: "/dashboard/new-book" },
      { label: "Story",       icon: FileText,   url: "/dashboard/new-book", disabled: true },
      { label: "Characters",  icon: Users,      url: "/dashboard/new-book", disabled: true },
      { label: "World",       icon: Globe,      url: "/dashboard/new-book", disabled: true },
      { label: "Chapters",    icon: LayoutGrid, url: "/dashboard/new-book", disabled: true },
      { label: "Settings",    icon: Settings,   url: "/manage-subscription" },
    ];
  }

  if (pathname.startsWith("/admin")) {
    return [
      { label: "Library",  icon: ChevronLeft,   url: "/dashboard" },
      { label: "Users",    icon: UserCog,       url: "/admin/users" },
      { label: "Feedback", icon: MessageSquare, url: "/admin/feedback" },
      { label: "Errors",   icon: ShieldAlert,   url: "/admin/errors" },
      { label: "Settings", icon: Settings,      url: "/manage-subscription" },
    ];
  }

  // Default — Library / shelves. Realistic items for that surface only.
  return [
    { label: "Library",   icon: Library,    url: "/dashboard" },
    { label: "Shelves",   icon: LayoutGrid, url: "/dashboard", disabled: true },
    { label: "New Book",  icon: Plus,       url: "/dashboard/new-book" },
    { label: "Settings",  icon: Settings,   url: "/manage-subscription" },
  ];
}

export function LeftRail({ items }: Props) {
  const { pathname } = useLocation();
  const resolved = useMemo(() => items ?? defaultItemsForPath(pathname), [items, pathname]);
  return (
    <aside className="hidden md:flex w-[92px] shrink-0 border-r border-border bg-background flex-col h-[calc(100vh-64px)] sticky top-16">
      <RailBody items={resolved} layout="rail" />
    </aside>
  );
}

/** Mobile off-canvas version of the LeftRail, triggered from AppHeader's hamburger. */
export function MobileLeftRailSheet({
  items,
  open,
  onOpenChange,
}: {
  items?: RailItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { pathname } = useLocation();
  const resolved = useMemo(() => items ?? defaultItemsForPath(pathname), [items, pathname]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[260px] p-0 border-r border-border bg-background">
        <RailBody items={resolved} layout="list" onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

/** Shared body. Everything scrolls together; only Sign Out is pinned at the bottom. */
function RailBody({
  items,
  layout,
  onNavigate,
}: { items: RailItem[]; layout: Layout; onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const close = onNavigate ?? (() => {});

  // Default account items (used to live in the right-side header dropdown).
  const accountTop: RailItem[] = [
    { label: "Billing",  icon: Coins,         onClick: () => { navigate("/manage-subscription"); close(); } },
    { label: "Feedback", icon: MessageSquare, onClick: () => { setFeedbackOpen(true); close(); } },
  ];
  if (isAdminEmail(user?.email)) {
    accountTop.push({
      label: "Admin", icon: UserCog, children: [
        { label: "Users",    icon: UserCog,       onClick: () => { navigate("/admin/users"); close(); } },
        { label: "Feedback", icon: MessageSquare, onClick: () => { navigate("/admin/feedback"); close(); } },
        { label: "Errors",   icon: ShieldAlert,   onClick: () => { navigate("/admin/errors"); close(); } },
      ],
    });
  }
  const signOutItem: RailItem = {
    label: "Sign out", icon: LogOut,
    onClick: async () => { await signOut(); window.location.href = "https://authoryti.com?logout=true"; },
  };

  // Surface order: main → Settings (if present) → account → [pinned Sign out]
  const settings = items.find((i) => i.label === "Settings");
  const main = items.filter((i) => i.label !== "Settings");

  return (
    <div className="flex flex-col h-full min-h-0">
      <nav className={cn(
        "flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 py-3",
        layout === "rail" ? "px-2" : "px-3",
      )}>
        {main.map((it) => <RailNode key={it.label} item={it} layout={layout} onNavigate={close} />)}
        {(settings || accountTop.length > 0) && (
          <div className="my-2 border-t border-border" />
        )}
        {settings && <RailNode key="settings" item={settings} layout={layout} onNavigate={close} />}
        {accountTop.map((it) => <RailNode key={it.label} item={it} layout={layout} onNavigate={close} />)}
      </nav>
      <div className={cn("border-t border-border", layout === "rail" ? "px-2 py-2" : "px-3 py-2")}>
        <RailNode item={signOutItem} layout={layout} onNavigate={close} />
      </div>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

function RailNode({
  item, depth = 0, layout, onNavigate,
}: { item: RailItem; depth?: number; layout: Layout; onNavigate?: () => void }) {
  const [open, setOpen] = useState(item.defaultOpen ?? false);
  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    return (
      <div>
        <RailLink item={{ ...item, onClick: () => setOpen((o) => !o) }} trailing={open ? ChevronUp : ChevronDown} layout={layout} />
        {open && (
          <div className={cn("mt-1 mb-1 flex flex-col gap-0.5", layout === "list" ? "pl-6" : "pl-1")}>
            {item.children!.map((c) => <RailNode key={c.label} item={c} depth={depth + 1} layout={layout} onNavigate={onNavigate} />)}
          </div>
        )}
      </div>
    );
  }
  return <RailLink item={item} small={depth > 0} layout={layout} onNavigate={onNavigate} />;
}

function RailLink({
  item, trailing, small, layout, onNavigate,
}: { item: RailItem; trailing?: LucideIcon; small?: boolean; layout: Layout; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  const Trailing = trailing;
  const styleFor = (isActive: boolean) => {
    const base =
      layout === "list"
        ? (small
            ? "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors select-none w-full"
            : "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors select-none w-full")
        : (small
            ? "flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-medium transition-colors select-none w-full"
            : "relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-medium transition-colors select-none");
    return cn(
      base,
      isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
      item.disabled && "opacity-50",
    );
  };

  const iconCls =
    layout === "list"
      ? (small ? "w-3.5 h-3.5" : "w-4 h-4")
      : (small ? "w-3.5 h-3.5" : "w-5 h-5");

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={() => { item.onClick!(); if (!item.children) onNavigate?.(); }}
        className={styleFor(!!item.active)}
      >
        <Icon className={iconCls} strokeWidth={2} />
        <span className={cn(small || layout === "list" ? "truncate" : "")}>{item.label}</span>
        {Trailing && layout === "rail" && !small && <Trailing className="absolute top-1 right-1 w-3 h-3" />}
        {Trailing && layout === "list" && <Trailing className="ml-auto w-3.5 h-3.5" />}
      </button>
    );
  }
  if (item.disabled) {
    return (
      <button
        type="button"
        onClick={() => { navigate("/coming-soon"); onNavigate?.(); }}
        className={styleFor(false)}
      >
        <Icon className={iconCls} strokeWidth={2} />
        <span className={cn(small || layout === "list" ? "truncate" : "")}>{item.label}</span>
      </button>
    );
  }
  return (
    <NavLink
      to={item.url!}
      end={item.url === "/dashboard"}
      onClick={() => onNavigate?.()}
      className={({ isActive }) => styleFor(item.active ?? isActive)}
    >
      <Icon className={iconCls} strokeWidth={2} />
      <span className={cn(small || layout === "list" ? "truncate" : "")}>{item.label}</span>
    </NavLink>
  );
}