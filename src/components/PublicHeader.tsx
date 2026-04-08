import { BookOpen, Menu, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const NAV_LINKS: [string, string][] = [
  ["Features", "https://authoryti.com/features"],
  ["Pricing", "https://authoryti.com/pricing"],
  ["Blog", "https://authoryti.com/blog"],
  ["Docs", "https://authoryti.com/docs"],
  ["Join Waitlist", "/waitlist"],
];

const PublicHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 99998,
          opacity: menuOpen ? 1 : 0,
          visibility: menuOpen ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
        }}
      />

      {/* Mobile sidebar menu */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "80%",
          maxWidth: 320,
          height: "100%",
          background: "hsl(222 30% 7%)",
          zIndex: 99999,
          padding: 24,
          overflowY: "auto",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        {/* Menu content */}
        <div style={{ marginTop: 40, flex: 1 }}>
          <div>
            {NAV_LINKS.map(([label, href]) => {
              const isInternal = href.startsWith("/");
              const isWaitlist = label === "Join Waitlist";
              const linkStyle: React.CSSProperties = {
                fontSize: 18,
                fontWeight: 600,
                color: isWaitlist ? "hsl(35,92%,55%)" : "hsl(var(--foreground))",
                padding: "14px 0",
                borderBottom: "1px solid hsl(var(--border))",
                textDecoration: "none",
                display: "block",
              };
              return isInternal ? (
                <Link key={label} to={href} onClick={() => setMenuOpen(false)} style={linkStyle}>
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} onClick={() => setMenuOpen(false)} style={linkStyle}>
                  {label}
                </a>
              );
            })}
          </div>

          <div style={{ marginTop: 24 }}>
            <Link
              to="/waitlist"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              Start Writing
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-[10000] border-b border-border"
        style={{
          background: "rgba(18,22,35,0.95)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between" style={{ height: 64 }}>
          {/* Logo */}
          <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity" style={{ textDecoration: "none" }}>
            <div style={{ padding: 8, borderRadius: 10, background: "hsla(35,92%,55%,0.12)", display: "flex" }}>
              <BookOpen size={20} color="var(--primary)" strokeWidth={2} />
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.01em",
                color: "var(--fg)",
              }}
            >
              Authoryti
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center" style={{ gap: 32 }}>
            {NAV_LINKS.map(([label, href]) => {
              const isInternal = href.startsWith("/");
              const isWaitlist = label === "Join Waitlist";
              const style: React.CSSProperties = {
                fontSize: 14,
                fontWeight: 500,
                color: isWaitlist ? "hsl(35,92%,55%)" : "hsl(var(--muted-foreground))",
                textDecoration: "none",
                transition: "color 0.2s",
              };
              return isInternal ? (
                <Link key={label} to={href} style={style}>{label}</Link>
              ) : (
                <a key={label} href={href} style={style}>{label}</a>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center" style={{ gap: 12 }}>
            <Link
              to="/waitlist"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 999,
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              Start Writing
            </Link>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "hsl(var(--foreground))" }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </nav>
    </>
  );
};

export default PublicHeader;
