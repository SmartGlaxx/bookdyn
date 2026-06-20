import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CharacterArcCard, WorldElementCard, CanvasChapter,
  ChapterLink, InterChapterLink, LinkCategory,
} from "@/types/book";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2, X, Plus, Minus, BookOpen, Link2, GitBranch, MousePointer2,
  Maximize2, Minimize2, GripVertical, ArrowRightLeft, AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const COLORS: Record<LinkCategory, string> = {
  plot: "#ef4444",
  character: "#3b82f6",
  world: "#22c55e",
};
const DOT_CLASS: Record<LinkCategory, string> = {
  plot: "bg-[#ef4444]",
  character: "bg-[#3b82f6]",
  world: "bg-[#22c55e]",
};
const INTER_COLOR = "#9aa3b2"; // grey for inter-chapter links

const CANVAS_W = 3200;
const CANVAS_H = 1800;
const CARD_W = 220;
const CARD_H = 300;

interface ElementLite { id: string; name: string; category: LinkCategory }

interface Props {
  bullets: { id: string; text: string }[];
  characters: CharacterArcCard[];
  worlds: WorldElementCard[];
  chapters: CanvasChapter[];
  onChaptersChange: (next: CanvasChapter[]) => void;
  links: ChapterLink[];
  onLinksChange: (next: ChapterLink[]) => void;
  interLinks?: InterChapterLink[];
  onInterLinksChange?: (next: InterChapterLink[]) => void;
}

export function ChapterMatrixSimulator(props: Props) {
  const {
    bullets, characters, worlds, chapters, links,
    interLinks = [], onInterLinksChange = () => {},
  } = props;

  // ---- Zoom ----
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  // ---- Fullscreen ----
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // ---- Initial positions (auto-grid when missing) ----
  useEffect(() => {
    const needs = chapters.some((c) => !c.position);
    if (!needs) return;
    const PER_ROW = 5;
    const GAP_X = 260;
    const GAP_Y = 340;
    const OX = 40;
    const OY = 60;
    const next = chapters.map((c, i) =>
      c.position
        ? c
        : { ...c, position: { x: OX + (i % PER_ROW) * GAP_X, y: OY + Math.floor(i / PER_ROW) * GAP_Y } },
    );
    props.onChaptersChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters.length]);

  const nextPosition = useCallback((): { x: number; y: number } => {
    const PER_ROW = 5;
    const i = chapters.length;
    return { x: 40 + (i % PER_ROW) * 260, y: 60 + Math.floor(i / PER_ROW) * 340 };
  }, [chapters.length]);

  const addChapter = () => {
    const id = newId();
    props.onChaptersChange([
      ...chapters,
      { id, title: `Chapter ${chapters.length + 1}`, plot: "", scenes: [], position: nextPosition() },
    ]);
  };
  const removeChapter = (id: string) => {
    props.onChaptersChange(chapters.filter((c) => c.id !== id));
    props.onLinksChange(links.filter((l) => l.chapterId !== id));
    onInterLinksChange(interLinks.filter((l) => l.fromChapterId !== id && l.toChapterId !== id));
  };

  // ---- Element groups ----
  const groups = useMemo(() => {
    const plotEls: ElementLite[] = bullets
      .filter((b) => b.text.trim())
      .map((b, i) => ({ id: b.id, name: short(b.text, 36) || `Plot ${i + 1}`, category: "plot" }));
    const charEls: ElementLite[] = characters
      .filter((c) => c.name.trim())
      .map((c) => ({ id: c.id, name: c.name.trim(), category: "character" }));
    const worldEls: ElementLite[] = worlds
      .filter((w) => w.label.trim())
      .map((w) => ({ id: w.id, name: w.label.trim(), category: "world" }));
    return { plot: plotEls, character: charEls, world: worldEls };
  }, [bullets, characters, worlds]);

  const allElements = useMemo<ElementLite[]>(
    () => [...groups.plot, ...groups.character, ...groups.world],
    [groups],
  );
  const findElement = useCallback(
    (id: string) => allElements.find((e) => e.id === id) ?? null,
    [allElements],
  );

  // ---- Refs ----
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const elNodes = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const chNodes = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // ---- Selection / link state ----
  const [selected, setSelected] = useState<{ id: string; category: LinkCategory } | null>(null);
  const [linkSource, setLinkSource] = useState<string | null>(null); // chapter → chapter link source
  const [hintError, setHintError] = useState<string | null>(null);
  const [popup, setPopup] = useState<
    | { kind: "element"; chapterId: string; el: ElementLite; x: number; y: number; note: string }
    | { kind: "inter"; fromChapterId: string; toChapterId: string; x: number; y: number; note: string }
    | null
  >(null);
  const [detail, setDetail] = useState<
    | { kind: "link"; id: string }
    | { kind: "inter"; id: string }
    | null
  >(null);
  const [tick, forceTick] = useState(0);
  const redraw = useCallback(() => forceTick((n) => n + 1), []);

  // Which category is visible in the sidebar (dropdown switches them)
  const [activeCat, setActiveCat] = useState<LinkCategory>("plot");

  useLayoutEffect(() => { redraw(); }, [chapters, links, interLinks, allElements, zoom, fullscreen, redraw]);
  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    const m = scrollRef.current;
    m?.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      m?.removeEventListener("scroll", onResize);
    };
  }, [redraw]);

  // ---- Card drag (free 2D) ----
  const cardDragRef = useRef<{ id: string; offX: number; offY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressNextClick = useRef(false);
  const beginCardDrag = (chId: string, ev: React.MouseEvent) => {
    // Ignore drags that begin on interactive controls
    const t = ev.target as HTMLElement;
    if (t.closest("input,textarea,button,[data-no-drag]")) return;
    const ch = chapters.find((c) => c.id === chId);
    if (!ch?.position || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const px = (ev.clientX - canvasRect.left) / zoom;
    const py = (ev.clientY - canvasRect.top) / zoom;
    cardDragRef.current = {
      id: chId,
      offX: px - ch.position.x,
      offY: py - ch.position.y,
      startX: ev.clientX,
      startY: ev.clientY,
      moved: false,
    };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = cardDragRef.current;
      if (!d || !canvasRef.current) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
      d.moved = true;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const px = (e.clientX - canvasRect.left) / zoom;
      const py = (e.clientY - canvasRect.top) / zoom;
      const nx = Math.max(0, Math.min(CANVAS_W - CARD_W, px - d.offX));
      const ny = Math.max(0, Math.min(CANVAS_H - CARD_H, py - d.offY));
      const next = chapters.map((c) =>
        c.id === d.id ? { ...c, position: { x: nx, y: ny } } : c,
      );
      props.onChaptersChange(next);
    };
    const onUp = () => {
      if (cardDragRef.current?.moved) suppressNextClick.current = true;
      cardDragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [chapters, zoom, props]);

  // ---- Curve handle drag (works for both link kinds) ----
  const curveDragRef = useRef<
    | { kind: "link"; id: string; baseMx: number; baseMy: number }
    | { kind: "inter"; id: string; baseMx: number; baseMy: number }
    | null
  >(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = curveDragRef.current;
      const wrap = matrixRef.current;
      if (!d || !wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const x = e.clientX - wrapRect.left;
      const y = e.clientY - wrapRect.top;
      if (d.kind === "link") {
        props.onLinksChange(
          props.links.map((l) =>
            l.id === d.id ? { ...l, curveOffset: { dx: x - d.baseMx, dy: y - d.baseMy } } : l,
          ),
        );
      } else {
        onInterLinksChange(
          interLinks.map((l) =>
            l.id === d.id ? { ...l, curveOffset: { dx: x - d.baseMx, dy: y - d.baseMy } } : l,
          ),
        );
      }
    };
    const onUp = () => { curveDragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [props, interLinks, onInterLinksChange]);

  // ---- Compute paths ----
  const linePaths = useMemo(() => {
    const wrap = matrixRef.current;
    if (!wrap) return [] as Array<{
      d: string; color: string; mx: number; my: number; baseMx: number; baseMy: number; link: ChapterLink;
    }>;
    const wrapRect = wrap.getBoundingClientRect();
    const byCh: Record<string, ChapterLink[]> = {};
    links.forEach((l) => { (byCh[l.chapterId] = byCh[l.chapterId] || []).push(l); });
    const out: Array<{ d: string; color: string; mx: number; my: number; baseMx: number; baseMy: number; link: ChapterLink }> = [];
    links.forEach((link) => {
      const elNode = elNodes.current.get(link.elementId);
      const chNode = chNodes.current.get(link.chapterId);
      if (!elNode || !chNode) return;
      const er = elNode.getBoundingClientRect();
      const cr = chNode.getBoundingClientRect();
      const x1 = er.right - wrapRect.left;
      const y1 = er.top + er.height / 2 - wrapRect.top;
      const x2 = cr.left - wrapRect.left + 10;
      const y2 = cr.top + cr.height / 2 - wrapRect.top;
      const stack = byCh[link.chapterId] || [];
      const idx = stack.indexOf(link);
      const stackOffset = (idx - (stack.length - 1) / 2) * 30;
      const baseMx = (x1 + x2) / 2;
      const baseMy = (y1 + y2) / 2 + stackOffset;
      const mx = baseMx + (link.curveOffset?.dx ?? 0);
      const my = baseMy + (link.curveOffset?.dy ?? 0);
      out.push({
        d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,
        color: COLORS[link.category],
        mx, my, baseMx, baseMy, link,
      });
    });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, chapters, allElements, popup, detail, zoom, tick, fullscreen]);

  const interPaths = useMemo(() => {
    const wrap = matrixRef.current;
    if (!wrap) return [] as Array<{
      d: string; mx: number; my: number; baseMx: number; baseMy: number; link: InterChapterLink;
    }>;
    const wrapRect = wrap.getBoundingClientRect();
    const out: Array<{ d: string; mx: number; my: number; baseMx: number; baseMy: number; link: InterChapterLink }> = [];
    interLinks.forEach((link, idx) => {
      const a = chNodes.current.get(link.fromChapterId);
      const b = chNodes.current.get(link.toChapterId);
      if (!a || !b) return;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.left + ar.width / 2 - wrapRect.left;
      const y1 = ar.top - wrapRect.top; // top of source
      const x2 = br.left + br.width / 2 - wrapRect.left;
      const y2 = br.top - wrapRect.top; // top of target
      const baseMx = (x1 + x2) / 2;
      // auto-arc upward; offset to avoid overlap
      const arcLift = 60 + (idx % 4) * 16;
      const baseMy = Math.min(y1, y2) - arcLift;
      const mx = baseMx + (link.curveOffset?.dx ?? 0);
      const my = baseMy + (link.curveOffset?.dy ?? 0);
      out.push({
        d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,
        mx, my, baseMx, baseMy, link,
      });
    });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interLinks, chapters, popup, detail, zoom, tick, fullscreen]);

  // ---- Actions ----
  const flashError = (msg: string) => {
    setHintError(msg);
    window.setTimeout(() => setHintError(null), 1800);
  };

  const selectElement = (el: ElementLite) => {
    setLinkSource(null);
    setSelected((s) => (s && s.id === el.id ? null : { id: el.id, category: el.category }));
  };

  const onChapterClick = (chId: string, e: React.MouseEvent) => {
    if (suppressNextClick.current) { suppressNextClick.current = false; return; }
    // Inter-chapter linking mode takes priority
    if (linkSource) {
      if (linkSource === chId) { setLinkSource(null); return; }
      const fromCh = chapters.find((c) => c.id === linkSource);
      if (!fromCh) { setLinkSource(null); return; }
      const existing = interLinks.filter((l) => l.fromChapterId === linkSource);
      if (existing.length >= 1) {
        flashError("Max 1 inter-chapter link per chapter.");
        setLinkSource(null);
        return;
      }
      if (interLinks.some((l) => l.fromChapterId === linkSource && l.toChapterId === chId)) {
        flashError("These chapters are already linked.");
        return;
      }
      setPopup({
        kind: "inter",
        fromChapterId: linkSource,
        toChapterId: chId,
        x: Math.min(window.innerWidth - 320, e.clientX),
        y: Math.min(window.innerHeight - 240, e.clientY),
        note: "",
      });
      setLinkSource(null);
      return;
    }
    if (!selected) return;
    const el = findElement(selected.id);
    if (!el) return;
    const chLinks = links.filter((l) => l.chapterId === chId);
    if (chLinks.length >= 3) return flashError("Chapter cap reached (max 3 element links per chapter).");
    if (chLinks.some((l) => l.category === selected.category)) return flashError(`Only 1 ${selected.category} link per chapter.`);
    if (chLinks.some((l) => l.elementId === selected.id)) return flashError("That element is already linked here.");
    setPopup({
      kind: "element",
      chapterId: chId,
      el,
      x: Math.min(window.innerWidth - 320, e.clientX),
      y: Math.min(window.innerHeight - 240, e.clientY),
      note: "",
    });
  };

  const confirmLink = () => {
    if (!popup) return;
    if (popup.kind === "element") {
      const link: ChapterLink = {
        id: "L" + newId(),
        chapterId: popup.chapterId,
        elementId: popup.el.id,
        category: popup.el.category,
        note: popup.note.trim(),
        curveOffset: { dx: 0, dy: 0 },
      };
      props.onLinksChange([...links, link]);
      setSelected(null);
    } else {
      // Validate: must include at least one @ reference
      if (!/@\w/.test(popup.note)) {
        flashError("Inter-chapter links require an @ reference to an existing element.");
        return;
      }
      const link: InterChapterLink = {
        id: "IC" + newId(),
        fromChapterId: popup.fromChapterId,
        toChapterId: popup.toChapterId,
        note: popup.note.trim(),
        curveOffset: { dx: 0, dy: 0 },
      };
      onInterLinksChange([...interLinks, link]);
    }
    setPopup(null);
  };

  const deleteLink = (id: string) => {
    props.onLinksChange(links.filter((l) => l.id !== id));
    setDetail(null);
  };
  const deleteInterLink = (id: string) => {
    onInterLinksChange(interLinks.filter((l) => l.id !== id));
    setDetail(null);
  };

  const updateChapterTitle = (id: string, title: string) =>
    props.onChaptersChange(chapters.map((c) => (c.id === id ? { ...c, title } : c)));

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-[#0f1115] text-[#e8eaed]",
        fullscreen && "fixed inset-0 z-[100] rounded-none border-0 flex flex-col",
      )}
    >
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#232833] flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#22c55e] flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-serif font-semibold text-lg leading-tight">Chapter Matrix</h2>
            <p className="text-[11px] text-[#8a93a3]">
              Drag cards anywhere. Link elements to chapters, or chapters to chapters.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill icon={<BookOpen className="w-3.5 h-3.5" />} label={`${chapters.length} Chapters`} />
          <Pill icon={<Link2 className="w-3.5 h-3.5" />} label={`${links.length} Element links`} />
          <Pill icon={<ArrowRightLeft className="w-3.5 h-3.5" />} label={`${interLinks.length} Inter-chapter`} />
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#161a21] border border-[#232833]">
            <button onClick={zoomOut} className="p-1 rounded hover:bg-[#232833] text-[#cfd4df]" aria-label="Zoom out"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={zoomReset} className="text-[10px] px-1.5 text-[#8a93a3] tabular-nums hover:text-white" aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={zoomIn} className="p-1 rounded hover:bg-[#232833] text-[#cfd4df]" aria-label="Zoom in"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-[#232833] bg-[#161a21] text-[#cfd4df] hover:bg-[#232833] text-xs"
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Full screen"}</span>
          </button>
          <Button variant="outline" size="sm" onClick={addChapter} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add chapter
          </Button>
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#232833] bg-[#161a21] text-[#cfd4df] hover:bg-[#232833]"
              aria-label="Close full screen"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn("flex", fullscreen ? "flex-1 min-h-0" : "h-[640px]")}
        id="cms-app"
        ref={wrapRef}
      >
        {/* Sidebar */}
        <aside className="w-[260px] min-w-[260px] h-full bg-[#161a21] border-r border-[#232833] p-4 overflow-y-auto z-[3]">
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointer2 className="w-3.5 h-3.5 text-[#8a93a3]" />
            <h2 className="text-sm m-0 tracking-wider">Story Elements</h2>
          </div>
          <p className="text-[11px] text-[#8a93a3] mb-3.5">Click an element, then click a chapter to link it.</p>

          <Group title="Plot" cat="plot" items={groups.plot}
            selectedId={selected?.id ?? null}
            onSelect={selectElement}
            registerRef={(id, node) => elNodes.current.set(id, node)}
          />
          <Group title="Characters" cat="character" items={groups.character}
            selectedId={selected?.id ?? null}
            onSelect={selectElement}
            registerRef={(id, node) => elNodes.current.set(id, node)}
          />
          <Group title="World" cat="world" items={groups.world}
            selectedId={selected?.id ?? null}
            onSelect={selectElement}
            registerRef={(id, node) => elNodes.current.set(id, node)}
          />

          <div className="mt-4 pt-3 border-t border-[#232833] text-[10px] text-[#5d6577] leading-relaxed space-y-1">
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-[#ef4444] inline-block" /> Plot link</p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-[#3b82f6] inline-block" /> Character link</p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-[#22c55e] inline-block" /> World link</p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-[#9aa3b2] inline-block" /> Inter-chapter (grey)</p>
          </div>
        </aside>

        {/* Matrix */}
        <div className="flex-1 relative overflow-hidden" ref={matrixRef}>
          {/* Hint */}
          <div
            className={cn(
              "absolute top-2 left-1/2 -translate-x-1/2 z-[5]",
              "bg-[#1d222c] border border-[#2a3140] px-3.5 py-1.5 rounded-full",
              "text-xs max-w-[80%] truncate",
              hintError ? "text-red-400" : "text-[#cfd4df]",
            )}
          >
            {hintError
              ? hintError
              : linkSource
                ? <>Linking from <b className="text-[#cbd5e1]">{chapterLabel(chapters, linkSource)}</b> — click another chapter (or press Esc).</>
                : selected
                  ? <>Selected: <b style={{ color: COLORS[selected.category] }}>{findElement(selected.id)?.name}</b> — now click a chapter.</>
                  : "Drag any card to reposition. Select an element to link it, or click a chapter's link icon to connect chapters."}
          </div>

          <div
            ref={scrollRef}
            className="h-full overflow-auto p-6"
            onClick={(e) => {
              const t = e.target as HTMLElement;
              if (!t.closest("[data-chapter]") && !t.closest("[data-popup]") && !t.closest("[data-curve]")) {
                setPopup(null);
                setLinkSource(null);
              }
            }}
            onKeyDown={(e) => { if (e.key === "Escape") { setLinkSource(null); setPopup(null); } }}
            tabIndex={0}
          >
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_W * zoom,
                height: CANVAS_H * zoom,
                backgroundImage: "radial-gradient(circle, #232833 1px, transparent 1px)",
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  width: CANVAS_W,
                  height: CANVAS_H,
                }}
              >
                {chapters.map((ch, i) => (
                  <FreeChapterCard
                    key={ch.id}
                    index={i}
                    chapter={ch}
                    chLinks={links.filter((l) => l.chapterId === ch.id)}
                    interOut={interLinks.filter((l) => l.fromChapterId === ch.id).length}
                    findElement={findElement}
                    onClickCard={onChapterClick}
                    onClickLink={(lid) => setDetail({ kind: "link", id: lid })}
                    onTitleChange={updateChapterTitle}
                    onRemoveChapter={removeChapter}
                    onStartDrag={beginCardDrag}
                    onStartInterLink={(id) => { setSelected(null); setLinkSource(id === linkSource ? null : id); }}
                    isLinkSource={linkSource === ch.id}
                    isLinkTarget={!!linkSource && linkSource !== ch.id}
                    registerNode={(node) => chNodes.current.set(ch.id, node)}
                  />
                ))}
                {chapters.length === 0 && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 text-sm text-[#8a93a3]">
                    No chapters yet — use Add chapter to start.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SVG overlay — over the scroll container, in wrap coordinates */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-[2]">
            {/* element→chapter links */}
            {linePaths.map((p) => (
              <g key={p.link.id}>
                <path
                  d={p.d} fill="none" stroke={p.color} strokeWidth={2.5}
                  className="cursor-pointer hover:[stroke-width:4] pointer-events-stroke"
                  onClick={() => setDetail({ kind: "link", id: p.link.id })}
                  data-curve
                />
                <circle
                  cx={p.mx} cy={p.my} r={6} fill="#fff" stroke={p.color} strokeWidth={1}
                  style={{ pointerEvents: "all", cursor: "grab" }}
                  data-curve
                  onMouseDown={(e) => {
                    e.preventDefault();
                    curveDragRef.current = { kind: "link", id: p.link.id, baseMx: p.baseMx, baseMy: p.baseMy };
                  }}
                />
              </g>
            ))}
            {/* chapter→chapter grey links */}
            {interPaths.map((p) => (
              <g key={p.link.id}>
                <path
                  d={p.d} fill="none" stroke={INTER_COLOR} strokeWidth={2}
                  strokeDasharray="6 4"
                  className="cursor-pointer hover:[stroke-width:3.5] pointer-events-stroke"
                  onClick={() => setDetail({ kind: "inter", id: p.link.id })}
                  data-curve
                />
                <circle
                  cx={p.mx} cy={p.my} r={6} fill="#1d222c" stroke={INTER_COLOR} strokeWidth={1.5}
                  style={{ pointerEvents: "all", cursor: "grab" }}
                  data-curve
                  onMouseDown={(e) => {
                    e.preventDefault();
                    curveDragRef.current = { kind: "inter", id: p.link.id, baseMx: p.baseMx, baseMy: p.baseMy };
                  }}
                />
              </g>
            ))}
          </svg>

          {/* Note popup */}
          {popup && (
            <NotePopup
              x={popup.x - (matrixRef.current?.getBoundingClientRect().left ?? 0)}
              y={popup.y - (matrixRef.current?.getBoundingClientRect().top ?? 0)}
              header={
                popup.kind === "element" ? (
                  <>Link <span className="text-[10px] px-1.5 py-0.5 rounded text-white mr-1" style={{ background: COLORS[popup.el.category] }}>{popup.el.category}</span>{popup.el.name}</>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#9aa3b2]" />
                    {chapterLabel(chapters, popup.fromChapterId)} <span className="text-[#5d6577]">→</span> {chapterLabel(chapters, popup.toChapterId)}
                  </span>
                )
              }
              note={popup.note}
              setNote={(v) => setPopup((p) => p ? { ...p, note: v } : p)}
              elements={allElements}
              requireAt={popup.kind === "inter"}
              placeholder={popup.kind === "inter"
                ? "Use @Name to reference an existing element. e.g. '@Chris's lie → fallout here.'"
                : "Describe this link… type @ to reference another element"}
              onCancel={() => setPopup(null)}
              onConfirm={confirmLink}
            />
          )}
        </div>
      </div>

      {/* Link Details Modal */}
      {detail && detail.kind === "link" && (() => {
        const link = links.find((l) => l.id === detail.id);
        if (!link) return null;
        const el = findElement(link.elementId);
        const ch = chapters.find((c) => c.id === link.chapterId);
        if (!el || !ch) return null;
        const chNum = chapters.findIndex((c) => c.id === ch.id) + 1;
        return (
          <DetailModal onClose={() => setDetail(null)}>
            <h2 className="text-lg font-semibold m-0">Link Details</h2>
            <p className="text-xs text-[#8a93a3] mt-1 mb-4">Connection between a story element and a chapter.</p>
            <div className="flex gap-2.5 mb-3.5">
              <Field label="Element"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm" style={{ borderLeft: `3px solid ${COLORS[link.category]}` }}><b>{el.name}</b></div></Field>
              <Field label="Category"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded"><span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: COLORS[link.category] }}>{link.category}</span></div></Field>
              <Field label="Chapter"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm">#{chNum} — {ch.title || `Chapter ${chNum}`}</div></Field>
            </div>
            <Field label="Note">
              <div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm whitespace-pre-wrap min-h-[60px] leading-relaxed">
                {link.note ? renderNoteWithRefs(link.note, allElements) : <i className="text-[#8a93a3]">No note added.</i>}
              </div>
            </Field>
            <div className="flex justify-between gap-2 mt-4">
              <Button variant="destructive" size="sm" onClick={() => deleteLink(link.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </DetailModal>
        );
      })()}

      {detail && detail.kind === "inter" && (() => {
        const link = interLinks.find((l) => l.id === detail.id);
        if (!link) return null;
        return (
          <DetailModal onClose={() => setDetail(null)}>
            <h2 className="text-lg font-semibold m-0 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-[#9aa3b2]" /> Inter-chapter Link</h2>
            <p className="text-xs text-[#8a93a3] mt-1 mb-4">Structural connection between two chapters. References existing elements only.</p>
            <div className="flex gap-2.5 mb-3.5">
              <Field label="From"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm">{chapterLabel(chapters, link.fromChapterId)}</div></Field>
              <Field label="To"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm">{chapterLabel(chapters, link.toChapterId)}</div></Field>
            </div>
            <Field label="Note">
              <div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm whitespace-pre-wrap min-h-[60px] leading-relaxed">
                {renderNoteWithRefs(link.note, allElements)}
              </div>
            </Field>
            <div className="flex justify-between gap-2 mt-4">
              <Button variant="destructive" size="sm" onClick={() => deleteInterLink(link.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </DetailModal>
        );
      })()}
    </div>
  );
}

// ============================================================

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#161a21] border border-[#232833] text-xs text-[#cfd4df]">
      <span className="text-[#8a93a3]">{icon}</span> {label}
    </div>
  );
}

function Group({
  title, cat, items, selectedId, onSelect, registerRef,
}: {
  title: string;
  cat: LinkCategory;
  items: ElementLite[];
  selectedId: string | null;
  onSelect: (el: ElementLite) => void;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] uppercase tracking-[1px] m-0 mb-2 text-[#aab2c0] flex items-center gap-1.5">
        <span className={cn("w-2 h-2 rounded-full inline-block", DOT_CLASS[cat])} />
        {title} <span className="ml-auto text-[10px] text-[#5d6577] normal-case tracking-normal">{items.length}</span>
      </h3>
      {items.length === 0 && (
        <p className="text-[11px] text-[#5d6577] italic">None added.</p>
      )}
      <div className={cn(items.length > 5 && "max-h-[200px] overflow-y-auto pr-1 -mr-1")}>
        {items.map((el) => {
          const selected = selectedId === el.id;
          return (
            <div
              key={el.id}
              ref={(n) => registerRef(el.id, n)}
              data-id={el.id}
              onClick={() => onSelect(el)}
              className={cn(
                "px-2.5 py-2 mb-1.5 rounded-md bg-[#1d222c] hover:bg-[#252b38] cursor-pointer text-[13px]",
                "border flex justify-between items-center transition-colors",
                selected ? "border-current" : "border-transparent",
              )}
              style={selected ? { borderColor: COLORS[cat], boxShadow: `inset 0 0 0 1px ${COLORS[cat]}` } : undefined}
            >
              <span className="truncate mr-2">{el.name}</span>
              <span className="text-[10px] text-[#8a93a3] shrink-0">{cat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Free-positioned chapter card ----
const CAT_BADGE_BG: Record<LinkCategory, string> = {
  plot: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40",
  character: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/40",
  world: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40",
};

function FreeChapterCard({
  index, chapter, chLinks, interOut, findElement,
  onClickCard, onClickLink, onTitleChange, onRemoveChapter,
  onStartDrag, onStartInterLink, isLinkSource, isLinkTarget, registerNode,
}: {
  index: number;
  chapter: CanvasChapter;
  chLinks: ChapterLink[];
  interOut: number;
  findElement: (id: string) => ElementLite | null;
  onClickCard: (id: string, e: React.MouseEvent) => void;
  onClickLink: (linkId: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onRemoveChapter: (id: string) => void;
  onStartDrag: (id: string, e: React.MouseEvent) => void;
  onStartInterLink: (id: string) => void;
  isLinkSource: boolean;
  isLinkTarget: boolean;
  registerNode: (node: HTMLDivElement | null) => void;
}) {
  const full = chLinks.length >= 3;
  const accentColor = chLinks[0] ? COLORS[chLinks[0].category] : "#3b82f6";
  const pos = chapter.position ?? { x: 40, y: 60 };

  return (
    <div
      ref={registerNode}
      data-chapter={chapter.id}
      onClick={(e) => onClickCard(chapter.id, e)}
      onMouseDown={(e) => onStartDrag(chapter.id, e)}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: CARD_W,
        height: CARD_H,
      }}
      className={cn(
        "cursor-grab active:cursor-grabbing bg-[#1d222c] border rounded-[10px] p-3.5 transition-colors select-none",
        isLinkSource
          ? "border-[#facc15] ring-2 ring-[#facc15]/40"
          : isLinkTarget
            ? "border-[#9aa3b2] hover:border-[#cbd5e1] ring-1 ring-[#9aa3b2]/30"
            : "border-[#2a3140] hover:border-[#4b5468]",
        full && "opacity-95",
      )}
    >
      {/* numbered badge */}
      <span
        className="absolute -top-2 left-3 px-1.5 py-0.5 rounded text-[11px] font-bold border"
        style={{ background: `${accentColor}22`, color: accentColor, borderColor: `${accentColor}66` }}
      >
        {index + 1}
      </span>

      {/* inter-chapter link button */}
      <button
        type="button"
        data-no-drag
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onStartInterLink(chapter.id); }}
        className={cn(
          "absolute top-1.5 right-9 p-1 rounded hover:bg-[#262c38]",
          isLinkSource ? "text-[#facc15]" : "text-[#5d6577] hover:text-[#cbd5e1]",
        )}
        aria-label="Link to another chapter"
        title={interOut >= 1 ? "Inter-chapter link already added (max 1)" : "Link to another chapter"}
        disabled={interOut >= 1 && !isLinkSource}
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </button>

      {/* remove */}
      <button
        type="button"
        data-no-drag
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemoveChapter(chapter.id); }}
        className="absolute top-1.5 right-2 p-1 rounded text-[#5d6577] hover:text-red-400 hover:bg-[#262c38]"
        aria-label="Remove chapter"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <Input
        value={chapter.title}
        onChange={(e) => onTitleChange(chapter.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={`Chapter ${index + 1}`}
        className="mt-3 h-7 px-1 text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-[#2a3140] focus-visible:border-[#3a4254] focus-visible:ring-0 text-[#e8eaed]"
      />

      {chLinks.length > 0 && (
        <div className="mt-3 text-[10px] uppercase tracking-wider text-[#7a8294] flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Linked elements
        </div>
      )}
      <div className="mt-1 space-y-1.5">
        {chLinks.map((l) => {
          const el = findElement(l.elementId);
          if (!el) return null;
          return (
            <div
              key={l.id}
              data-no-drag
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onClickLink(l.id); }}
              className="flex items-center gap-1.5 bg-[#262c38] hover:bg-[#323a4a] px-1.5 py-1 rounded text-[11px] text-[#cfd4df] cursor-pointer"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", DOT_CLASS[l.category])} />
              <b className="truncate">{el.name}</b>
              <span className={cn("ml-auto text-[9px] px-1 py-px rounded border", CAT_BADGE_BG[l.category])}>{l.category}</span>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-2.5 right-3 text-[10px] text-[#666] flex items-center gap-2">
        {interOut > 0 && (
          <span className="flex items-center gap-0.5 text-[#9aa3b2]" title="Inter-chapter link present">
            <ArrowRightLeft className="w-2.5 h-2.5" /> 1
          </span>
        )}
        <span>{chLinks.length}/3</span>
      </div>
      {full && (
        <span className="absolute bottom-2.5 left-3 text-[9px] text-red-500 tracking-wider">FULL</span>
      )}
    </div>
  );
}

// ---- Note popup (shared by element-link and inter-chapter-link) ----
function NotePopup({
  x, y, header, note, setNote, elements, onCancel, onConfirm,
  placeholder, requireAt,
}: {
  x: number; y: number;
  header: React.ReactNode;
  note: string;
  setNote: (v: string) => void;
  elements: ElementLite[];
  onCancel: () => void;
  onConfirm: () => void;
  placeholder?: string;
  requireAt?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [atState, setAtState] = useState<{ startPos: number; query: string } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x, y });
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => { setPos({ x, y }); }, [x, y]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const parent = (taRef.current?.closest("#cms-app") as HTMLElement | null);
      const bounds = parent?.getBoundingClientRect();
      let nx = e.clientX - d.ox;
      let ny = e.clientY - d.oy;
      if (bounds) {
        nx = Math.max(0, Math.min(bounds.width - 300, nx));
        ny = Math.max(0, Math.min(bounds.height - 60, ny));
      }
      setPos({ x: nx, y: ny });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => { taRef.current?.focus(); }, []);

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    const ta = e.target;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const m = before.match(/@(\w*)$/);
    if (m) setAtState({ startPos: pos - m[0].length, query: m[1] });
    else setAtState(null);
  };

  const matches = atState
    ? elements.filter((e) => e.name.toLowerCase().includes(atState.query.toLowerCase())).slice(0, 8)
    : [];

  const insertRef = (m: ElementLite) => {
    if (!atState || !taRef.current) return;
    const ta = taRef.current;
    const before = ta.value.slice(0, atState.startPos);
    const after = ta.value.slice(ta.selectionStart);
    const tag = "@" + m.name;
    const next = before + tag + " " + after;
    setNote(next);
    setAtState(null);
    requestAnimationFrame(() => {
      const newPos = (before + tag + " ").length;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    });
  };

  const hasAt = /@\w/.test(note);
  const canConfirm = !requireAt || hasAt;

  return (
    <div
      data-popup
      className="absolute z-[30] w-[300px] bg-[#1d222c] border border-[#3a4254] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,.5)]"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-1.5 mb-2 -m-1 px-1 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-[#262c38] select-none"
        onMouseDown={(e) => {
          e.preventDefault();
          dragRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
        }}
      >
        <GripVertical className="w-3.5 h-3.5 text-[#5d6577] shrink-0" />
        <h4 className="m-0 text-[13px] text-white flex-1 min-w-0 truncate">{header}</h4>
      </div>
      <Textarea
        ref={taRef}
        value={note}
        onChange={onInput}
        placeholder={placeholder ?? "Describe this link… type @ to reference another element"}
        className="min-h-[60px] bg-[#0f1115] text-[#e8eaed] border-[#2a3140] text-xs"
      />
      <div className="text-[10px] text-[#8a93a3] mt-1 flex items-center gap-1">
        <AtSign className="w-3 h-3" />
        {requireAt
          ? <span>Must reference an existing element with <b>@Name</b>.</span>
          : <span>Tip: type <b>@</b> to insert a reference.</span>}
      </div>
      {matches.length > 0 && (
        <div className="mt-1 max-h-[140px] overflow-y-auto bg-[#0f1115] border border-[#3a4254] rounded">
          {matches.map((m) => (
            <div
              key={m.id}
              onClick={() => insertRef(m)}
              className="px-2.5 py-1.5 text-xs cursor-pointer flex items-center gap-1.5 hover:bg-[#1d222c]"
            >
              <span className={cn("w-2 h-2 rounded-full", DOT_CLASS[m.category])} />
              {m.name}
              <span className="ml-auto text-[10px] text-[#7a8294]">{m.category}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-1.5 mt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={!canConfirm}
          style={{ background: canConfirm ? "#3b82f6" : "#3b82f680", color: "#fff" }}
        >
          Create Link
        </Button>
      </div>
    </div>
  );
}

function DetailModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[50] bg-black/65 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1d222c] border border-[#3a4254] rounded-[10px] w-[460px] max-w-[92vw] p-5 relative text-[#e8eaed]">
        <button onClick={onClose} className="absolute top-2.5 right-3 text-[#8a93a3] hover:text-white text-xl leading-none" aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 mb-3">
      <div className="text-[10px] uppercase tracking-wider text-[#8a93a3] mb-1">{label}</div>
      {children}
    </div>
  );
}

function short(s: string, n: number): string {
  const t = (s ?? "").trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

function chapterLabel(chapters: CanvasChapter[], id: string): string {
  const idx = chapters.findIndex((c) => c.id === id);
  if (idx < 0) return "Chapter";
  const ch = chapters[idx];
  return `#${idx + 1} ${ch.title?.trim() || `Chapter ${idx + 1}`}`;
}

function renderNoteWithRefs(note: string, elements: ElementLite[]): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /@([A-Za-z][\w ]*?)(?=\s|$|[.,!?;:])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(note)) !== null) {
    if (m.index > last) parts.push(note.slice(last, m.index));
    const name = m[1].trim();
    const el = elements.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (el) {
      parts.push(
        <span
          key={`r${key++}`}
          className="inline-block px-1.5 py-px rounded text-[11px] text-white font-semibold mx-0.5"
          style={{ background: COLORS[el.category] }}
        >
          @{el.name}
        </span>,
      );
    } else {
      parts.push(m[0]);
    }
    last = re.lastIndex;
  }
  if (last < note.length) parts.push(note.slice(last));
  return parts;
}