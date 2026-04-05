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

const PublicFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "hsl(222 30% 5%)" }}>
      {/* Gradient line at top */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(35 92% 48% / 0.4) 50%, transparent 100%)",
        }}
      />

      <div
        className="mx-auto"
        style={{ maxWidth: 1200, padding: "80px 24px 48px" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
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
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The AI-powered book creation engine. From blank page to complete
              manuscript — faster than you ever thought possible.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h4
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
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
          <p className="text-xs text-muted-foreground">
            Crafted with{" "}
            <span className="text-primary">♦</span> for writers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
