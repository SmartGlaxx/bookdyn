import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, PenTool, Zap, Globe, Shield, Brain, Layers,
  ArrowRight, Star, CheckCircle2, ChevronRight, BookMarked, Users,
  Wand2, Cpu, Languages, Palette, Mic, Lock, Infinity as InfinityIcon,
  Rocket, Target, Quote, Plus, Minus, Award, Clock, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FloatingBookScene = lazy(() => import("@/components/3d/FloatingBook"));

/* ──────────────── Reveal wrapper ──────────────── */
const Reveal = ({
  children, delay = 0, y = 40, className = "",
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ──────────────── Aurora background ──────────────── */
const Aurora = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full opacity-50 blur-[140px] animate-aurora"
      style={{ background: "radial-gradient(circle, hsl(262 88% 55% / 0.5), transparent 60%)" }} />
    <div className="absolute top-1/3 -right-40 w-[800px] h-[800px] rounded-full opacity-40 blur-[140px] animate-aurora"
      style={{ background: "radial-gradient(circle, hsl(190 95% 50% / 0.45), transparent 60%)", animationDelay: "-6s" }} />
    <div className="absolute bottom-0 -left-40 w-[800px] h-[800px] rounded-full opacity-30 blur-[140px] animate-aurora"
      style={{ background: "radial-gradient(circle, hsl(310 90% 60% / 0.4), transparent 60%)", animationDelay: "-12s" }} />
  </div>
);

/* ──────────────── Floating particles ──────────────── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 24 }).map((_, i) => {
      const left = (i * 37) % 100;
      const top = (i * 53) % 100;
      const dur = 6 + (i % 5) * 2;
      const delay = (i * 0.4) % 6;
      return (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40"
          style={{ left: `${left}%`, top: `${top}%` }}
          animate={{ y: [-10, -40, -10], opacity: [0, 1, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    })}
  </div>
);

/* ──────────────── Data ──────────────── */
const stats = [
  { value: "10K+", label: "Books Created", icon: BookOpen },
  { value: "120+", label: "Genres & Styles", icon: Layers },
  { value: "10", label: "Languages", icon: Languages },
  { value: "4.9★", label: "Avg. Rating", icon: Star },
];

const logos = ["TechCrunch", "Forbes", "WIRED", "The Verge", "Product Hunt", "FastCompany"];

const features = [
  { icon: Brain, title: "Reasoning-grade AI", description: "Multi-model pipeline with DeepSeek Reasoner and Gemini fallback for nuanced, layered prose.", tint: "from-violet-500/20 to-violet-500/0" },
  { icon: Layers, title: "Auto-Structured Outlines", description: "Chapters, sections, subsections — generated with logical pacing and arcs in seconds.", tint: "from-cyan-500/20 to-cyan-500/0" },
  { icon: Languages, title: "10 Languages, Native Voice", description: "Write entire novels in English, French, Spanish, Chinese, Japanese, Arabic and more.", tint: "from-fuchsia-500/20 to-fuchsia-500/0" },
  { icon: Wand2, title: "Co-Pilot, Not Auto-Pilot", description: "Interaction before progression. Stay in control while the AI carries the heavy lifting.", tint: "from-violet-500/20 to-violet-500/0" },
  { icon: Palette, title: "Cinematic Cover Studio", description: "AI-generated covers with built-in canvas editor — typography, color, composition baked in.", tint: "from-cyan-500/20 to-cyan-500/0" },
  { icon: Users, title: "Living Character Index", description: "Characters with backstories, voices and arcs the AI keeps consistent across chapters.", tint: "from-fuchsia-500/20 to-fuchsia-500/0" },
  { icon: Mic, title: "Genre-Tuned Tone Profiles", description: "James Hadley Chase for crime, screenplay slugs for drama, lyrical literary for poetry.", tint: "from-violet-500/20 to-violet-500/0" },
  { icon: Cpu, title: "Anti-Repetition Engine", description: "Live audit loop that hunts repeated 4-word phrases, similes and adverb crutches.", tint: "from-cyan-500/20 to-cyan-500/0" },
  { icon: Shield, title: "Content & Account Safety", description: "Hardened RLS, sanitized rich text, and Turnstile-protected critical actions.", tint: "from-fuchsia-500/20 to-fuchsia-500/0" },
];

const steps = [
  { step: "01", icon: Target, title: "Define Your Vision", description: "Pick a book type, genre, depth, automation level and language. Set your direction in under a minute." },
  { step: "02", icon: Layers, title: "Generate the Outline", description: "Our reasoning model drafts chapters, sections and teasers tailored to your specs and audience." },
  { step: "03", icon: PenTool, title: "Co-write Each Chapter", description: "Stream prose section by section. Edit, rewrite or extend any paragraph with one click." },
  { step: "04", icon: Award, title: "Polish & Publish", description: "Generate a cover, run the lyrical-flow audit, and export to PDF or EPUB instantly." },
];

const testimonials = [
  { name: "Sarah Chen", role: "Self-Published Author", quote: "I've shipped four novels in six months. Authoryti understood the tone better than my old editor.", avatar: "SC" },
  { name: "Marcus Rivera", role: "Content Strategist", quote: "The reasoning model is on a different planet. Three technical guides, all 90% usable on first pass.", avatar: "MR" },
  { name: "Emily Watson", role: "Writing Coach", quote: "I recommend it to every student. It removes the friction without removing the writer.", avatar: "EW" },
  { name: "Jonas Keller", role: "Indie Novelist", quote: "Crime mode reads like vintage James Hadley Chase. Genuinely unsettling. Genuinely fast.", avatar: "JK" },
  { name: "Aiko Tanaka", role: "Editor, Tokyo", quote: "Native Japanese output without the awkward translation residue. That alone is worth the subscription.", avatar: "AT" },
  { name: "Liam O'Brien", role: "Screenwriter", quote: "Drama mode formats sluglines correctly. I stopped fighting Final Draft after week one.", avatar: "LO" },
];

const comparison = [
  { feature: "Multi-language native output", us: true, them: false },
  { feature: "Reasoning-grade AI pipeline", us: true, them: false },
  { feature: "Anti-repetition audit loop", us: true, them: false },
  { feature: "Genre-tuned style profiles", us: true, them: false },
  { feature: "Cinematic cover studio", us: true, them: "Basic" },
  { feature: "Character consistency index", us: true, them: false },
  { feature: "PDF + EPUB export", us: true, them: "PDF only" },
  { feature: "Co-pilot interaction model", us: true, them: false },
];

const faqs = [
  { q: "Who owns the books I create?", a: "You do, fully. All output is yours to publish, sell or share without attribution." },
  { q: "Which languages are supported?", a: "English, French, Spanish, German, Portuguese, Chinese, Japanese, Russian, Hindi and Arabic — with native-voice generation." },
  { q: "How is this different from ChatGPT?", a: "Authoryti is purpose-built for long-form books. It maintains character consistency, genre style, pacing and structure across an entire novel." },
  { q: "Is there a free plan?", a: "Yes. The Free tier lets you test the engine. Paid tiers unlock Turbo, deeper outlines and higher daily word limits." },
  { q: "Can I edit the AI's output?", a: "Every paragraph is editable in place. You can also rewrite, delete or extend with a single click." },
  { q: "Will it write in a specific style?", a: "Yes. Choose from genre profiles like James Hadley Chase crime, lyrical literary, screenplay drama and more." },
];

/* ──────────────── Page ──────────────── */
interface LandingPageProps {
  onCreateBook: () => void;
  bookCount: number;
}

const LandingPage = ({ onCreateBook, bookCount }: LandingPageProps) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative bg-background text-foreground overflow-hidden">
      {/* ═════════ HERO ═════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center">
        <Aurora />
        <div className="absolute inset-0 grid-bg" />
        <Particles />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 container max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span className="text-muted-foreground">New · Reasoning-grade book engine</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold tracking-tight leading-[1.02]"
              >
                Write a book.
                <br />
                <span className="text-shimmer">Not a prompt.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
                className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
              >
                Authoryti is the first AI co-pilot built for long-form authorship. Native multi-language output,
                genre-tuned voice, anti-repetition audit loops — and a cinematic editor that keeps you in the seat.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link to="/waitlist">
                  <Button variant="hero" size="xl" className="group shadow-glow">
                    <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="xl" className="glass-card border-border/50">
                    See how it works
                  </Button>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }}
                className="flex items-center gap-6 pt-6"
              >
                <div className="flex -space-x-2">
                  {["SC", "MR", "EW", "JK", "AT"].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">10,000+</span> writers shipping books
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: 3D scene with frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4 }}
              className="relative h-[500px] lg:h-[640px]"
            >
              <div className="absolute inset-0 rounded-3xl glass-card conic-border overflow-hidden">
                <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 animate-pulse" />}>
                  <FloatingBookScene />
                </Suspense>
                <div className="absolute bottom-4 left-4 right-4 glass-card rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Generating chapter 7 · French</div>
                    <div className="text-sm font-medium truncate">Le silence dans la pièce était assourdissant…</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground tracking-widest uppercase"
        >
          Scroll
        </motion.div>
      </section>

      {/* ═════════ LOGO MARQUEE ═════════ */}
      <section className="relative border-y border-border/40 py-10 overflow-hidden bg-card/30">
        <Reveal className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
          As featured in
        </Reveal>
        <div className="relative flex overflow-hidden gap-16 [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-16 shrink-0 px-8"
          >
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <div key={i} className="text-2xl font-serif font-bold text-muted-foreground/60 whitespace-nowrap">
                {logo}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═════════ STATS ═════════ */}
      <section className="relative py-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08}>
                <div className="glass-card rounded-2xl p-6 text-center group hover:border-primary/30 transition-colors">
                  <stat.icon className="w-6 h-6 text-primary mx-auto mb-3 transition-transform group-hover:scale-110" />
                  <div className="text-4xl md:text-5xl font-serif font-bold text-shimmer">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ FEATURES ═════════ */}
      <section id="features" className="relative py-24 lg:py-32">
        <Aurora />
        <div className="container max-w-7xl mx-auto px-6 relative z-10">
          <Reveal className="text-center mb-20 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Built for serious authors</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Everything you need.<br />
              <span className="text-gradient">Nothing you don't.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Nine pillars engineered for authors who care about voice, pacing and the texture of every paragraph.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.1}>
                <div className="group relative h-full p-7 rounded-2xl glass-card hover:border-primary/40 transition-all duration-500 hover:translate-y-[-4px] hover:shadow-glow">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.tint} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-serif font-semibold mb-3">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ DEMO MOCKUP ═════════ */}
      <section className="relative py-24 lg:py-32 bg-card/20 border-y border-border/30">
        <div className="container max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              An editor that <span className="text-gradient">actually feels alive</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Real-time streaming, paragraph-level AI controls, and a Character Index that never forgets a name.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="relative max-w-5xl mx-auto rounded-3xl glass-card conic-border overflow-hidden shadow-glow">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 bg-background/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground">authoryti.com / dashboard / midnight-in-marseille</div>
              </div>
              <div className="grid md:grid-cols-[200px_1fr_220px] min-h-[420px]">
                <div className="border-r border-border/40 p-4 space-y-2 hidden md:block">
                  <div className="text-xs uppercase text-muted-foreground tracking-widest mb-3">Chapters</div>
                  {["1. The Arrival", "2. A Stranger Calls", "3. Smoke and Mirrors", "4. The Old Port", "5. Verdict"].map((c, i) => (
                    <div key={c} className={`text-sm px-3 py-2 rounded-lg ${i === 2 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40 cursor-pointer"}`}>
                      {c}
                    </div>
                  ))}
                </div>
                <div className="p-8 space-y-4 font-serif">
                  <div className="text-xs uppercase tracking-widest text-primary">Chapter 3 · Smoke and Mirrors</div>
                  <h3 className="text-2xl font-bold">A debt unpaid is a wound that festers.</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The rain hadn't stopped for three days. Marceau lit another cigarette and watched the harbor swallow another ship whole. He knew what was coming — he'd known since the envelope landed on his desk that morning…
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="bg-primary/15 text-foreground px-1 rounded">She walked in without knocking</span>, and that, more than anything, told him she was already dangerous.
                  </p>
                  <div className="flex gap-2 pt-2">
                    {["Rewrite", "Extend", "Tighten", "Translate"].map((b) => (
                      <button key={b} className="px-3 py-1.5 text-xs rounded-full glass-card hover:border-primary/50 transition">
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-l border-border/40 p-4 space-y-3 hidden md:block bg-background/30">
                  <div className="text-xs uppercase text-muted-foreground tracking-widest">Character Index</div>
                  {[
                    { n: "Marceau", r: "Detective" },
                    { n: "Lila Vance", r: "Femme fatale" },
                    { n: "Old Henri", r: "Bartender" },
                  ].map((c) => (
                    <div key={c.n} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground">
                        {c.n.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.n}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.r}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ HOW IT WORKS ═════════ */}
      <section className="relative py-24 lg:py-32">
        <div className="container max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-20 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-6">
              <BookMarked className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">From idea to bookshelf</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-serif font-bold mb-4">
              Four steps.<br />
              <span className="text-gradient">One masterpiece.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
            {steps.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.12}>
                <div className={`relative p-7 rounded-2xl glass-card hover:border-primary/40 transition-all hover:shadow-glow ${i % 2 === 1 ? "md:translate-y-12" : ""}`}>
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                      <s.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-primary mb-1">Step {s.step}</div>
                      <h3 className="text-xl font-serif font-semibold mb-2">{s.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ COMPARISON ═════════ */}
      <section className="relative py-24 lg:py-32 bg-card/20 border-y border-border/30">
        <div className="container max-w-4xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Authoryti vs. <span className="text-muted-foreground line-through decoration-2">Generic AI</span>
            </h2>
            <p className="text-lg text-muted-foreground">A purpose-built tool will always beat a generalist.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="rounded-2xl glass-card overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-4 border-b border-border/40 text-sm uppercase tracking-widest text-muted-foreground">
                <div>Capability</div>
                <div className="w-24 text-center text-primary">Authoryti</div>
                <div className="w-24 text-center">Generic LLM</div>
              </div>
              {comparison.map((c, i) => (
                <div key={c.feature} className={`grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-4 items-center ${i !== comparison.length - 1 ? "border-b border-border/20" : ""}`}>
                  <div className="text-sm md:text-base">{c.feature}</div>
                  <div className="w-24 text-center">
                    {c.us === true ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-xs text-muted-foreground">{c.us}</span>}
                  </div>
                  <div className="w-24 text-center">
                    {c.them === false ? <Minus className="w-5 h-5 text-muted-foreground/40 mx-auto" /> : <span className="text-xs text-muted-foreground">{c.them}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ TESTIMONIALS ═════════ */}
      <section className="relative py-24 lg:py-32">
        <div className="container max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Trusted by authors worldwide</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-serif font-bold">
              Loved by <span className="text-gradient">writers everywhere</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 0.1}>
                <div className="h-full p-7 rounded-2xl glass-card hover:border-primary/40 transition-all hover:translate-y-[-4px]">
                  <Quote className="w-8 h-8 text-primary/40 mb-4" />
                  <p className="text-foreground/90 leading-relaxed mb-6">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ PRICING TEASER ═════════ */}
      <section className="relative py-24 lg:py-32 bg-card/20 border-y border-border/30">
        <div className="container max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Pricing that scales <span className="text-gradient">with your ambition</span>
            </h2>
            <p className="text-lg text-muted-foreground">Start free. Unlock Turbo when you're ready to ship.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free", price: "$0", desc: "Test the engine", features: ["1 book", "Basic genres", "PDF export"] },
              { name: "Starter", price: "$19", desc: "For weekend writers", features: ["10 books", "All genres", "All languages", "EPUB export"], highlight: false },
              { name: "Pro", price: "$49", desc: "For shipping authors", features: ["Unlimited books", "Turbo mode", "Cover studio", "Priority queue"], highlight: true },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <div className={`relative p-8 rounded-2xl h-full ${p.highlight ? "glass-card conic-border shadow-glow" : "glass-card hover:border-primary/30 transition-colors"}`}>
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-xs font-semibold text-primary-foreground">
                      Most popular
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mb-2">{p.name}</div>
                  <div className="text-5xl font-serif font-bold mb-1">{p.price}<span className="text-base text-muted-foreground font-sans">/mo</span></div>
                  <div className="text-sm text-muted-foreground mb-6">{p.desc}</div>
                  <ul className="space-y-3 mb-8">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/waitlist" className="block">
                    <Button variant={p.highlight ? "hero" : "outline"} className="w-full">
                      Get started
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ FAQ ═════════ */}
      <section className="relative py-24 lg:py-32">
        <div className="container max-w-3xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Questions, <span className="text-gradient">answered</span>
            </h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left glass-card rounded-2xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-serif font-semibold text-lg">{f.q}</h3>
                    <div className={`shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="text-muted-foreground pt-4 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ FINAL CTA ═════════ */}
      <section className="relative py-32 lg:py-40 overflow-hidden">
        <Aurora />
        <div className="absolute inset-0 grid-bg" />
        <div className="container max-w-4xl mx-auto px-6 relative z-10">
          <Reveal className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
              <Rocket className="w-4 h-4 text-accent" />
              <span className="text-muted-foreground">Limited beta access</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold leading-[1.05]">
              Your next book<br />
              <span className="text-shimmer">starts tonight.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of authors building their library with the most advanced book engine on the planet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/waitlist">
                <Button variant="hero" size="xl" className="group shadow-glow">
                  <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Claim your seat
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Lock className="w-4 h-4" /> No credit card</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> 60-second setup</div>
              <div className="flex items-center gap-2"><InfinityIcon className="w-4 h-4" /> Cancel anytime</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ FOOTER ═════════ */}
      <footer className="relative border-t border-border/40 py-12 bg-background">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-lg">Authoryti</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Authoryti. The book engine for serious authors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;