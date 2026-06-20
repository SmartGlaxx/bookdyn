import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  StoryArcCard, CharacterArcCard, WorldElementCard, CanvasChapter,
  ChapterLink, InterChapterLink, LinkCategory,
} from "@/types/book";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftRight, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const CAT_STROKE: Record<LinkCategory, string> = {
  plot: "hsl(0 84% 60%)",        // red-500
  character: "hsl(217 91% 60%)", // blue-500
  world: "hsl(142 71% 45%)",     // emerald-500
};
const CAT_DOT_CLASS: Record<LinkCategory, string> = {
  plot: "bg-red-500",
  character: "bg-blue-500",
  world: "bg-emerald-500",
};
const CAT_RING_CLASS: Record<LinkCategory, string> = {
  plot: "ring-red-500/70 border-red-500/60",
  character: "ring-blue-500/70 border-blue-500/60",
  world: "ring-emerald-500/70 border-emerald-500/60",
};

interface ElementLite { id: string; name: string; category: LinkCategory }

interface Props {
  arc: StoryArcCard[];
  characters: CharacterArcCard[];
  worlds: WorldElementCard[];
  chapters: CanvasChapter[];
  links: ChapterLink[];
  interLinks: InterChapterLink[];
  onLinksChange: (next: ChapterLink[]) => void;
  onInterLinksChange: (next: InterChapterLink[]) => void;
}

export function ChapterMatrixSimulator(props: Props) {
  const { arc, characters, worlds, chapters, links, interLinks } = props;

  // Flatten elements
  const allElements = useMemo<ElementLite[]>(() => {
    const plot = arc.map((a, i) => ({
      id: a.id, category: "plot" as const,
      name: (a.text || `Beat ${i + 1}`).slice(0, 60),
    }));
    const chars = characters.map((c, i) => ({
      id: c.id, category: "character" as const,
      name: (c.name || `Character ${i + 1}`).slice(0, 60),
    }));
    const wrlds = worlds.map((w, i) => ({
      id: w.id, category: "world" as const,
      name: (w.label || `World ${i + 1}`).slice(0, 60),
    }));
    return [...plot, ...chars, ...wrlds];
  }, [arc, characters, worlds]);

  const findEl = useCallback(
    (id: string) => allElements.find((e) => e.id === id) ?? null,
    [allElements],
  );

  // Selection state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [interMode, setInterMode] = useState<{ fromChapterId: string } | null>(null);

  // Popup state
  type Popup =
    | { kind: "element-to-chapter"; chapterId: string; elementId: string; category: LinkCategory; x: number; y: number }
    | { kind: "inter-chapter"; fromChapterId: string; toChapterId: string; x: number; y: number }
    | { kind: "detail"; linkId: string; linkKind: "element" | "inter"; x: number; y: number };
  const [popup, setPopup] = useState<Popup | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Refs for measurement
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const elementNodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chapterNodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Tick to force re-render of SVG on scroll/resize
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useLayoutEffect(() => { bump(); }, [bump, links, interLinks, chapters.length, allElements.length]);

  useEffect(() => {
    const onResize = () => bump();
    window.addEventListener("resize", onResize);
    const m = matrixRef.current;
    m?.addEventListener("scroll", bump);
    const wrap = wrapRef.current;
    let ro: ResizeObserver | null = null;
    if (wrap && "ResizeObserver" in window) {
      ro = new ResizeObserver(bump);
      ro.observe(wrap);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      m?.removeEventListener("scroll", bump);
      ro?.disconnect();
    };
  }, [bump]);

  // Helpers
  const linksForChapter = useCallback(
    (chId: string) => links.filter((l) => l.chapterId === chId),
    [links],
  );

  // ---- click handlers ----
  const onClickElement = (el: ElementLite) => {
    setInterMode(null);
    setSelectedElementId((cur) => (cur === el.id ? null : el.id));
  };

  const onClickChapter = (chId: string, evt: React.MouseEvent) => {
    // inter-chapter mode: pick target
    if (interMode) {
      if (interMode.fromChapterId === chId) {
        setInterMode(null);
        return;
      }
      // cap: max 1 inter-link per chapter (either side)
      const exists = interLinks.some(
        (l) => l.fromChapterId === chId || l.toChapterId === chId,
      );
      const sourceHas = interLinks.some(
        (l) => l.fromChapterId === interMode.fromChapterId || l.toChapterId === interMode.fromChapterId,
      );
      if (sourceHas) {
        toast.error("Source chapter already has an inter-chapter link.");
        setInterMode(null);
        return;
      }
      if (exists) {
        toast.error("Target chapter already has an inter-chapter link.");
        setInterMode(null);
        return;
      }
      const wrapRect = wrapRef.current?.getBoundingClientRect();
      setNoteDraft("");
      setPopup({
        kind: "inter-chapter",
        fromChapterId: interMode.fromChapterId,
        toChapterId: chId,
        x: evt.clientX - (wrapRect?.left ?? 0),
        y: evt.clientY - (wrapRect?.top ?? 0),
      });
      setInterMode(null);
      return;
    }

    if (!selectedElementId) return;
    const el = findEl(selectedElementId);
    if (!el) return;
    const chLinks = linksForChapter(chId);
    if (chLinks.length >= 3) { toast.error("Chapter cap reached (max 3 links)."); return; }
    if (chLinks.some((l) => l.category === el.category)) { toast.error(`Only 1 ${el.category} link per chapter.`); return; }
    if (chLinks.some((l) => l.elementId === el.id)) { toast.error("That element is already linked here."); return; }

    const wrapRect = wrapRef.current?.getBoundingClientRect();
    setNoteDraft("");
    setPopup({
      kind: "element-to-chapter",
      chapterId: chId,
      elementId: el.id,
      category: el.category,
      x: evt.clientX - (wrapRect?.left ?? 0),
      y: evt.clientY - (wrapRect?.top ?? 0),
    });
  };

  const confirmPopup = () => {
    if (!popup) return;
    if (popup.kind === "element-to-chapter") {
      props.onLinksChange([
        ...links,
        {
          id: newId(),
          chapterId: popup.chapterId,
          elementId: popup.elementId,
          category: popup.category,
          note: noteDraft.trim(),
          curveOffset: { dx: 0, dy: 0 },
        },
      ]);
      setSelectedElementId(null);
    } else if (popup.kind === "inter-chapter") {
      // Must include @reference to an existing element
      const hasRef = /@([A-Za-z][\w ]*)/.test(noteDraft);
      if (!hasRef) { toast.error("Inter-chapter link requires an @reference to an existing element."); return; }
      props.onInterLinksChange([
        ...interLinks,
        {
          id: newId(),
          fromChapterId: popup.fromChapterId,
          toChapterId: popup.toChapterId,
          note: noteDraft.trim(),
          curveOffset: { dx: 0, dy: 0 },
        },
      ]);
    }
    setPopup(null);
    setNoteDraft("");
  };

  const deleteLink = (id: string, kind: "element" | "inter") => {
    if (kind === "element") props.onLinksChange(links.filter((l) => l.id !== id));
    else props.onInterLinksChange(interLinks.filter((l) => l.id !== id));
    setPopup(null);
  };

  // ---- @ dropdown inside textarea ----
  const [atQuery, setAtQuery] = useState<{ start: number; text: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const onNoteChange = (val: string) => {
    setNoteDraft(val);
    const ta = taRef.current;
    if (!ta) { setAtQuery(null); return; }
    const pos = ta.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const m = before.match(/@(\w*)$/);
    if (m) setAtQuery({ start: pos - m[0].length, text: m[1] });
    else setAtQuery(null);
  };

  const insertRef = (el: ElementLite) => {
    const ta = taRef.current;
    if (!ta || !atQuery) return;
    const before = noteDraft.slice(0, atQuery.start);
    const after = noteDraft.slice(ta.selectionStart ?? noteDraft.length);
    const tag = `@${el.name}`;
    const next = `${before}${tag} ${after}`;
    setNoteDraft(next);
    setAtQuery(null);
    requestAnimationFrame(() => {
      const pos = (before + tag + " ").length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const atMatches = useMemo(() => {
    if (!atQuery) return [];
    const q = atQuery.text.toLowerCase();
    return allElements.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [atQuery, allElements]);

  // ---- Render note with refs highlighted ----
  const renderNote = (note: string) => {
    if (!note) return <span className="text-muted-foreground italic">No note added.</span>;
    const parts: React.ReactNode[] = [];
    const re = /@([A-Za-z][\w ]*?)(?=\s|$|[.,!?;:])/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(note))) {
      if (m.index > last) parts.push(note.slice(last, m.index));
      const name = m[1].trim();
      const el = allElements.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (el) {
        parts.push(
          <span
            key={`r${key++}`}
            className={cn("inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold text-white", CAT_DOT_CLASS[el.category])}
          >@{el.name}</span>,
        );
      } else {
        parts.push(m[0]);
      }
      last = m.index + m[0].length;
    }
    if (last < note.length) parts.push(note.slice(last));
    return <>{parts}</>;
  };

  // ---- SVG line geometry ----
  type Line = { kind: "element" | "inter"; id: string; x1: number; y1: number; x2: number; y2: number; mx: number; my: number; stroke: string; note: string };
  const lines: Line[] = (() => {
    if (!wrapRef.current) return [];
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const out: Line[] = [];

    // Element→Chapter
    const byCh: Record<string, ChapterLink[]> = {};
    links.forEach((l) => { (byCh[l.chapterId] ||= []).push(l); });
    links.forEach((l) => {
      const elNode = elementNodeRefs.current.get(l.elementId);
      const chNode = chapterNodeRefs.current.get(l.chapterId);
      if (!elNode || !chNode) return;
      const er = elNode.getBoundingClientRect();
      const cr = chNode.getBoundingClientRect();
      const x1 = er.right - wrapRect.left;
      const y1 = er.top + er.height / 2 - wrapRect.top;
      const x2 = cr.left - wrapRect.left + 10;
      const y2 = cr.top + cr.height / 2 - wrapRect.top;
      const stack = byCh[l.chapterId];
      const idx = stack.indexOf(l);
      const stackOffset = (idx - (stack.length - 1) / 2) * 28;
      const mx = (x1 + x2) / 2 + (l.curveOffset?.dx ?? 0);
      const my = (y1 + y2) / 2 + (l.curveOffset?.dy ?? 0) + stackOffset;
      out.push({ kind: "element", id: l.id, x1, y1, x2, y2, mx, my, stroke: CAT_STROKE[l.category], note: l.note });
    });

    // Inter-chapter
    interLinks.forEach((l) => {
      const a = chapterNodeRefs.current.get(l.fromChapterId);
      const b = chapterNodeRefs.current.get(l.toChapterId);
      if (!a || !b) return;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.left + ar.width / 2 - wrapRect.left;
      const y1 = ar.top - wrapRect.top + 6;
      const x2 = br.left + br.width / 2 - wrapRect.left;
      const y2 = br.top - wrapRect.top + 6;
      const mx = (x1 + x2) / 2 + (l.curveOffset?.dx ?? 0);
      const my = Math.min(y1, y2) - 50 + (l.curveOffset?.dy ?? 0);
      out.push({ kind: "inter", id: l.id, x1, y1, x2, y2, mx, my, stroke: "hsl(0 0% 65%)", note: l.note });
    });

    return out;
    // re-run on tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })();
  // ref tick to satisfy lint without changing geometry result
  void tick;

  // ---- Drag handles ----
  const draggingRef = useRef<{ id: string; kind: "element" | "inter"; baseMx: number; baseMy: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const wrapRect = wrapRef.current?.getBoundingClientRect();
      if (!wrapRect) return;
      const x = e.clientX - wrapRect.left;
      const y = e.clientY - wrapRect.top;
      if (d.kind === "element") {
        props.onLinksChange(
          links.map((l) => l.id === d.id ? { ...l, curveOffset: { dx: x - d.baseMx, dy: y - d.baseMy } } : l),
        );
      } else {
        props.onInterLinksChange(
          interLinks.map((l) => l.id === d.id ? { ...l, curveOffset: { dx: x - d.baseMx, dy: y - d.baseMy } } : l),
        );
      }
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [links, interLinks, props]);

  // ---- Hint text ----
  const selectedEl = selectedElementId ? findEl(selectedElementId) : null;
  const hint = interMode
    ? "Inter-chapter link: click a target chapter."
    : selectedEl
      ? `Selected ${selectedEl.category}: ${selectedEl.name} — click a chapter to link.`
      : "Click a story element, then a chapter to draw a curved link. Use ↔ on a chapter to link to another chapter.";

  // ---- Panel groups ----
  const groups: { key: LinkCategory; label: string; items: ElementLite[] }[] = [
    { key: "plot", label: "Plot", items: allElements.filter((e) => e.category === "plot") },
    { key: "character", label: "Characters", items: allElements.filter((e) => e.category === "character") },
    { key: "world", label: "World", items: allElements.filter((e) => e.category === "world") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif font-semibold text-lg">Chapter Matrix</h3>
          <p className="text-sm text-muted-foreground max-w-3xl">{hint}</p>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {links.length} link{links.length === 1 ? "" : "s"} · {interLinks.length} inter-chapter
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative rounded-2xl border border-border bg-card/40 overflow-hidden"
        style={{ height: "min(70vh, 640px)" }}
      >
        <div className="flex h-full">
          {/* Left panel */}
          <aside className="w-64 shrink-0 border-r border-border bg-background/60 p-3 overflow-y-auto">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Story Elements</h4>
            {groups.map((g) => (
              <div key={g.key} className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("w-2 h-2 rounded-full", CAT_DOT_CLASS[g.key])} />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.label}</span>
                </div>
                {g.items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 italic px-1">None yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {g.items.map((el) => {
                      const selected = selectedElementId === el.id;
                      return (
                        <li key={el.id}>
                          <button
                            type="button"
                            ref={(node) => {
                              if (node) elementNodeRefs.current.set(el.id, node);
                              else elementNodeRefs.current.delete(el.id);
                            }}
                            onClick={() => onClickElement(el)}
                            className={cn(
                              "w-full text-left text-xs px-2 py-1.5 rounded-md border bg-card/60 hover:bg-card transition",
                              selected ? cn("ring-2", CAT_RING_CLASS[el.category]) : "border-border",
                            )}
                          >
                            <span className="line-clamp-2">{el.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </aside>

          {/* Matrix */}
          <div
            ref={matrixRef}
            className="relative flex-1 overflow-x-auto overflow-y-hidden p-6"
          >
            {chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-12">No chapters yet — add some first.</p>
            ) : (
              <div className="flex gap-5 h-full items-start pt-10 pb-4 min-w-max">
                {chapters.map((ch, i) => {
                  const chLinks = linksForChapter(ch.id);
                  const full = chLinks.length >= 3;
                  const isInterSource = interMode?.fromChapterId === ch.id;
                  return (
                    <div
                      key={ch.id}
                      ref={(node) => {
                        if (node) chapterNodeRefs.current.set(ch.id, node);
                        else chapterNodeRefs.current.delete(ch.id);
                      }}
                      onClick={(e) => onClickChapter(ch.id, e)}
                      className={cn(
                        "relative w-56 shrink-0 rounded-xl border bg-card/70 p-3 cursor-pointer transition",
                        "hover:border-amber-glow/60",
                        isInterSource ? "border-amber-glow ring-2 ring-amber-glow/40" : "border-border",
                        full && "opacity-95",
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ch {i + 1}</span>
                        <span className="text-[10px] text-muted-foreground">{chLinks.length}/3</span>
                      </div>
                      <div className="font-serif font-semibold text-sm leading-snug line-clamp-2">
                        {ch.title || `Chapter ${i + 1}`}
                      </div>

                      <ul className="mt-2 space-y-1">
                        {chLinks.map((l) => {
                          const el = findEl(l.elementId);
                          return (
                            <li
                              key={l.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const wrapRect = wrapRef.current?.getBoundingClientRect();
                                setPopup({
                                  kind: "detail",
                                  linkId: l.id,
                                  linkKind: "element",
                                  x: e.clientX - (wrapRect?.left ?? 0),
                                  y: e.clientY - (wrapRect?.top ?? 0),
                                });
                              }}
                              className="flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded bg-muted/40 hover:bg-muted/70"
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", CAT_DOT_CLASS[l.category])} />
                              <span className="truncate">{el?.name ?? "—"}</span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-3 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElementId(null);
                            setInterMode((cur) => cur?.fromChapterId === ch.id ? null : { fromChapterId: ch.id });
                          }}
                          className={cn(
                            "text-[10px] inline-flex items-center gap-1 px-1.5 py-1 rounded border",
                            isInterSource ? "border-amber-glow text-amber-glow" : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <ArrowLeftRight className="w-3 h-3" /> link chapter
                        </button>
                        {full && <span className="text-[9px] text-red-400 tracking-wider">FULL</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SVG overlay — sized to scroll container */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            >
              {lines.map((ln) => {
                const d = `M ${ln.x1} ${ln.y1} Q ${ln.mx} ${ln.my} ${ln.x2} ${ln.y2}`;
                return (
                  <g key={ln.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={ln.stroke}
                      strokeWidth={2.5}
                      strokeDasharray={ln.kind === "inter" ? "6 4" : undefined}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        const wrapRect = wrapRef.current?.getBoundingClientRect();
                        setPopup({
                          kind: "detail",
                          linkId: ln.id,
                          linkKind: ln.kind,
                          x: e.clientX - (wrapRect?.left ?? 0),
                          y: e.clientY - (wrapRect?.top ?? 0),
                        });
                      }}
                    >
                      <title>{ln.note || "(no note)"}</title>
                    </path>
                    <circle
                      cx={ln.mx}
                      cy={ln.my}
                      r={6}
                      fill="white"
                      stroke={ln.stroke}
                      strokeWidth={2}
                      className="pointer-events-auto cursor-grab"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        draggingRef.current = {
                          id: ln.id,
                          kind: ln.kind,
                          baseMx: (ln.x1 + ln.x2) / 2,
                          baseMy: ln.kind === "inter"
                            ? Math.min(ln.y1, ln.y2) - 50
                            : (ln.y1 + ln.y2) / 2,
                        };
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Popup */}
        {popup && (
          <Popover
            x={popup.x}
            y={popup.y}
            onClose={() => { setPopup(null); setNoteDraft(""); setAtQuery(null); }}
          >
            {popup.kind === "detail" ? (
              (() => {
                const link = popup.linkKind === "element"
                  ? links.find((l) => l.id === popup.linkId)
                  : interLinks.find((l) => l.id === popup.linkId);
                if (!link) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Link details</h4>
                      <button type="button" onClick={() => setPopup(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs leading-relaxed">{renderNote(link.note)}</div>
                    <div className="flex justify-end">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => deleteLink(popup.linkId, popup.linkKind)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {popup.kind === "inter-chapter" ? "New inter-chapter link" : "New link"}
                  </h4>
                  <button type="button" onClick={() => { setPopup(null); setNoteDraft(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Textarea
                  ref={taRef}
                  value={noteDraft}
                  onChange={(e) => onNoteChange(e.target.value)}
                  rows={3}
                  placeholder={popup.kind === "inter-chapter"
                    ? "Describe how one chapter influences the other. Type @ to reference."
                    : "Describe this link. Type @ to reference another element."}
                  className="text-xs"
                />
                {atMatches.length > 0 && (
                  <ul className="border border-border rounded-md bg-popover max-h-40 overflow-y-auto">
                    {atMatches.map((el) => (
                      <li key={el.id}>
                        <button
                          type="button"
                          onClick={() => insertRef(el)}
                          className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted flex items-center gap-2"
                        >
                          <span className={cn("w-2 h-2 rounded-full", CAT_DOT_CLASS[el.category])} />
                          <span className="truncate flex-1">{el.name}</span>
                          <span className="text-[10px] text-muted-foreground">{el.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="text-[10px] text-muted-foreground">
                  Tip: type <b>@</b> to reference plot, character, or world items.
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setPopup(null); setNoteDraft(""); }}>Cancel</Button>
                  <Button size="sm" variant="hero" onClick={confirmPopup}>Create link</Button>
                </div>
              </div>
            )}
          </Popover>
        )}
      </div>
    </div>
  );
}

function Popover({
  x, y, onClose, children,
}: { x: number; y: number; onClose: () => void; children: React.ReactNode }) {
  // Clamp inside wrapper roughly
  const left = Math.max(8, Math.min(x, 9999));
  const top = Math.max(8, y);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="absolute z-30 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}