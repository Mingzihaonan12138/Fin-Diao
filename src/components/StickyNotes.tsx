import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Loader2, StickyNote as StickyIcon } from "lucide-react";
import { StickyNote } from "../types";
import { loadStickyNotes, saveStickyNote, deleteStickyNote } from "../lib/sync";

// Warm "washi" sticky palette — tuned to the app's cream theme, not neon Post-it.
const PALETTE = [
  { bg: "#FCE3A1", edge: "#E7C766", ink: "#5A4B1E" }, // 黄
  { bg: "#FAC7D4", edge: "#E3A0B4", ink: "#7A3346" }, // 粉
  { bg: "#C9E8D1", edge: "#A2D5B1", ink: "#2F5C40" }, // 薄荷
  { bg: "#C7DCF1", edge: "#9DBFE0", ink: "#2C4A66" }, // 天蓝
  { bg: "#E6D6F2", edge: "#C7AEE3", ink: "#503B6B" }, // 薰衣草
  { bg: "#FAD8B6", edge: "#EAB888", ink: "#7A4A24" }, // 杏
];

const TAPE = "rgba(255,255,255,0.55)";

interface StickyNotesProps {
  user: any;
  targetType: "board" | "course" | "word";
  targetId?: string;
  targetLabel?: string;
  heading?: string;
  hint?: string;
}

export default function StickyNotes({ user, targetType, targetId, targetLabel, heading, hint }: StickyNotesProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const textRefs = useRef<{ [id: string]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const all = await loadStickyNotes(user);
        const mine = all
          .filter(n => n.targetType === targetType && (targetType === "board" || n.targetId === targetId))
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
        if (alive) setNotes(mine);
      } catch (err) {
        console.error("Failed to load sticky notes:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, targetType, targetId]);

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(96, el.scrollHeight) + "px";
  };

  const addNote = () => {
    const now = new Date().toISOString();
    const note: StickyNote = {
      id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: "",
      colorIndex: notes.length % PALETTE.length,
      rotation: Math.round((Math.random() * 5 - 2.5) * 10) / 10,
      targetType,
      targetId,
      targetLabel,
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [...prev, note]);
    // focus the new note's textarea after it mounts
    requestAnimationFrame(() => {
      const el = textRefs.current[note.id];
      if (el) { el.focus(); autoGrow(el); }
    });
  };

  const updateText = (id: string, text: string) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, text } : n)));
  };

  const persist = async (note: StickyNote) => {
    // drop empty drafts instead of saving blanks
    if (!note.text.trim()) {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      try { await deleteStickyNote(note.id, user); } catch { /* draft never saved */ }
      return;
    }
    setSavingId(note.id);
    try {
      await saveStickyNote({ ...note, updatedAt: new Date().toISOString() }, user);
    } catch (err) {
      console.error("Failed to save sticky note:", err);
    } finally {
      setSavingId(null);
    }
  };

  const cycleColor = async (note: StickyNote) => {
    const next = { ...note, colorIndex: (note.colorIndex + 1) % PALETTE.length };
    setNotes(prev => prev.map(n => (n.id === note.id ? next : n)));
    if (next.text.trim()) await saveStickyNote({ ...next, updatedAt: new Date().toISOString() }, user);
  };

  const remove = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try { await deleteStickyNote(id, user); } catch (err) { console.error(err); }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2 text-balance">
            <StickyIcon className="w-4.5 h-4.5 text-coral-500" />
            {heading || "我的心得便签"}
            {notes.length > 0 && (
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">{notes.length}</span>
            )}
          </h3>
          {hint && <p className="text-[11px] text-slate-400 leading-relaxed text-pretty">{hint}</p>}
        </div>
        <button
          onClick={addNote}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold shadow-sm transition-[scale,background-color] active:scale-[0.96] cursor-pointer"
          style={{ minHeight: 40 }}
        >
          <Plus className="w-4 h-4" /> 写便签
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-xs py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> 正在取下你的便签…
        </div>
      ) : notes.length === 0 ? (
        <button
          onClick={addNote}
          className="w-full rounded-2xl border-2 border-dashed border-[#D9D1C0] hover:border-coral-500/60 hover:bg-[#F3EFE4]/60 py-10 px-6 text-center transition-colors cursor-pointer group"
        >
          <div className="w-11 h-11 mx-auto rounded-2xl bg-[#F3EFE4] text-coral-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <StickyIcon className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-600">还没有便签</p>
          <p className="text-xs text-slate-400 mt-1 text-pretty">
            写一张贴上去吧——记录你的心得、易混点，或对这部分内容的提醒。
          </p>
        </button>
      ) : (
        <div className="flex flex-wrap gap-5 pt-1">
          <AnimatePresence initial={false}>
            {notes.map(note => {
              const c = PALETTE[note.colorIndex] || PALETTE[0];
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: note.rotation }}
                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                  whileHover={{ rotate: 0, y: -6, scale: 1.03 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  style={{
                    backgroundColor: c.bg,
                    color: c.ink,
                    width: 224,
                    boxShadow: "0 1px 1px rgba(0,0,0,0.05), 0 10px 20px -10px rgba(60,45,30,0.45)",
                    willChange: "transform",
                  }}
                  className="relative rounded-[6px] px-4 pt-6 pb-9 group"
                >
                  {/* washi tape */}
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-1/2 h-5 w-16 rounded-[2px]"
                    style={{
                      transform: "translateX(-50%) rotate(-3deg)",
                      background: TAPE,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      backdropFilter: "blur(1px)",
                    }}
                  />

                  <textarea
                    ref={el => { textRefs.current[note.id] = el; if (el) autoGrow(el); }}
                    value={note.text}
                    onChange={e => { updateText(note.id, e.target.value); autoGrow(e.target); }}
                    onBlur={() => persist({ ...note, text: textRefs.current[note.id]?.value ?? note.text })}
                    placeholder="写点什么…"
                    rows={3}
                    className="w-full bg-transparent resize-none outline-none text-[14px] leading-relaxed placeholder:opacity-40 text-pretty"
                    style={{ color: c.ink }}
                  />

                  {/* footer: color dots + delete (appear on hover / focus-within) */}
                  <div className="absolute left-3 right-2.5 bottom-2 flex items-center justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => cycleColor(note)}
                      title="换颜色"
                      className="w-6 h-6 rounded-full border-2 border-white/70 shadow-sm cursor-pointer active:scale-[0.96] transition-transform"
                      style={{ backgroundColor: PALETTE[(note.colorIndex + 1) % PALETTE.length].bg, minWidth: 24 }}
                    />
                    <div className="flex items-center gap-1">
                      {savingId === note.id && <Loader2 className="w-3 h-3 animate-spin opacity-50" />}
                      <button
                        onClick={() => remove(note.id)}
                        title="撕掉"
                        className="p-1.5 rounded-lg hover:bg-black/5 text-current/70 hover:text-red-600 cursor-pointer active:scale-[0.96] transition-[scale,color]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {targetType === "board" && note.targetLabel && (
                    <span className="absolute -bottom-2 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/60 text-current/70">
                      {note.targetLabel}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
