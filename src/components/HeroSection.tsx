import { motion } from "framer-motion";
import { Book, Sparkles, BookOpen, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onCreateBook: () => void;
  bookCount: number;
}

const HeroSection = ({ onCreateBook, bookCount }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Overlay gradient */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/60 to-transparent" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 py-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Floating icons */}
          <div className="flex justify-center gap-8 mb-8">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="p-4 rounded-2xl bg-card shadow-lg"
            >
              <Book className="w-8 h-8 text-primary" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
              className="p-4 rounded-2xl bg-card shadow-lg"
            >
              <Sparkles className="w-8 h-8 text-accent" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1 }}
              className="p-4 rounded-2xl bg-card shadow-lg"
            >
              <PenTool className="w-8 h-8 text-primary" />
            </motion.div>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight">
            <span className="text-gradient">Autonomous</span>
            <br />
            <span className="text-foreground">Book Creation</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into complete, professionally structured books with AI-powered generation.
            From novels to technical guides—your vision, autonomously realized.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              variant="hero"
              size="xl"
              onClick={onCreateBook}
              className="group"
            >
              <BookOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
              Create New Book
            </Button>
            {bookCount > 0 && (
              <Button variant="outline" size="xl">
                View Your Library ({bookCount})
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto"
        >
          {[
            { label: "Book Types", value: "8+" },
            { label: "POV Options", value: "4" },
            { label: "Tone Profiles", value: "6" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-serif font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
