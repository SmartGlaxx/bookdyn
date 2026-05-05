import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Users, ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

const WAITLIST_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waitlist`;

const BENEFITS = [
  "Locked-in Starter plan at $9/month forever — even as prices increase",
  "Early access before public launch",
  "Direct line to the founding team",
  "Your name in the founding members list",
];

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "exists" | "error"
  >("idle");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(WAITLIST_URL)
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? null))
      .catch(() => null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "waitlist_page" }),
      });
      const data = await res.json();
      if (data.error === "already_exists") {
        setStatus("exists");
      } else if (data.success) {
        setStatus("success");
        setCount(data.count ?? null);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <div className="flex-1 relative overflow-hidden flex items-center justify-center px-4 py-16" style={{ paddingTop: 81 }}>
        {/* Background blobs with golden accent */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/3 blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl w-full text-center flex flex-col items-center gap-8">
          {/* Pill */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            Coming Soon
          </span>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground font-serif">
            Be First.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Write Better.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Join the waitlist and lock in founding member pricing —{" "}
            <span className="text-foreground font-semibold">
              available only to the first 500 signups.
            </span>
          </p>

          <p className="text-sm text-muted-foreground max-w-lg">
            Bookdyn is an AI-powered book creation engine. We're putting
            the finishing touches on something writers have been waiting for.
          </p>

          {/* Form / Success */}
          {status === "success" ? (
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-lg w-full max-w-md">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  You're on the list ✦
                </h3>
                <p className="text-sm text-muted-foreground">
                  We'll be in touch soon with early access details.
                </p>
              </div>
              {count !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Users className="w-4 h-4" />
                  <span>
                    <span className="font-semibold text-foreground">
                      {count.toLocaleString()}
                    </span>{" "}
                    writers now on the waitlist
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 rounded-full border border-border bg-card/80 text-foreground text-sm outline-none focus:border-primary/50 transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full px-6 py-3.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 glow"
              >
                {status === "loading" ? (
                  "Joining..."
                ) : (
                  <>
                    Join the Waitlist <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {status === "exists" && (
                <p className="text-sm text-primary text-center mt-1">
                  You're already on the list — we'll reach out soon. ✦
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-destructive text-center mt-1">
                  Something went wrong — please try again.
                </p>
              )}
            </form>
          )}

          {/* Live count */}
          {status !== "success" && count !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                <span className="font-semibold text-foreground">
                  {count.toLocaleString()}
                </span>{" "}
                writers already on the waitlist
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px bg-border" />

          {/* Founding member benefits */}
          <div className="w-full max-w-md text-left">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
              What founding members get
            </h3>
            <ul className="flex flex-col gap-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Urgency note */}
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            Founding member pricing locks in your rate forever — even as prices
            increase after launch.
            <br />
            <span className="font-semibold text-foreground">
              Only available to the first 500 signups.
            </span>
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
