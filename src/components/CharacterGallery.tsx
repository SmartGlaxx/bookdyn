import { motion } from "framer-motion";
import { User, Star, Users } from "lucide-react";
import { CharacterReference } from "@/types/book";
import { cn } from "@/lib/utils";

interface CharacterGalleryProps {
  characters: CharacterReference[];
  visualStyleGuide?: string;
  compact?: boolean;
}

export function CharacterGallery({ 
  characters, 
  visualStyleGuide,
  compact = false 
}: CharacterGalleryProps) {
  if (!characters || characters.length === 0) return null;

  const roleConfig = {
    protagonist: { icon: Star, label: "Main Character", color: "text-amber-500 bg-amber-500/10" },
    supporting: { icon: Users, label: "Supporting", color: "text-blue-500 bg-blue-500/10" },
    minor: { icon: User, label: "Minor", color: "text-muted-foreground bg-muted" },
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-2")}>
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-semibold text-lg">Character Reference Gallery</h3>
      </div>
      
      {visualStyleGuide && !compact && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          Art Style: {visualStyleGuide}
        </p>
      )}

      <div className={cn(
        "grid gap-4",
        compact ? "grid-cols-4 gap-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      )}>
        {characters.map((character, index) => {
          const role = roleConfig[character.role] || roleConfig.minor;
          const RoleIcon = role.icon;
          
          return (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative rounded-xl overflow-hidden border bg-card",
                "hover:shadow-lg transition-all duration-300",
                compact && "rounded-lg"
              )}
            >
              {/* Portrait Image */}
              <div className={cn(
                "aspect-square bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden",
                compact && "aspect-[3/4]"
              )}>
                {character.portraitUrl ? (
                  <img
                    src={character.portraitUrl}
                    alt={`${character.name} character portrait`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Character Info */}
              <div className={cn("p-3 space-y-1", compact && "p-2")}>
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "font-medium truncate",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {character.name}
                  </h4>
                  <div className={cn("rounded-full p-1", role.color)}>
                    <RoleIcon className={cn("w-3 h-3", compact && "w-2 h-2")} />
                  </div>
                </div>
                
                {!compact && (
                  <>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {character.description}
                    </p>
                    
                    {/* Hover overlay with full description */}
                    <div className="absolute inset-0 bg-card/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-center overflow-y-auto">
                      <h4 className="font-semibold text-sm mb-2">{character.name}</h4>
                      <div className={cn("text-xs px-2 py-0.5 rounded-full mb-2 w-fit", role.color)}>
                        {role.label}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {character.description}
                      </p>
                      <p className="text-xs text-foreground/70 italic">
                        Visual: {character.visualDescription}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
