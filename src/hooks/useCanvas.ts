import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  StoryCanvas, CanvasSetup, StorySummaryBullet, StoryArcCard,
  CanvasChapter, CanvasScene, StoryArcColor, EMPTY_CANVAS,
} from "@/types/book";

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function ensureShape(c?: StoryCanvas | null): StoryCanvas {
  if (!c) return { ...EMPTY_CANVAS };
  return {
    setup: c.setup ?? {},
    storySummary: Array.isArray(c.storySummary) ? c.storySummary : [],
    storyArc: Array.isArray(c.storyArc) ? c.storyArc : [],
    chapters: Array.isArray(c.chapters) ? c.chapters : [],
    aiAssistUsed: typeof c.aiAssistUsed === "number" ? c.aiAssistUsed : 0,
    updatedAt: c.updatedAt,
  };
}

export function useCanvas(bookId: string, initial?: StoryCanvas | null) {
  const [canvas, setCanvas] = useState<StoryCanvas>(() => ensureShape(initial));
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>(JSON.stringify(ensureShape(initial)));

  // Sync if `initial` changes (e.g. parent refetch)
  useEffect(() => {
    const shaped = ensureShape(initial);
    const s = JSON.stringify(shaped);
    if (s !== lastSaved.current) {
      setCanvas(shaped);
      lastSaved.current = s;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.updatedAt]);

  const persist = useCallback((next: StoryCanvas) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = { ...next, updatedAt: new Date().toISOString() };
      const s = JSON.stringify(payload);
      if (s === lastSaved.current) return;
      setSaving(true);
      const { error } = await supabase
        .from("books")
        .update({ canvas: payload as unknown as never })
        .eq("id", bookId);
      setSaving(false);
      if (!error) lastSaved.current = s;
    }, 500);
  }, [bookId]);

  const update = useCallback((fn: (c: StoryCanvas) => StoryCanvas) => {
    setCanvas((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  // ---- mutation helpers ----
  const setSetup = (patch: Partial<CanvasSetup>) =>
    update((c) => ({ ...c, setup: { ...c.setup, ...patch } }));

  const setSummary = (next: StorySummaryBullet[]) =>
    update((c) => ({ ...c, storySummary: next }));

  const addSummaryBullet = (text = "") =>
    update((c) => ({ ...c, storySummary: [...c.storySummary, { id: newId(), text }] }));

  const updateSummaryBullet = (id: string, text: string) =>
    update((c) => ({
      ...c,
      storySummary: c.storySummary.map((b) => (b.id === id ? { ...b, text } : b)),
    }));

  const removeSummaryBullet = (id: string) =>
    update((c) => ({ ...c, storySummary: c.storySummary.filter((b) => b.id !== id) }));

  const setArc = (next: StoryArcCard[]) => update((c) => ({ ...c, storyArc: next }));

  const addArcCard = (text = "New beat", color: StoryArcColor = "neutral") =>
    update((c) => ({ ...c, storyArc: [...c.storyArc, { id: newId(), text, color }] }));

  const updateArcCard = (id: string, patch: Partial<StoryArcCard>) =>
    update((c) => ({
      ...c,
      storyArc: c.storyArc.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const removeArcCard = (id: string) =>
    update((c) => ({ ...c, storyArc: c.storyArc.filter((s) => s.id !== id) }));

  const seedChaptersFromArc = () =>
    update((c) => {
      if (c.chapters.length > 0) return c;
      const chapters: CanvasChapter[] = c.storyArc.map((a, i) => ({
        id: newId(),
        title: a.text || `Chapter ${i + 1}`,
        plot: "",
        scenes: [],
      }));
      return { ...c, chapters };
    });

  const setChapters = (next: CanvasChapter[]) =>
    update((c) => ({ ...c, chapters: next }));

  const addChapter = () =>
    update((c) => ({
      ...c,
      chapters: [
        ...c.chapters,
        { id: newId(), title: `Chapter ${c.chapters.length + 1}`, plot: "", scenes: [] },
      ],
    }));

  const updateChapter = (id: string, patch: Partial<CanvasChapter>) =>
    update((c) => ({
      ...c,
      chapters: c.chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    }));

  const removeChapter = (id: string) =>
    update((c) => ({ ...c, chapters: c.chapters.filter((ch) => ch.id !== id) }));

  const setScenes = (chapterId: string, scenes: CanvasScene[]) =>
    updateChapter(chapterId, { scenes });

  const addScene = (chapterId: string, title = "New scene") =>
    update((c) => ({
      ...c,
      chapters: c.chapters.map((ch) =>
        ch.id === chapterId
          ? { ...ch, scenes: [...ch.scenes, { id: newId(), title }] }
          : ch
      ),
    }));

  const updateScene = (chapterId: string, sceneId: string, patch: Partial<CanvasScene>) =>
    update((c) => ({
      ...c,
      chapters: c.chapters.map((ch) =>
        ch.id !== chapterId
          ? ch
          : { ...ch, scenes: ch.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) }
      ),
    }));

  const removeScene = (chapterId: string, sceneId: string) =>
    update((c) => ({
      ...c,
      chapters: c.chapters.map((ch) =>
        ch.id !== chapterId ? ch : { ...ch, scenes: ch.scenes.filter((s) => s.id !== sceneId) }
      ),
    }));

  const incrementAiAssist = () =>
    update((c) => ({ ...c, aiAssistUsed: Math.min(3, (c.aiAssistUsed ?? 0) + 1) }));

  const api = useMemo(() => ({
    canvas, saving,
    setSetup,
    setSummary, addSummaryBullet, updateSummaryBullet, removeSummaryBullet,
    setArc, addArcCard, updateArcCard, removeArcCard,
    seedChaptersFromArc, setChapters, addChapter, updateChapter, removeChapter,
    setScenes, addScene, updateScene, removeScene,
    incrementAiAssist,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [canvas, saving]);

  return api;
}

export const ARC_COLOR_CLASS: Record<StoryArcColor, string> = {
  setup: "bg-sky-500/15 border-sky-500/40 text-sky-200",
  rising: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  midpoint: "bg-violet-500/15 border-violet-500/40 text-violet-200",
  climax: "bg-rose-500/15 border-rose-500/40 text-rose-200",
  fall: "bg-amber-500/15 border-amber-500/40 text-amber-200",
  resolution: "bg-teal-500/15 border-teal-500/40 text-teal-200",
  neutral: "bg-muted/40 border-border text-foreground",
};

export const ARC_COLORS: { value: StoryArcColor; label: string }[] = [
  { value: "setup", label: "Setup" },
  { value: "rising", label: "Rising" },
  { value: "midpoint", label: "Midpoint" },
  { value: "climax", label: "Climax" },
  { value: "fall", label: "Fall" },
  { value: "resolution", label: "Resolution" },
  { value: "neutral", label: "Neutral" },
];