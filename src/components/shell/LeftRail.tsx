import { ReactNode, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, FileText, Users, Globe, Settings,
  LayoutGrid, Library, Plus, Download, RefreshCw, Search, ShieldAlert,
  MessageSquare, UserCog, ChevronLeft, PenTool, Map, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface Props {
  items?: RailItem[];
}

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

  // Settings sits visually separate at the bottom.
  const main = resolved.filter((i) => i.label !== "Settings");
  const settings = resolved.find((i) => i.label === "Settings");

  return (
    <aside className="hidden md:flex w-[92px] shrink-0 border-r border-border bg-background flex-col py-3">
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {main.map((it) => <RailLink key={it.label} item={it} />)}
      </nav>
      {settings && (
        <div className="px-2 pt-2 border-t border-border">
          <RailLink item={settings} />
        </div>
      )}
    </aside>
  );
}

function RailLink({ item }: { item: RailItem }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  const styleFor = (isActive: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-medium transition-colors select-none",
      isActive
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
      item.disabled && "opacity-50",
    );

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={styleFor(!!item.active)}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
        <span>{item.label}</span>
      </button>
    );
  }
  if (item.disabled) {
    return (
      <button
        type="button"
        onClick={() => navigate("/coming-soon")}
        className={styleFor(false)}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
        <span>{item.label}</span>
      </button>
    );
  }
  return (
    <NavLink to={item.url!} end={item.url === "/dashboard"} className={({ isActive }) => styleFor(item.active ?? isActive)}>
      <Icon className="w-5 h-5" strokeWidth={2} />
      <span>{item.label}</span>
    </NavLink>
  );
}