import { ReactNode, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, FileText, Users, Globe, TrendingUp, StickyNote, Settings,
  LayoutGrid, BookMarked, Image, Download, Sparkles, ShieldCheck, FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RailItem {
  label: string;
  icon: LucideIcon;
  url: string;
  /** When true, shows a 'soon' faded look. */
  disabled?: boolean;
}

interface Props {
  items?: RailItem[];
}

function defaultItemsForPath(pathname: string): RailItem[] {
  // Book detail: /dashboard/:bookId (any non book-type slug)
  const bookMatch = pathname.match(/^\/dashboard\/([0-9a-f-]{8,})/i);
  if (bookMatch) {
    return [
      { label: "Overview",  icon: BookOpen,   url: `/dashboard/${bookMatch[1]}` },
      { label: "Chapters",  icon: LayoutGrid, url: `/dashboard/${bookMatch[1]}#chapters`, disabled: true },
      { label: "Characters",icon: Users,      url: `/dashboard/${bookMatch[1]}#characters`, disabled: true },
      { label: "World",     icon: Globe,      url: `/dashboard/${bookMatch[1]}#world`, disabled: true },
      { label: "Continuity",icon: ShieldCheck,url: `/dashboard/${bookMatch[1]}#continuity`, disabled: true },
      { label: "Cover",     icon: Image,      url: `/dashboard/${bookMatch[1]}#cover`, disabled: true },
      { label: "Export",    icon: Download,   url: `/dashboard/${bookMatch[1]}#export`, disabled: true },
      { label: "Settings",  icon: Settings,   url: `/dashboard/${bookMatch[1]}#settings`, disabled: true },
    ];
  }

  if (pathname.startsWith("/admin")) {
    return [
      { label: "Users",    icon: Users,         url: "/admin/users" },
      { label: "Feedback", icon: StickyNote,    url: "/admin/feedback" },
      { label: "Errors",   icon: FlaskConical,  url: "/admin/errors" },
      { label: "Settings", icon: Settings,      url: "/manage-subscription" },
    ];
  }

  // Default (library / new-book) — matches the uploaded mockup exactly.
  return [
    { label: "Overview",   icon: BookOpen,    url: "/dashboard" },
    { label: "Content",    icon: FileText,    url: "/dashboard/content" },
    { label: "Characters", icon: Users,       url: "/dashboard/characters" },
    { label: "World",      icon: Globe,       url: "/dashboard/world" },
    { label: "Analytics",  icon: TrendingUp,  url: "/dashboard/analytics" },
    { label: "Notes",      icon: StickyNote,  url: "/dashboard/notes" },
    { label: "Settings",   icon: Settings,    url: "/manage-subscription" },
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
  const className = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-medium transition-colors select-none",
      isActive
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
      item.disabled && "opacity-50",
    );
  if (item.disabled) {
    return (
      <button
        type="button"
        onClick={() => navigate("/coming-soon")}
        className={className({ isActive: false })}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
        <span>{item.label}</span>
      </button>
    );
  }
  return (
    <NavLink to={item.url} end={item.url === "/dashboard"} className={className}>
      <Icon className="w-5 h-5" strokeWidth={2} />
      <span>{item.label}</span>
    </NavLink>
  );
}