import { BookOpen } from "lucide-react";

const FOOTER_COLS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "https://authoryti.com/features" },
      { label: "Pricing", href: "https://authoryti.com/pricing" },
      { label: "Blog", href: "https://authoryti.com/blog" },
      { label: "Docs", href: "https://authoryti.com/docs" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "https://authoryti.com/about" },
      { label: "Contact", href: "https://authoryti.com/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "https://authoryti.com/privacy" },
      { label: "Terms", href: "https://authoryti.com/terms" },
    ],
  },
];

const SOCIALS = [
  { l: "X", h: "#" },
  { l: "in", h: "#" },
  { l: "gh", h: "#" },
];

const PublicFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-border"
      style={{ background: "hsl(222 30% 5%)" }}
    >
      {/* Gradient line at top */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(35 92% 48% / 0.4) 50%, transparent 100%)",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "hsla(35,92%,55%,0.12)",
                  display: "flex",
                }}
              >
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
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The AI-powered book creation engine. From blank page to complete
              manuscript — faster than you ever thought possible.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2 pt-2">
              {SOCIALS.map(({ l, h }) => (
                <a
                  key={l}
                  href={h}
                  className="flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border rounded-lg transition-all"
                  style={{ width: 36, height: 36 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "hsla(35,92%,55%,0.5)";
                    e.currentTarget.style.color = "hsl(35,92%,55%)";
                    e.currentTarget.style.background = "hsla(35,92%,55%,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "";
                    e.currentTarget.style.color = "";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.heading}
              </h4>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="h-px w-full bg-border mb-8" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {year} Authoryti, Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: "hsl(142,71%,45%)" }}
            />
            <span className="text-xs text-muted-foreground">
              All systems operational
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Crafted with{" "}
            <span style={{ color: "hsl(35,92%,55%)" }}>♦</span> for writers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
