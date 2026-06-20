import { ReactNode, useMemo, useState } from "react";
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
    <aside className="hidden md:flex w-[92px] shrink-0 border-r border-border bg-background flex-col py-3 h-[calc(100vh-64px)] sticky top-16">
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto scrollbar-thin">
        {main.map((it) => <RailNode key={it.label} item={it} />)}
      </nav>
      <div className="px-2 pt-2 border-t border-border">
        <AccountRailFooter />
        {settings && <RailNode item={settings} />}
      </div>
    </aside>
  );
}

function RailNode({ item, depth = 0 }: { item: RailItem; depth?: number }) {
  const [open, setOpen] = useState(item.defaultOpen ?? false);
  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    return (
      <div>
        <RailLink item={{ ...item, onClick: () => setOpen((o) => !o) }} trailing={open ? ChevronUp : ChevronDown} />
        {open && (
          <div className="mt-1 mb-1 pl-1 flex flex-col gap-0.5">
            {item.children!.map((c) => <RailNode key={c.label} item={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }
  return <RailLink item={item} small={depth > 0} />;
}

function RailLink({ item, trailing, small }: { item: RailItem; trailing?: LucideIcon; small?: boolean }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  const Trailing = trailing;
  const styleFor = (isActive: boolean) =>
    cn(
      small
        ? "flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-medium transition-colors select-none w-full"
        : "relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-medium transition-colors select-none",
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
        <Icon className={small ? "w-3.5 h-3.5" : "w-5 h-5"} strokeWidth={2} />
        <span className={small ? "truncate" : ""}>{item.label}</span>
        {Trailing && !small && <Trailing className="absolute top-1 right-1 w-3 h-3" />}
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
        <Icon className={small ? "w-3.5 h-3.5" : "w-5 h-5"} strokeWidth={2} />
        <span className={small ? "truncate" : ""}>{item.label}</span>
      </button>
    );
  }
  return (
    <NavLink to={item.url!} end={item.url === "/dashboard"} className={({ isActive }) => styleFor(item.active ?? isActive)}>
      <Icon className={small ? "w-3.5 h-3.5" : "w-5 h-5"} strokeWidth={2} />
      <span className={small ? "truncate" : ""}>{item.label}</span>
    </NavLink>
  );
}

/** Account-related items that used to live in the right-side header dropdown. */
function AccountRailFooter() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://authoryti.com?logout=true";
  };

  const items: RailItem[] = [
    { label: "Billing",  icon: Coins,         onClick: () => navigate("/manage-subscription") },
    { label: "Feedback", icon: MessageSquare, onClick: () => setFeedbackOpen(true) },
  ];

  if (isAdminEmail(user?.email)) {
    items.push(
      { label: "Admin", icon: UserCog, defaultOpen: false, children: [
        { label: "Users",    icon: UserCog,       onClick: () => navigate("/admin/users") },
        { label: "Feedback", icon: MessageSquare, onClick: () => navigate("/admin/feedback") },
        { label: "Errors",   icon: ShieldAlert,   onClick: () => navigate("/admin/errors") },
      ]},
    );
  }

  items.push({ label: "Sign out", icon: LogOut, onClick: handleSignOut });

  return (
    <>
      <div className="flex flex-col gap-1 pb-2 mb-2 border-b border-border">
        {items.map((it) => <RailNode key={it.label} item={it} />)}
      </div>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}