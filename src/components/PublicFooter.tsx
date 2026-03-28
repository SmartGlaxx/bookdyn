import { BookOpen } from "lucide-react";

const PublicFooter = () => (
  <footer className="border-t border-border py-12 bg-card/30">
    <div className="container max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif font-bold text-lg">Authoryti</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Authoryti. AI-powered book creation.
        </p>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
