import { motion, AnimatePresence } from "framer-motion";
import { User, Star, Users, ChevronDown, ChevronUp } from "lucide-react";
import { CharacterReference } from "@/types/book";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CharacterGalleryProps {
  characters: CharacterReference[];
  visualStyleGuide?: string;
  compact?: boolean;
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h5 className="text-xs font-semibold text-primary uppercase tracking-wider">{title}</h5>
      <div className="text-xs text-muted-foreground space-y-0.5">{children}</div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <p>
      <span className="font-medium text-foreground/70">{label}:</span>{" "}
      {Array.isArray(value) ? value.join(", ") : value}
    </p>
  );
}

function CharacterCard({ character, index, compact }: { character: CharacterReference; index: number; compact: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const roleConfig = {
    protagonist: { icon: Star, label: "Protagonist", color: "text-amber-500 bg-amber-500/10" },
    supporting: { icon: Users, label: "Supporting", color: "text-blue-500 bg-blue-500/10" },
    minor: { icon: User, label: "Minor", color: "text-muted-foreground bg-muted" },
    background: { icon: User, label: "Background", color: "text-muted-foreground/60 bg-muted/50" },
  };

  const role = roleConfig[character.role] || roleConfig.minor;
  const RoleIcon = role.icon;
  const { identity, appearance, hair, fashion, voice, personality, backstory, storyRole } = character;

  const hasDetails = identity || appearance || hair || fashion || voice || personality || backstory || storyRole;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl overflow-hidden border bg-card",
        "hover:shadow-lg transition-all duration-300",
        compact && "rounded-lg"
      )}
    >
      {/* Header with portrait */}
      <div className="flex items-start gap-3 p-3">
        <div className={cn(
          "shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10",
          compact ? "w-10 h-10" : "w-16 h-16"
        )}>
          {character.portraitUrl ? (
            <img
              src={character.portraitUrl}
              alt={`${character.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={cn("text-muted-foreground/30", compact ? "w-5 h-5" : "w-8 h-8")} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{character.name}</h4>
            <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", role.color)}>
              {role.label}
            </div>
          </div>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{character.description}</p>
          )}
        </div>
      </div>

      {/* Expand/collapse for full profile */}
      {!compact && hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground border-t transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Collapse" : "Full Profile"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 pt-0 space-y-3 border-t">
                  {identity && (
                    <ProfileSection title="Identity">
                      <ProfileField label="Full Name" value={identity.fullName} />
                      <ProfileField label="Aliases" value={identity.aliases} />
                      <ProfileField label="Age" value={identity.age} />
                      <ProfileField label="Gender" value={identity.gender} />
                      <ProfileField label="Pronouns" value={identity.pronouns} />
                      <ProfileField label="Nationality" value={identity.nationality} />
                      <ProfileField label="Ethnicity" value={identity.ethnicity} />
                      <ProfileField label="Cultural Background" value={identity.culturalBackground} />
                      <ProfileField label="Language" value={identity.nativeLanguage} />
                      <ProfileField label="Accent" value={identity.accent} />
                    </ProfileSection>
                  )}

                  {appearance && (
                    <ProfileSection title="Physical Appearance">
                      <ProfileField label="Height & Build" value={[appearance.height, appearance.build].filter(Boolean).join(", ")} />
                      <ProfileField label="Skin Tone" value={appearance.skinTone} />
                      <ProfileField label="Face" value={appearance.faceShape} />
                      <ProfileField label="Eyes" value={[appearance.eyeColor, appearance.eyeShape, appearance.eyeDistinguishing].filter(Boolean).join(", ")} />
                      <ProfileField label="Nose" value={appearance.noseShape} />
                      <ProfileField label="Lips" value={appearance.lipShape} />
                      <ProfileField label="Jawline" value={appearance.jawline} />
                      <ProfileField label="Scars" value={appearance.scars} />
                      <ProfileField label="Tattoos" value={appearance.tattoos} />
                      <ProfileField label="Marks" value={appearance.distinctiveMarks} />
                      <ProfileField label="Hands" value={appearance.hands} />
                    </ProfileSection>
                  )}

                  {hair && (
                    <ProfileSection title="Hair">
                      <ProfileField label="Color" value={hair.color} />
                      <ProfileField label="Texture" value={hair.texture} />
                      <ProfileField label="Style" value={hair.lengthAndStyle} />
                      <ProfileField label="Casual" value={hair.casualStyle} />
                      <ProfileField label="Formal" value={hair.formalStyle} />
                      <ProfileField label="Changes" value={hair.changesAcrossStory} />
                    </ProfileSection>
                  )}

                  {fashion && (
                    <ProfileSection title="Fashion & Style">
                      <ProfileField label="Casual" value={fashion.casualStyle} />
                      <ProfileField label="Work" value={fashion.workAttire} />
                      <ProfileField label="Formal" value={fashion.formalWear} />
                      <ProfileField label="Signature Item" value={fashion.signatureItem} />
                      <ProfileField label="Shoes" value={fashion.shoePreference} />
                      <ProfileField label="Reflects" value={fashion.styleReflection} />
                      <ProfileField label="Evolution" value={fashion.styleEvolution} />
                    </ProfileSection>
                  )}

                  {voice && (
                    <ProfileSection title="Voice & Mannerisms">
                      <ProfileField label="Tone" value={voice.toneOfVoice} />
                      <ProfileField label="Speech" value={voice.speechPatterns} />
                      <ProfileField label="Accent" value={voice.accentStrength} />
                      <ProfileField label="Habits" value={voice.nervousHabits} />
                      <ProfileField label="Posture" value={voice.posture} />
                      <ProfileField label="Default Expression" value={voice.defaultExpressions} />
                      <ProfileField label="Laugh" value={voice.laughStyle} />
                      <ProfileField label="Anger" value={voice.angerStyle} />
                      <ProfileField label="Fear" value={voice.fearStyle} />
                    </ProfileSection>
                  )}

                  {personality && (
                    <ProfileSection title="Personality">
                      <ProfileField label="Core Type" value={personality.coreType} />
                      <ProfileField label="Strengths" value={personality.strengths} />
                      <ProfileField label="Flaws" value={personality.flaws} />
                      <ProfileField label="Fears" value={personality.fears} />
                      <ProfileField label="Desires" value={personality.desires} />
                      <ProfileField label="Public Persona" value={personality.publicPersona} />
                      <ProfileField label="Private Reality" value={personality.privateReality} />
                      <ProfileField label="With Strangers" value={personality.treatmentOfStrangers} />
                      <ProfileField label="With Loved Ones" value={personality.treatmentOfLovedOnes} />
                    </ProfileSection>
                  )}

                  {backstory && (
                    <ProfileSection title="Backstory">
                      <ProfileField label="Upbringing" value={backstory.upbringing} />
                      <ProfileField label="Formative Events" value={backstory.formativeEvents} />
                      <ProfileField label="Key Relationships" value={backstory.definingRelationships} />
                      <ProfileField label="What They Lost" value={backstory.whatTheyLost} />
                      <ProfileField label="What They Seek" value={backstory.whatTheySeek} />
                    </ProfileSection>
                  )}

                  {storyRole && (
                    <ProfileSection title="Role in Story">
                      <ProfileField label="Archetype" value={storyRole.archetype} />
                      <ProfileField label="Relation to MC" value={storyRole.relationshipToMainCharacter} />
                      <ProfileField label="Goal" value={storyRole.goal} />
                      <ProfileField label="Obstacle" value={storyRole.obstacle} />
                      <ProfileField label="Arc" value={storyRole.arc} />
                    </ProfileSection>
                  )}

                  {character.visualDescription && (
                    <ProfileSection title="Visual Reference">
                      <p className="italic">{character.visualDescription}</p>
                    </ProfileSection>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export function CharacterGallery({ 
  characters, 
  visualStyleGuide,
  compact = false 
}: CharacterGalleryProps) {
  if (!characters || characters.length === 0) return null;

  // Group by role
  const grouped = {
    protagonist: characters.filter(c => c.role === "protagonist"),
    supporting: characters.filter(c => c.role === "supporting"),
    minor: characters.filter(c => c.role === "minor"),
    background: characters.filter(c => c.role === "background"),
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-2")}>
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-semibold text-lg">Character Index</h3>
        <span className="text-xs text-muted-foreground">({characters.length} characters)</span>
      </div>
      
      {visualStyleGuide && !compact && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          Art Style: {visualStyleGuide}
        </p>
      )}

      {Object.entries(grouped).map(([role, chars]) => {
        if (chars.length === 0) return null;
        const labels: Record<string, string> = {
          protagonist: "Protagonists",
          supporting: "Supporting Cast",
          minor: "Minor Characters",
          background: "Background Characters",
        };
        return (
          <div key={role} className="space-y-2">
            {!compact && (
              <h4 className="text-sm font-medium text-muted-foreground">{labels[role]} ({chars.length})</h4>
            )}
            <div className={cn(
              "grid gap-3",
              compact ? "grid-cols-4 gap-2" : "grid-cols-1 md:grid-cols-2"
            )}>
              {chars.map((character, index) => (
                <CharacterCard key={character.id} character={character} index={index} compact={compact} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
