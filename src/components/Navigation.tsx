// import { BookOpen, Sparkles, Plus, Flame, Zap, PenTool } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { useTurbo } from "@/hooks/useTurbo";
// import { AppSidebar } from "@/components/AppSidebar";

// interface NavigationProps {
//   onCreateBook: () => void;
// }

// const Navigation = ({ onCreateBook }: NavigationProps) => {
//   const turbo = useTurbo();

//   return (
//     <nav className="sticky top-0 z-50 glass border-b border-border" style={{ height: 64 }}>
//       <div className="container max-w-6xl mx-auto px-4 h-full flex items-center">
//         <div className="flex items-center justify-between w-full">
//           <a href="https://authoryti.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
//             <div
//               style={{
//                 padding: 8,
//                 borderRadius: 10,
//                 background: "hsla(35,92%,55%,0.12)",
//                 display: "flex",
//               }}
//             >
//               <BookOpen size={20} color="hsl(35,92%,55%)" strokeWidth={2} />
//             </div>
//             <h1
//               style={{
//                 fontFamily: "'Playfair Display', serif",
//                 fontWeight: 700,
//                 fontSize: 22,
//                 letterSpacing: "-0.02em",
//               }}
//             >
//               Authoryti
//             </h1>
//           </a>

//           <div className="flex items-center gap-3">
//             <TooltipProvider delayDuration={300}>
//               {/* Streak badge */}
//               {!turbo.isLoading && turbo.streakDays > 0 && (
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 cursor-help">
//                       <Flame className="w-3.5 h-3.5" />
//                       {turbo.streakDays}
//                     </div>
//                   </TooltipTrigger>
//                   <TooltipContent side="bottom" className="max-w-[220px] text-xs">
//                     Your writing streak — consecutive days you've been active. Keep it going!
//                   </TooltipContent>
//                 </Tooltip>
//               )}

//               {/* Words written badge */}
//               {!turbo.isLoading && turbo.totalWordsWritten > 0 && (
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary cursor-help">
//                       <PenTool className="w-3.5 h-3.5" />
//                       {(turbo.totalWordsWritten / 1000).toFixed(1)}K
//                     </div>
//                   </TooltipTrigger>
//                   <TooltipContent side="bottom" className="max-w-[220px] text-xs">
//                     Total words written across all your books.
//                   </TooltipContent>
//                 </Tooltip>
//               )}

//               {turbo.turboUnlocked && (
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 cursor-help">
//                       <Zap className="w-3.5 h-3.5" />
//                       Turbo
//                     </div>
//                   </TooltipTrigger>
//                   <TooltipContent side="bottom" className="max-w-[220px] text-xs">
//                     Turbo mode unlocked! Enjoy boosted word generation capacity.
//                   </TooltipContent>
//                 </Tooltip>
//               )}
//             </TooltipProvider>

//             <Button variant="hero" size="sm" onClick={onCreateBook} className="hidden sm:inline-flex">
//               <Sparkles className="w-4 h-4" />
//               New Book
//             </Button>
//             <Button variant="hero" size="icon" onClick={onCreateBook} className="sm:hidden">
//               <Plus className="w-5 h-5" />
//             </Button>

//             <AppSidebar />
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navigation;

import { BookOpen } from "lucide-react";
import Link from "next/link";

interface NavigationProps {
  onCreateBook: () => void;
}

const NAV_LINKS = [
  ["Features", "/features"],
  ["Pricing", "/pricing"],
  ["Blog", "/blog"],
  ["Docs", "/docs"],
  ["Join Waitlist", "https://app.authoryti.com/waitlist"],
];

const Navigation = ({ onCreateBook }: NavigationProps) => {
  return (
    <>
      <style>{`
        /* Force nav to stay on top - FIXED POSITION */
        .sl-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10000;
          border-bottom: 1px solid var(--brd);
          background: rgba(18, 22, 35, 0.95);
          backdrop-filter: blur(14px);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        /* Add padding to main content to account for fixed header */
        main {
          padding-top: 65px;
        }
        
        .sl-nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        
        .sl-nav-links { 
          display: flex; 
          gap: 32px; 
          align-items: center; 
        }
        
        .sl-nav-actions { 
          display: flex; 
          gap: 12px; 
          align-items: center; 
        }
        
        .sl-hamburger { 
          display: none; 
          background: none;
          border: none;
          cursor: pointer;
          color: var(--fg);
          padding: 8px;
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .sl-nav-links { 
            display: none !important; 
          }
          .sl-nav-actions { 
            display: none !important; 
          }
          .sl-hamburger { 
            display: flex !important; 
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      {/* ── NAVIGATION - FIXED AT TOP ── */}
      <nav className="sl-nav">
        <div className="sl-nav-container">
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                padding: 8,
                borderRadius: 10,
                background: "hsla(35,92%,55%,0.12)",
                display: "flex",
              }}
            >
              <BookOpen size={20} color="var(--primary)" />
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.02em",
              }}
            >
              Authoryti
            </h1>
          </Link>

          {/* Desktop navigation links */}
          <div className="sl-nav-links">
            {NAV_LINKS.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{
                  fontSize: 14,
                  color: label === "Join Waitlist" ? "var(--primary)" : "var(--muted)",
                  fontWeight: label === "Join Waitlist" ? 700 : 500,
                  transition: "color 0.15s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = label === "Join Waitlist" ? "hsl(35,92%,70%)" : "var(--fg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = label === "Join Waitlist" ? "var(--primary)" : "var(--muted)")
                }
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA button */}
          <div className="sl-nav-actions">
            <button
              onClick={onCreateBook}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 22px",
                borderRadius: 999,
                background: "linear-gradient(135deg, hsl(35,92%,48%) 0%, hsl(25,95%,55%) 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 4px 20px hsla(35,92%,55%,0.3)",
                textDecoration: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Start Writing
            </button>
          </div>

          {/* Hamburger button */}
          <button className="sl-hamburger" aria-label="Toggle menu">
            <span>☰</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
