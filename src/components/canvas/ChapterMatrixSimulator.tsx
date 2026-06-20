import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CharacterArcCard, WorldElementCard, CanvasChapter,
  ChapterLink, LinkCategory,
} from "@/types/book";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, X, Plus, Minus, BookOpen, Link2, List, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface ElementLite { id: string; name: string; category: LinkCategory }

interface Props {
  bullets: { id: string; text: string }[];
  characters: CharacterArcCard[];
  worlds: WorldElementCard[];
  chapters: CanvasChapter[];
  onChaptersChange: (next: CanvasChapter[]) => void;
  links: ChapterLink[];
  onLinksChange: (next: ChapterLink[]) => void;
}

export function ChapterMatrixSimulator(props: Props) {
  const { bullets, characters, worlds, chapters, links } = props;

  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const addChapter = () => {
    const id = newId();
    props.onChaptersChange([
      ...chapters,
      { id, title: `Chapter ${chapters.length + 1}`, plot: "", scenes: [] },
    ]);
  };
  const removeChapter = (id: string) => {
    props.onChaptersChange(chapters.filter((c) => c.id !== id));
    props.onLinksChange(links.filter((l) => l.chapterId !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapters.findIndex((c) => c.id === active.id);
    const newI = chapters.findIndex((c) => c.id === over.id);
    if (oldI < 0 || newI < 0) return;
    props.onChaptersChange(arrayMove(chapters, oldI, newI));
  };

  // Flatten elements grouped by category
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

  // Refs for the matrix wrap + chapter + element nodes
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const elNodes = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const chNodes = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const [selected, setSelected] = useState<{ id: string; category: LinkCategory } | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [popup, setPopup] = useState<
    | { chapterId: string; el: ElementLite; x: number; y: number; note: string }
    | null
  >(null);
  const [detailLinkId, setDetailLinkId] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  // Trigger SVG redraw on any layout/scroll/resize/data change
  const redraw = useCallback(() => forceTick((n) => n + 1), []);
  useLayoutEffect(() => {
    redraw();
  }, [chapters, links, allElements, redraw]);

  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    const m = matrixRef.current;
    m?.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      m?.removeEventListener("scroll", onResize);
    };
  }, [redraw]);

  // Compute line paths
  const linePaths = useMemo(() => {
    const wrap = wrapRef.current;
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
  }, [links, chapters, allElements, popup, detailLinkId]);

  // Drag for curve handle
  const dragRef = useRef<{ id: string; baseMx: number; baseMy: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      const wrap = wrapRef.current;
      if (!d || !wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const x = e.clientX - wrapRect.left;
      const y = e.clientY - wrapRect.top;
      const next = props.links.map((l) =>
        l.id === d.id ? { ...l, curveOffset: { dx: x - d.baseMx, dy: y - d.baseMy } } : l,
      );
      props.onLinksChange(next);
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [props]);

  // ---- actions ----
  const flashError = (msg: string) => {
    setHintError(msg);
    window.setTimeout(() => setHintError(null), 1800);
  };

  const selectElement = (el: ElementLite) => {
    setSelected((s) => (s && s.id === el.id ? null : { id: el.id, category: el.category }));
  };

  const onChapterClick = (chId: string, e: React.MouseEvent) => {
    if (!selected) return;
    const el = findElement(selected.id);
    if (!el) return;
    const chLinks = links.filter((l) => l.chapterId === chId);
    if (chLinks.length >= 3) return flashError("Chapter cap reached (max 3 links per chapter).");
    if (chLinks.some((l) => l.category === selected.category)) return flashError(`Only 1 ${selected.category} link per chapter.`);
    if (chLinks.some((l) => l.elementId === selected.id)) return flashError("That element is already linked here.");
    setPopup({
      chapterId: chId,
      el,
      x: Math.min(window.innerWidth - 320, e.clientX),
      y: Math.min(window.innerHeight - 240, e.clientY),
      note: "",
    });
  };

  const confirmLink = () => {
    if (!popup) return;
    const link: ChapterLink = {
      id: "L" + newId(),
      chapterId: popup.chapterId,
      elementId: popup.el.id,
      category: popup.el.category,
      note: popup.note.trim(),
      curveOffset: { dx: 0, dy: 0 },
    };
    props.onLinksChange([...links, link]);
    setPopup(null);
    setSelected(null);
  };

  const deleteLink = (id: string) => {
    props.onLinksChange(links.filter((l) => l.id !== id));
    setDetailLinkId(null);
  };

  const updateChapterTitle = (id: string, title: string) =>
    props.onChaptersChange(chapters.map((c) => (c.id === id ? { ...c, title } : c)));

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-[#0f1115] text-[#e8eaed]">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#232833] flex-wrap">
        <div>
          <h2 className="font-serif font-semibold text-lg leading-tight">Chapter Matrix</h2>
          <p className="text-[11px] text-[#8a93a3]">
            Build your story's backbone. Create chapters and link them to plot points, characters, and world elements.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#161a21] border border-[#232833] text-xs">
            <BookOpen className="w-3.5 h-3.5 text-[#8a93a3]" /> {chapters.length} Chapters
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#161a21] border border-[#232833] text-xs">
            <Link2 className="w-3.5 h-3.5 text-[#8a93a3]" /> {links.length} Links
          </div>
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#161a21] border border-[#232833]">
            <button onClick={zoomOut} className="p-1 rounded hover:bg-[#232833] text-[#cfd4df]" aria-label="Zoom out"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={zoomReset} className="text-[10px] px-1.5 text-[#8a93a3] tabular-nums">{Math.round(zoom * 100)}%</button>
            <button onClick={zoomIn} className="p-1 rounded hover:bg-[#232833] text-[#cfd4df]" aria-label="Zoom in"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={addChapter} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add chapter
          </Button>
        </div>
      </div>

      <div className="flex h-[640px]" id="cms-app">
        {/* Sidebar */}
        <aside className="w-[260px] min-w-[260px] h-full bg-[#161a21] border-r border-[#232833] p-4 overflow-y-auto z-[3]">
          <h2 className="text-sm m-0 mb-1 tracking-wider">Story Elements</h2>
          <p className="text-[11px] text-[#8a93a3] mb-3.5">Click an element, then click a chapter to link.</p>

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
        </aside>

        {/* Matrix */}
        <div className="flex-1 relative overflow-hidden" ref={wrapRef}>
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
              : selected
                ? <>Selected: <b style={{ color: COLORS[selected.category] }}>{findElement(selected.id)?.name}</b> — now click a chapter.</>
                : "Select a story element, then a chapter to create a curved link. Click any link row to view details."}
          </div>

          <div
            ref={matrixRef}
            className="h-full overflow-x-auto overflow-y-hidden p-10 whitespace-nowrap"
            onClick={(e) => {
              // close popup if clicking blank area
              const t = e.target as HTMLElement;
              if (!t.closest("[data-chapter]") && !t.closest("[data-popup]")) {
                setPopup(null);
              }
            }}
          >
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
              className="inline-block transition-transform"
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={chapters.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                  {chapters.map((ch, i) => (
                    <SortableChapterCard
                      key={ch.id}
                      index={i}
                      chapter={ch}
                      chLinks={links.filter((l) => l.chapterId === ch.id)}
                      findElement={findElement}
                      onClickCard={onChapterClick}
                      onClickLink={(lid) => setDetailLinkId(lid)}
                      onTitleChange={updateChapterTitle}
                      onRemoveChapter={removeChapter}
                      registerNode={(node) => chNodes.current.set(ch.id, node)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <button
                onClick={addChapter}
                className="inline-flex flex-col items-center justify-center align-top w-[220px] h-[300px] mr-6 rounded-[10px] border border-dashed border-[#3a4254] text-[#8a93a3] hover:text-white hover:border-[#5d6577] transition-colors"
              >
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-sm">Add Chapter</span>
              </button>
              {chapters.length === 0 && (
                <div className="text-sm text-[#8a93a3]">No chapters yet — use Add Chapter to start.</div>
              )}
            </div>
          </div>

          {/* SVG overlay */}
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-[2]"
          >
            {linePaths.map((p) => (
              <g key={p.link.id}>
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={2.5}
                  className="cursor-pointer hover:[stroke-width:4] pointer-events-stroke"
                  onClick={() => setDetailLinkId(p.link.id)}
                />
                <circle
                  cx={p.mx}
                  cy={p.my}
                  r={6}
                  fill="#fff"
                  stroke={p.color}
                  strokeWidth={1}
                  style={{ pointerEvents: "all", cursor: "grab" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    dragRef.current = { id: p.link.id, baseMx: p.baseMx, baseMy: p.baseMy };
                  }}
                />
              </g>
            ))}
          </svg>

          {/* Note popup */}
          {popup && (
            <NotePopup
              x={popup.x - (wrapRef.current?.getBoundingClientRect().left ?? 0)}
              y={popup.y - (wrapRef.current?.getBoundingClientRect().top ?? 0)}
              el={popup.el}
              note={popup.note}
              setNote={(v) => setPopup((p) => p ? { ...p, note: v } : p)}
              elements={allElements}
              onCancel={() => setPopup(null)}
              onConfirm={confirmLink}
            />
          )}
        </div>
      </div>

      {/* Link Details Modal */}
      {detailLinkId && (() => {
        const link = links.find((l) => l.id === detailLinkId);
        if (!link) return null;
        const el = findElement(link.elementId);
        const ch = chapters.find((c) => c.id === link.chapterId);
        if (!el || !ch) return null;
        const chNum = chapters.findIndex((c) => c.id === ch.id) + 1;
        return (
          <div
            className="fixed inset-0 z-[50] bg-black/65 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailLinkId(null); }}
          >
            <div className="bg-[#1d222c] border border-[#3a4254] rounded-[10px] w-[460px] max-w-[92vw] p-5 relative text-[#e8eaed]">
              <button onClick={() => setDetailLinkId(null)} className="absolute top-2.5 right-3 text-[#8a93a3] hover:text-white text-xl leading-none" aria-label="Close">×</button>
              <h2 className="text-lg font-semibold m-0">Link Details</h2>
              <p className="text-xs text-[#8a93a3] mt-1 mb-4">Connection between a story element and a chapter.</p>
              <div className="flex gap-2.5 mb-3.5">
                <Field label="Element"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm" style={{ borderLeft: `3px solid ${COLORS[link.category]}` }}><b>{el.name}</b></div></Field>
                <Field label="Category"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded"><span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: COLORS[link.category] }}>{link.category}</span></div></Field>
                <Field label="Chapter"><div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm">#{chNum} — {ch.title || `Chapter ${chNum}`}</div></Field>
              </div>
              <Field label="Note">
                <div className="bg-[#0f1115] border border-[#2a3140] px-2.5 py-2 rounded text-sm whitespace-pre-wrap min-h-[60px] leading-relaxed">
                  {link.note
                    ? renderNoteWithRefs(link.note, allElements)
                    : <i className="text-[#8a93a3]">No note added.</i>}
                </div>
              </Field>
              <div className="flex justify-between gap-2 mt-4">
                <Button variant="destructive" size="sm" onClick={() => deleteLink(link.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Link
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDetailLinkId(null)}>Close</Button>
              </div>
            </div>
          </div>
        );
      })()}
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
        {title}
      </h3>
      {items.length === 0 && (
        <p className="text-[11px] text-[#5d6577] italic">None added.</p>
      )}
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
  );
}

function NotePopup({
  x, y, el, note, setNote, elements, onCancel, onConfirm,
}: {
  x: number; y: number;
  el: ElementLite;
  note: string;
  setNote: (v: string) => void;
  elements: ElementLite[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [atState, setAtState] = useState<{ startPos: number; query: string } | null>(null);

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

  return (
    <div
      data-popup
      className="absolute z-[30] w-[280px] bg-[#1d222c] border border-[#3a4254] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,.5)]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 className="m-0 mb-2 text-[13px] text-white">
        Link <span className="text-[10px] px-1.5 py-0.5 rounded text-white mr-1" style={{ background: COLORS[el.category] }}>{el.category}</span>
        {el.name}
      </h4>
      <Textarea
        ref={taRef}
        value={note}
        onChange={onInput}
        placeholder="Describe this link… type @ to reference another element"
        className="min-h-[60px] bg-[#0f1115] text-[#e8eaed] border-[#2a3140] text-xs"
      />
      <div className="text-[10px] text-[#8a93a3] mt-1">
        Tip: type <b>@</b> to insert a reference.
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
        <Button size="sm" onClick={onConfirm} style={{ background: "#3b82f6", color: "#fff" }}>
          Create Link
        </Button>
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

function renderNoteWithRefs(note: string, elements: ElementLite[]): React.ReactNode {
  // Tokenize @Name spans
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