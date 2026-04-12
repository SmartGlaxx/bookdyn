import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Palette, Sliders, Settings2, Sparkles, Globe, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Book,
  BOOK_TYPE_INFO,
  POV_OPTIONS,
  TONE_OPTIONS,
  AUTOMATION_OPTIONS,
  DEPTH_OPTIONS,
  TEMPORAL_ERA_OPTIONS,
  TIMELINE_OPTIONS,
  SPATIAL_SCOPE_OPTIONS,
  AUDIENCE_OPTIONS,
} from "@/types/book";

interface BookSettingsProps {
  book: Book;
  onBack: () => void;
}

const BookSettings = ({ book, onBack }: BookSettingsProps) => {
  const typeInfo = BOOK_TYPE_INFO[book.bookType];
  const povOption = POV_OPTIONS.find((p) => p.value === book.pov);
  const primaryTone = TONE_OPTIONS.find((t) => t.value === book.toneProfile.primary);
  const secondaryTone = book.toneProfile.secondary 
    ? TONE_OPTIONS.find((t) => t.value === book.toneProfile.secondary) 
    : null;
  const automationOption = AUTOMATION_OPTIONS.find((a) => a.value === book.controls.automationLevel);
  const depthOption = DEPTH_OPTIONS.find((d) => d.value === book.controls.depthLevel);
  const eraOption = TEMPORAL_ERA_OPTIONS.find((e) => e.value === book.controls.temporalContext.era);
  const timelineOption = TIMELINE_OPTIONS.find((t) => t.value === book.controls.temporalContext.timelineStructure);
  const spatialOption = SPATIAL_SCOPE_OPTIONS.find((s) => s.value === book.controls.spatialScope);
  const audienceOption = AUDIENCE_OPTIONS.find((a) => a.value === book.audience);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container mx-auto px-4 py-4" style={{ maxWidth: "calc(100vw - 16rem)" }}>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-serif font-semibold">Book Settings</h1>
              <p className="text-sm text-muted-foreground">{book.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6" style={{ maxWidth: "calc(100vw - 16rem)" }}>
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Book Type Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Book Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-3xl">{typeInfo.icon}</span>
                  <div>
                    <p className="font-medium">{typeInfo.label}</p>
                    <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Category" value={typeInfo.category.replace("-", " ")} />
                  {book.genre && <InfoRow label="Genre" value={book.genre} />}
                </div>
              </CardContent>
            </Card>

            {/* Book Details Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Book Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Title</p>
                    <p className="font-serif text-lg font-medium">{book.title}</p>
                  </div>
                  {book.subtitle && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Subtitle</p>
                      <p className="text-muted-foreground">{book.subtitle}</p>
                    </div>
                  )}
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Theme / Prompt</p>
                    <p className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">{book.theme}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow 
                    label="Target Audience" 
                    value={audienceOption?.label || book.audience} 
                  />
                  <InfoRow 
                    label="Depth Level" 
                    value={depthOption?.label || book.controls.depthLevel} 
                  />
                  <InfoRow 
                    label="Automation" 
                    value={automationOption?.label || book.controls.automationLevel} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Voice & Tone Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Voice & Tone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Point of View</p>
                    <Badge variant="secondary" className="text-sm">
                      {povOption?.label || book.pov}
                    </Badge>
                    {povOption && (
                      <p className="text-xs text-muted-foreground mt-1">{povOption.description}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Primary Tone</p>
                    <Badge variant="amber" className="text-sm">
                      {primaryTone?.emoji} {primaryTone?.label || book.toneProfile.primary}
                    </Badge>
                    {primaryTone && (
                      <p className="text-xs text-muted-foreground mt-1">{primaryTone.description}</p>
                    )}
                  </div>
                </div>
                {secondaryTone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Secondary Tone</p>
                    <Badge variant="outline" className="text-sm">
                      {secondaryTone.emoji} {secondaryTone.label}
                    </Badge>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ToneSlider label="Intensity" value={book.toneProfile.intensity} />
                  <ToneSlider label="Formality" value={book.toneProfile.formality} />
                  <ToneSlider label="Emotional Depth" value={book.toneProfile.emotionalIntensity} />
                  <ToneSlider label="Humor Level" value={book.toneProfile.humorLevel} />
                  <ToneSlider label="Authority" value={book.toneProfile.authorityLevel} />
                </div>
              </CardContent>
            </Card>

            {/* Dynamism Controls Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Dynamism Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ControlSlider label="Velocity" value={book.controls.velocity} description="Narrative pace" />
                  <ControlSlider label="Scope" value={book.controls.scope} description="Detail depth" />
                  <ControlSlider label="Creativity" value={book.controls.creativity} description="Creative license" />
                  <ControlSlider label="Entity Complexity" value={book.controls.entityComplexity} description="Character depth" />
                  <ControlSlider label="Hook Frequency" value={book.controls.hookFrequency ?? 5} description="Scene change rate" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ControlSlider 
                    label="Perspective Multiplexing" 
                    value={book.controls.perspectiveMultiplexing} 
                    description="Parallel viewpoints" 
                  />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Divergence</p>
                    <Badge variant={book.controls.divergenceAllowed ? "success" : "secondary"}>
                      {book.controls.divergenceAllowed ? "Allowed" : "Not Allowed"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Temporal & Spatial Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Temporal & Spatial Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Era" value={eraOption?.label || book.controls.temporalContext.era} />
                  <InfoRow label="Timeline Structure" value={timelineOption?.label || book.controls.temporalContext.timelineStructure} />
                  {book.controls.temporalContext.specificPeriod && (
                    <InfoRow label="Specific Period" value={book.controls.temporalContext.specificPeriod} />
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Spatial Scope</p>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{spatialOption?.label || book.controls.spatialScope}</span>
                    </div>
                    {spatialOption && (
                      <p className="text-xs text-muted-foreground mt-1">{spatialOption.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Structure & Generation Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Structure & Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <InfoRow 
                    label="Chapter Count" 
                    value={book.controls.structureControls.chapterCount === "fixed" 
                      ? `Fixed (${book.controls.structureControls.targetChapters || "N/A"})` 
                      : "Flexible"} 
                  />
                  <InfoRow 
                    label="Subsection Count" 
                    value={book.controls.structureControls.subsectionCount === "fixed" 
                      ? `Fixed (${book.controls.structureControls.targetSubsections || "N/A"})` 
                      : "Flexible"} 
                  />
                  <InfoRow 
                    label="Titles Required" 
                    value={book.controls.structureControls.titlesRequired ? "Yes" : "No"} 
                  />
                  {book.controls.structureControls.targetWordCount && (
                    <InfoRow 
                      label="Target Word Count" 
                      value={book.controls.structureControls.targetWordCount.toLocaleString()} 
                    />
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-4">
                  <ToggleBadge label="Image Generation" enabled={book.controls.imageGeneration} />
                  <ToggleBadge label="Auto Resume" enabled={book.controls.autoResume} />
                  <ToggleBadge label="Divergence" enabled={book.controls.divergenceAllowed} />
                </div>
              </CardContent>
            </Card>

            {/* Additional Metadata */}
            {(book.tonalAnchors.length > 0 || book.entities.length > 0 || book.concepts.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Extracted Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {book.tonalAnchors.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Tonal Anchors</p>
                      <div className="flex flex-wrap gap-1">
                        {book.tonalAnchors.map((anchor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{anchor}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {book.entities.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Entities</p>
                      <div className="flex flex-wrap gap-1">
                        {book.entities.map((entity, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{entity}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {book.concepts.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Concepts</p>
                      <div className="flex flex-wrap gap-1">
                        {book.concepts.map((concept, i) => (
                          <Badge key={i} variant="default" className="text-xs">{concept}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </main>
    </motion.div>
  );
};

// Helper components
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium capitalize">{value}</p>
  </div>
);

const ToneSlider = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}/10</span>
    </div>
    <Progress value={value * 10} className="h-1.5" />
  </div>
);

const ControlSlider = ({ label, value, description }: { label: string; value: number; description: string }) => (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-primary">{value}</span>
      <span className="text-xs text-muted-foreground">/10</span>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
    <Progress value={value * 10} className="h-1 mt-1" />
  </div>
);

const ToggleBadge = ({ label, enabled }: { label: string; enabled: boolean }) => (
  <div className="text-center">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <Badge variant={enabled ? "success" : "secondary"} className="text-xs">
      {enabled ? "On" : "Off"}
    </Badge>
  </div>
);

export default BookSettings;
