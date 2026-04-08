import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  BookOpen,
  Sparkles,
  PenTool,
  Zap,
  Globe,
  Shield,
  Brain,
  Layers,
  ArrowRight,
  Star,
  CheckCircle2,
  ChevronRight,
  BookMarked,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FloatingBookScene = lazy(() => import("@/components/3d/FloatingBook"));
const GlowingSphereScene = lazy(() => import("@/components/3d/GlowingSphere"));

const Scene3DFallback = ({ className = "" }: { className?: string }) => (
  <div className={`w-full h-full flex items-center justify-center ${className}`}>
    <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse-glow" />
  </div>
);

/* ─── Scroll-animated wrapper ─── */
const RevealSection = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Stats bar ─── */
const stats = [
  { value: "10K+", label: "Books Created" },
  { value: "8+", label: "Book Types" },
  { value: "50+", label: "Genre Options" },
  { value: "4.9★", label: "User Rating" },
];

/* ─── Features ─── */
const features = [
  {
    icon: Brain,
    title: "AI-Powered Writing",
    description: "Advanced language models craft professional prose, adapting to your chosen tone and style.",
  },
  {
    icon: Layers,
    title: "Multi-Chapter Outlines",
    description: "Automatically generates structured outlines with chapters, sections, and logical flow.",
  },
  {
    icon: Globe,
    title: "Any Genre, Any Audience",
    description: "From sci-fi novels to technical guides—configure genre, POV, and target audience.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Generate complete book outlines in seconds, full chapters in minutes.",
  },
  {
    icon: Shield,
    title: "Content Safety",
    description: "Built-in content moderation and sanitization ensures safe, professional output.",
  },
  {
    icon: Users,
    title: "Character Gallery",
    description: "AI-generated character profiles with rich backstories and personality traits.",
  },
];

/* ─── How it works ─── */
const steps = [
  {
    step: "01",
    title: "Define Your Vision",
    description: "Choose your book type, genre, tone, and target audience. Set the creative direction.",
  },
  {
    step: "02",
    title: "AI Generates Outline",
    description: "Our AI creates a comprehensive chapter-by-chapter outline tailored to your specifications.",
  },
  {
    step: "03",
    title: "Content Generation",
    description: "Each chapter is written with consistent characters, plot threads, and narrative voice.",
  },
  {
    step: "04",
    title: "Review & Export",
    description: "Review your book, make adjustments, and export as a professionally formatted PDF.",
  },
];

/* ─── Testimonials ─── */
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Self-Published Author",
    quote:
      "Authoryti turned my rough ideas into a complete novel outline in minutes. The AI understood exactly the tone I wanted.",
    avatar: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "Content Creator",
    quote: "I've used it to create three technical guides. The structure and depth of content is genuinely impressive.",
    avatar: "MR",
  },
  {
    name: "Emily Watson",
    role: "Writing Coach",
    quote:
      "I recommend Authoryti to all my students. It's the best tool for overcoming writer's block and structuring ideas.",
    avatar: "EW",
  },
];

interface LandingPageProps {
  onCreateBook: () => void;
  bookCount: number;
}

const LandingPage = ({ onCreateBook, bookCount }: LandingPageProps) => {
  return (
    <div className="relative">
      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 container max-w-7xl mx-auto px-4 py-20 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">AI-Powered Book Creation</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-[1.1]">
                Write Books
                <br />
                <span className="text-gradient">Autonomously</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
                Transform your ideas into complete, professionally structured books. From novels to technical
                guides—your vision, realized by AI.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* COMMENTED OUT FOR PRE-LAUNCH — uncomment after launch to restore CTA
                <Button variant="hero" size="xl" onClick={onCreateBook} className="group">
                  <BookOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Start Now — It's Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
                */}
                <Link to="/waitlist">
                  <Button variant="hero" size="xl" className="group">
                    <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {["SC", "MR", "EW", "JK"].map((initials, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium text-primary"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">10,000+</span> books created
                </div>
              </div>
            </motion.div>

            {/* Right: 3D Scene */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-[500px] lg:h-[600px] relative"
            >
              <Suspense fallback={<Scene3DFallback />}>
                <FloatingBookScene />
              </Suspense>
              {/* Glow effect behind 3D */}
              <div className="absolute inset-0 -z-10 bg-primary/5 rounded-full blur-[80px]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════ STATS BAR ════════════ */}
      <section className="relative z-10 border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <RevealSection key={stat.label} delay={i * 0.1}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-serif font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section className="py-24 lg:py-32 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <RevealSection className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Powerful Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
              Everything You Need to <span className="text-gradient">Create Books</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Professional-grade AI tools that handle every aspect of book creation.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 0.08}>
                <Card variant="interactive" className="h-full group border-border/50 hover:border-primary/30">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-serif font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="py-24 lg:py-32 bg-card/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-50">
          <Suspense fallback={null}>
            <GlowingSphereScene variant="small" />
          </Suspense>
        </div>
        <div className="container max-w-6xl mx-auto px-4 relative z-10">
          <RevealSection className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6">
              <BookMarked className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Simple Process</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
              From Idea to Book in <span className="text-gradient">4 Steps</span>
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, i) => (
              <RevealSection key={step.step} delay={i * 0.12}>
                <div className="flex gap-6 p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-serif font-bold text-primary">{step.step}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ SHOWCASE / 3D SECTION ════════════ */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <RevealSection>
              <div className="h-[400px] lg:h-[500px] relative">
                <Suspense fallback={<Scene3DFallback />}>
                  <GlowingSphereScene />
                </Suspense>
              </div>
            </RevealSection>

            <RevealSection delay={0.2} className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-serif font-bold">
                Powered by <span className="text-gradient">Advanced AI</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our multi-model AI pipeline understands narrative structure, character development, and genre
                conventions to produce genuinely compelling content.
              </p>
              <div className="space-y-4">
                {[
                  "Consistent character voices across chapters",
                  "Genre-appropriate tone and pacing",
                  "Intelligent plot thread management",
                  "Professional formatting and structure",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
              {/* COMMENTED OUT FOR PRE-LAUNCH — uncomment after launch to restore CTA
              <Button variant="hero" size="lg" onClick={onCreateBook} className="group">
                Get Started Free
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              */}
              <Link to="/waitlist">
                <Button variant="hero" size="lg" className="group">
                  Join the Waitlist
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ════════════ TESTIMONIALS ════════════ */}
      <section className="py-24 lg:py-32 bg-card/30 relative">
        <div className="container max-w-6xl mx-auto px-4">
          <RevealSection className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Testimonials</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
              Loved by <span className="text-gradient">Writers</span>
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.1}>
                <Card className="h-full border-border/50">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {t.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

        <div className="container max-w-3xl mx-auto px-4 relative z-10">
          <RevealSection className="text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif font-bold">
              Ready to Write Your <span className="text-gradient">Masterpiece</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of writers who are creating complete books with AI. Start your first book in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* COMMENTED OUT FOR PRE-LAUNCH — uncomment after launch to restore CTA
              <Button variant="hero" size="xl" onClick={onCreateBook} className="group">
                <Sparkles className="w-5 h-5" />
                Start Now — It's Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              */}
              <Link to="/waitlist">
                <Button variant="hero" size="xl" className="group">
                  <Sparkles className="w-5 h-5" />
                  Join the Waitlist
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-border py-12 bg-card/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen size={20} color="var(--primary)" />
              </div>
              <span className="font-serif font-bold text-lg">Authoryti</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Authoryti. AI-powered book creation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
