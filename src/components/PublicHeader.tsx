import { BookOpen, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", href: "https://authoryti.com" },
  { label: "Sign In", href: "/auth" },
];

const PublicHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-[100]"
      style={{
        height: 64,
        borderBottom: "1px solid hsl(var(--border))",
        background: "hsl(222 30% 7% / 0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="h-full flex items-center mx-auto"
        style={{ maxWidth: 1200, padding: "0 24px" }}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo — matches SiteLayout exactly */}
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
              }}
            >
              <BookOpen size={22} strokeWidth={1.5} color="#fff" />
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.01em",
                color: "hsl(var(--foreground))",
              }}
            >
              Authoryti
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-8">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
                color: "#fff",
              }}
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
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed left-0 right-0 bottom-0 z-[200] overflow-y-auto"
          style={{ top: 64, background: "hsl(222 30% 7%)", borderTop: "1px solid hsl(var(--border))", padding: 24 }}
        >
          <div className="flex flex-col gap-0">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-lg font-semibold text-foreground py-3.5 border-b border-border transition-colors"
                style={{ textDecoration: "none" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-6">
            <Link
              to="/waitlist"
              className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold"
              style={{
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
                color: "#fff",
              }}
              onClick={() => setMobileOpen(false)}
            >
              <Sparkles className="w-4 h-4" />
              Join Waitlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicHeader;
