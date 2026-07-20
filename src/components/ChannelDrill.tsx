import { useState, useEffect, useRef } from "react";
import { Check, Volume2 } from "lucide-react";
import SpeakButton, { speakFinnish } from "./SpeakButton";
import { CHANNEL_META, checkSpelling, type ChannelKey } from "../lib/channels";

// 单题渲染器：按通道决定题型，判分后回调 onAnswer(是否答对)。
// 生词本的「三通道强化」和课本的「分组背单词」共用同一个组件，题型和判分只有一份。
//   see   → 看芬兰语，四选一中文（原来的老题型）
//   hear  → 只放发音，打出芬兰语拼写（严格全等）
//   write → 看中文，打出芬兰语（严格全等）

export interface DrillWord {
  word: string;
  translation: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  translationExample?: string;
  keyInflections?: string;
}

interface ChannelDrillProps {
  word: DrillWord;
  channel: ChannelKey;
  /** see 通道的中文选项（已含正确项、已打乱） */
  options?: string[];
  onAnswer: (correct: boolean) => void;
  busy?: boolean;
  onExit?: () => void;
}

const FINNISH_CHARS = ["ä", "ö", "å"];

export default function ChannelDrill({
  word,
  channel,
  options = [],
  onAnswer,
  busy = false,
  onExit,
}: ChannelDrillProps) {
  const meta = CHANNEL_META[channel];
  const isTyping = channel === "hear" || channel === "write";

  const [picked, setPicked] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<{ correct: boolean; hint?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const answered = picked !== null || checked !== null;
  const isCorrect = picked !== null ? picked === word.translation : checked?.correct === true;

  // 换题：清空上一题的作答；打字题自动聚焦，听力题自动播一遍
  useEffect(() => {
    setPicked(null);
    setInput("");
    setChecked(null);
    if (isTyping) inputRef.current?.focus();
    if (channel === "hear") speakFinnish(word.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.word, channel]);

  // 答完之后反馈块（错因 + 完整词条 + 例句）会把「继续」顶到首屏之外，
  // 笔记本屏上得手动滚一下才看得到，所以判分后把它滚进视野。
  useEffect(() => {
    if (answered) {
      continueRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [answered]);

  const submit = () => {
    if (checked || !input.trim()) return;
    setChecked(checkSpelling(input, word.word));
  };

  const pick = (opt: string) => {
    if (answered) return;
    setPicked(opt);
  };

  const advance = () => {
    if (!answered || busy) return;
    onAnswer(isCorrect);
  };

  const insertChar = (c: string) => {
    if (checked) return;
    setInput(v => v + c);
    inputRef.current?.focus();
  };

  // 键盘：1–4 选项 / 回车（先判分再下一题）/ P 重听 / Esc 退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      const k = e.key.toLowerCase();

      if (e.key === "Enter") {
        e.preventDefault();
        if (isTyping && !checked) submit();
        else if (answered) advance();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onExit?.();
        return;
      }
      if (inField) return; // 输入框里打字时，下面的快捷键让位
      if (channel === "see" && ["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (!answered && idx < options.length) {
          e.preventDefault();
          pick(options[idx]);
        }
      } else if (k === "p" || k === "r") {
        e.preventDefault();
        speakFinnish(word.word);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, options, picked, checked, input, answered, busy, word.word]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
      {/* 通道标签 + 题干 */}
      <div className="text-center space-y-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-50 ${meta.color}`}
        >
          {meta.icon} {meta.label} · {meta.prompt}
        </span>

        {channel === "see" && (
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-800">{word.word}</h3>
            <SpeakButton text={word.word} size="md" />
          </div>
        )}

        {channel === "hear" && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => speakFinnish(word.word)}
              className="w-20 h-20 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="重听"
            >
              <Volume2 className="w-9 h-9 text-teal-600" />
            </button>
            <span className="text-[11px] text-slate-400">点击重听（或按 P）</span>
          </div>
        )}

        {channel === "write" && (
          <div className="space-y-1">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{word.translation}</h3>
            {word.partOfSpeech && (
              <p className="text-xs text-slate-400 font-mono italic">{word.partOfSpeech}</p>
            )}
          </div>
        )}
      </div>

      {/* 作答区 */}
      {channel === "see" ? (
        <div className="grid gap-3">
          {options.map(opt => {
            const right = opt === word.translation;
            const mine = opt === picked;
            let cls = "border-slate-200 hover:border-violet-400 hover:bg-violet-50/40 text-slate-700";
            if (answered && right) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
            else if (answered && mine) cls = "border-red-300 bg-red-50 text-red-800";
            else if (answered) cls = "border-slate-100 text-slate-400";
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={answered}
                className={`w-full px-4 py-3 text-left text-sm font-semibold rounded-xl border transition-all ${
                  answered ? "cursor-default" : "cursor-pointer"
                } ${cls}`}
              >
                {opt}
                {answered && right && <Check className="w-4 h-4 inline ml-2 -mt-0.5" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!!checked}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="用芬兰语拼出来…"
            className={`w-full px-4 py-3 text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors ${
              checked
                ? checked.correct
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-red-300 bg-red-50 text-red-800"
                : "border-slate-200 focus:border-violet-400 text-slate-800"
            }`}
          />
          {!checked && (
            <>
              <div className="flex justify-center gap-2">
                {FINNISH_CHARS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => insertChar(c)}
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-violet-100 text-lg font-bold text-slate-700 cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                onClick={submit}
                disabled={!input.trim()}
                className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm"
              >
                检查（回车）
              </button>
            </>
          )}
        </div>
      )}

      {/* 判分反馈 */}
      {answered && (
        <div className="space-y-3 text-left pt-2 border-t border-slate-100">
          {!isCorrect && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg p-3 space-y-1.5">
              <p>
                ❌ 正确答案：<b className="text-base">{channel === "see" ? word.translation : word.word}</b>
              </p>
              {checked?.hint && <p className="font-medium text-red-500">⚠️ {checked.hint}</p>}
            </div>
          )}
          {isCorrect && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg p-3">
              ✅ 正确
              {channel !== "see" && <b className="ml-1">{word.word}</b>}
            </p>
          )}

          {/* 答完统一亮出完整信息：拼写 + 词义 + 例句 */}
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <SpeakButton text={word.word} />
              <span className="font-bold text-slate-800">{word.word}</span>
              <span className="text-slate-500">{word.translation}</span>
            </div>
            {word.keyInflections && (
              <p className="text-[11px] text-slate-400 font-mono">{word.keyInflections}</p>
            )}
            {word.exampleSentence && (
              <div className="flex items-start gap-2 pt-1">
                <SpeakButton text={word.exampleSentence} />
                <span>
                  <span className="font-semibold text-slate-700">{word.exampleSentence}</span>
                  {word.translationExample && (
                    <span className="block text-xs text-slate-400 mt-0.5">{word.translationExample}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <button
            ref={continueRef}
            onClick={advance}
            disabled={busy}
            className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm"
          >
            {busy ? "保存中…" : "继续（回车）"}
          </button>
        </div>
      )}
    </div>
  );
}
