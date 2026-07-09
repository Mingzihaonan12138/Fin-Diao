import { useState, useMemo, useEffect } from "react";
import { Check, ArrowLeft, GraduationCap, Trophy, ChevronRight } from "lucide-react";
import SpeakButton, { speakFinnish } from "./SpeakButton";

// 多邻国式「分组闯关 + 组内交错重复」：把词按组切开，一组一组背。
// 组内用选择题交错出题，一个词答对 TARGET 次才「毕业」，答错则很快再次出现。

interface GLWord {
  word: string;
  translation: string;
  exampleSentence?: string;
  translationExample?: string;
  partOfSpeech?: string;
  keyInflections?: string;
}

interface GroupLearnProps {
  title: string;
  words: GLWord[];
  storageKey: string; // 用于记住哪些组已完成（localStorage）
  onExit: () => void;
}

type QItem = { i: number; correct: number };

const GROUP_SIZE = 6;
const TARGET = 2; // 每个词答对几次才移出本组

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function GroupLearn({ title, words, storageKey, onExit }: GroupLearnProps) {
  const groups = useMemo(() => chunk(words, GROUP_SIZE), [words]);
  const lsKey = `groupLearn:${storageKey}`;

  const [completed, setCompleted] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) || "[]"); } catch { return []; }
  });
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [phase, setPhase] = useState<"intro" | "drill" | "done">("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [queue, setQueue] = useState<{ i: number; correct: number }[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const markCompleted = (gi: number) => {
    setCompleted(prev => {
      if (prev.includes(gi)) return prev;
      const next = [...prev, gi];
      try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const buildOptions = (gi: number, wordIdx: number): string[] => {
    const correct = groups[gi][wordIdx].translation;
    const pool = Array.from(new Set(
      words.map(w => w.translation).filter(t => t && t !== correct)
    ));
    return shuffle([correct, ...shuffle(pool).slice(0, 3)]);
  };

  const startGroup = (gi: number) => {
    setActiveGroup(gi);
    setPhase("intro");
    setIntroIndex(0);
  };

  const startDrill = (gi: number) => {
    const items: QItem[] = groups[gi].map((_, i) => ({ i, correct: 0 }));
    const q = shuffle<QItem>(items);
    setQueue(q);
    setOptions(buildOptions(gi, q[0].i));
    setPicked(null);
    setPhase("drill");
  };

  const exitToPicker = () => {
    setActiveGroup(null);
    setPhase("intro");
    setQueue([]);
    setPicked(null);
  };

  const gw = activeGroup !== null ? groups[activeGroup] : [];
  const current = queue[0];
  const currentWord = current ? gw[current.i] : null;
  const remaining = new Set(queue.map(x => x.i)).size;
  const mastered = gw.length - remaining;

  const advance = () => {
    if (activeGroup === null || !current || picked === null) return;
    const isCorrect = picked === gw[current.i].translation;
    const q = [...queue];
    const item = q.shift()!;
    if (isCorrect) {
      item.correct += 1;
      if (item.correct < TARGET) q.push(item); // 未毕业，放到最后再考
    } else {
      item.correct = 0;
      q.splice(Math.min(2, q.length), 0, item); // 答错：很快再出现
    }
    if (q.length === 0) {
      markCompleted(activeGroup);
      setPhase("done");
      setQueue([]);
      return;
    }
    setQueue(q);
    setOptions(buildOptions(activeGroup, q[0].i));
    setPicked(null);
  };

  const pick = (opt: string) => {
    if (picked !== null) return;
    setPicked(opt);
  };

  // 键盘：1–4 选项 / 回车继续 / P 重听 / Esc 退出
  useEffect(() => {
    if (phase !== "drill" || !currentWord) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (picked === null && idx < options.length) { e.preventDefault(); pick(options[idx]); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (picked !== null) advance();
      } else if (k === "p" || k === "r") {
        e.preventDefault(); speakFinnish(currentWord.word);
      } else if (e.key === "Escape") {
        e.preventDefault(); exitToPicker();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentWord, options, picked, queue]);

  // 组内新词自动读一遍（intro 翻卡时）
  useEffect(() => {
    if (activeGroup !== null && phase === "intro" && gw[introIndex]) {
      speakFinnish(gw[introIndex].word);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, phase, introIndex]);

  // —— 组选择界面 ——
  if (activeGroup === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-500" /> 分组背单词 · {title}
          </h4>
          <button onClick={onExit} className="text-xs font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> 退出
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          每组 {GROUP_SIZE} 个词，一组一组背：先快速过一遍，再做组内选择题——一个词<b>答对 {TARGET} 次</b>才毕业，答错会很快再出现。已完成 {completed.length}/{groups.length} 组。
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map((g, gi) => {
            const done = completed.includes(gi);
            return (
              <button
                key={gi}
                onClick={() => startGroup(gi)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  done ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                       : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">第 {gi + 1} 组</span>
                  {done && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{g.map(w => w.word).join("、")}</p>
                <p className="text-[10px] text-slate-400 mt-1">{g.length} 词{done ? " · 已完成" : ""}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // —— 组内完成界面 ——
  if (phase === "done") {
    const nextGi = activeGroup + 1;
    const hasNext = nextGi < groups.length;
    return (
      <div className="max-w-md mx-auto text-center space-y-5 py-8">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10 text-emerald-500" />
        </div>
        <h4 className="text-xl font-bold text-slate-800">第 {activeGroup + 1} 组完成！🎉</h4>
        <p className="text-sm text-slate-500">这 {gw.length} 个词你都答对了。休息一下，或继续下一组。</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {hasNext && (
            <button
              onClick={() => startGroup(nextGi)}
              className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              下一组（第 {nextGi + 1} 组）<ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={exitToPicker} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer">
            返回分组
          </button>
        </div>
      </div>
    );
  }

  // —— intro：快速过一遍本组 ——
  if (phase === "intro") {
    const w = gw[introIndex];
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-slate-500">
            第 {activeGroup + 1} 组 · 认识新词 ({introIndex + 1} / {gw.length})
          </span>
          <button onClick={exitToPicker} className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer">返回分组</button>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-md text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-4xl font-bold text-slate-800">{w.word}</h3>
            <SpeakButton text={w.word} size="md" />
          </div>
          <p className="text-xs text-slate-400 font-mono italic">{w.partOfSpeech}{w.keyInflections ? ` · ${w.keyInflections}` : ""}</p>
          <p className="text-lg font-bold text-slate-700">{w.translation}</p>
          {w.exampleSentence && (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 flex items-start gap-2 text-left">
              <SpeakButton text={w.exampleSentence} />
              <span>
                <span className="font-semibold text-slate-700">{w.exampleSentence}</span>
                {w.translationExample && <span className="block text-xs text-slate-400 mt-0.5">{w.translationExample}</span>}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={() => setIntroIndex(i => Math.max(0, i - 1))}
            disabled={introIndex === 0}
            className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-sm font-bold text-slate-600 cursor-pointer"
          >
            上一个
          </button>
          {introIndex < gw.length - 1 ? (
            <button
              onClick={() => setIntroIndex(i => i + 1)}
              className="px-4 py-2 rounded-xl bg-lake-blue-500 hover:bg-lake-blue-600 text-white text-sm font-bold cursor-pointer"
            >
              下一个
            </button>
          ) : (
            <button
              onClick={() => startDrill(activeGroup)}
              className="px-5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              开始闯关 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => startDrill(activeGroup)}
          className="w-full text-center text-xs text-slate-400 hover:text-violet-500 cursor-pointer"
        >
          跳过讲解，直接开始测验 →
        </button>
      </div>
    );
  }

  // —— drill：组内交错选择题 ——
  if (!currentWord) return null;
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
        <span className="text-xs font-bold text-slate-500">
          第 {activeGroup + 1} 组 · 闯关中 · 已掌握 {mastered} / {gw.length}
        </span>
        <button onClick={exitToPicker} className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer">返回分组</button>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(mastered / gw.length) * 100}%` }} />
      </div>

      <p className="hidden sm:block text-center text-[11px] text-slate-400">
        键盘：<b>1–4</b> 选项 · <b>回车</b> 继续 · <b>P</b> 重听 · <b>Esc</b> 退出
      </p>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-md text-center space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">这个词是什么意思？</span>
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-800">{currentWord.word}</h3>
            <SpeakButton text={currentWord.word} size="md" />
          </div>
        </div>

        <div className="grid gap-3">
          {options.map(opt => {
            const answered = picked !== null;
            const isCorrect = opt === currentWord.translation;
            const isPicked = opt === picked;
            let cls = "border-slate-200 hover:border-violet-400 hover:bg-violet-50/40 text-slate-700";
            if (answered && isCorrect) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
            else if (answered && isPicked && !isCorrect) cls = "border-red-300 bg-red-50 text-red-800";
            else if (answered) cls = "border-slate-100 text-slate-400";
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={answered}
                className={`w-full px-4 py-3 text-left text-sm font-semibold rounded-xl border transition-all ${answered ? "cursor-default" : "cursor-pointer"} ${cls}`}
              >
                {opt}
                {answered && isCorrect && <Check className="w-4 h-4 inline ml-2 -mt-0.5" />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="space-y-4 text-left pt-2 border-t border-slate-100">
            {picked !== currentWord.translation && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg p-3">
                ❌ 正确词义：<b>{currentWord.translation}</b>（这个词稍后会再出现）
              </p>
            )}
            {currentWord.exampleSentence && (
              <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <SpeakButton text={currentWord.exampleSentence} />
                <span>
                  <span className="font-semibold text-slate-800">{currentWord.exampleSentence}</span>
                  {currentWord.translationExample && <span className="block text-xs text-slate-400 mt-0.5">{currentWord.translationExample}</span>}
                </span>
              </div>
            )}
            <button
              onClick={advance}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm"
            >
              继续
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
