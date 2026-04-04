import { BookOpen, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", href: "https://authoryti.com" },
  { label: "Sign In", href: "/auth" },
];

const PublicHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[100] glass border-b border-border" style={{ height: 64 }}>
      <div className="container max-w-6xl mx-auto px-4 h-full flex items-center">
        <div className="flex items-center justify-between">
          {/* Logo — matches dashboard header */}
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-serif font-bold text-xl">Authoryti</h1>
          </a>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground glow hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Join Waitlist
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden mt-4 pb-2 space-y-2 border-t border-border pt-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/waitlist"
              className="flex items-center gap-2 text-sm font-semibold py-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              onClick={() => setMobileOpen(false)}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Join Waitlist
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PublicHeader;
