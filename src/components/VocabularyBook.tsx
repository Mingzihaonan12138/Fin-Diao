import { useState, Fragment } from "react";
import { VocabularyWord } from "../types";
import { calculateSM2, saveVocabularyReviewProgress, deleteVocabularyWord } from "../lib/sync";
import { 
  BookMarked, 
  Trash2, 
  RotateCcw, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  GraduationCap, 
  Clock, 
  Award, 
  Sparkles,
  AlertTriangle,
  Flame,
  Volume2
} from "lucide-react";

interface VocabularyBookProps {
  vocab: VocabularyWord[];
  user: any;
  onRefresh: () => void;
}

// 完整变格/变位展开面板
const fmtForm = (v?: string | string[]) => (Array.isArray(v) ? v.filter(Boolean).join(" / ") : v) || "—";
function FormCell({ label, value }: { label: string; value?: string | string[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 px-3 py-2">
      <div className="text-[10px] text-slate-400 font-bold">{label}</div>
      <div className="text-sm font-semibold text-slate-800 font-sans">{fmtForm(value)}</div>
    </div>
  );
}
function ParadigmPanel({ w }: { w: VocabularyWord }) {
  const inf = w.inflections;
  if (!inf) {
    return <p className="text-xs text-slate-400">这个词不变格（代词 / 副词等），直接记原形即可。</p>;
  }
  if (inf.conjugations) {
    const c = inf.conjugations;
    const t3 = inf.thirdInfinitive;
    return (
      <div className="space-y-3">
        <div className="text-xs font-bold text-lake-blue-700">动词 · 第 {inf.verbType ?? "?"} 类 · 现在时变位</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <FormCell label="minä" value={c.minä} />
          <FormCell label="sinä" value={c.sinä} />
          <FormCell label="hän" value={c.hän} />
          <FormCell label="me" value={c.me} />
          <FormCell label="te" value={c.te} />
          <FormCell label="he" value={c.he} />
        </div>
        {(inf.firstInfinitive || t3) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {inf.firstInfinitive && <FormCell label="第一不定式" value={inf.firstInfinitive} />}
            {t3?.illative && <FormCell label="第三不定式 -maan（去做）" value={t3.illative} />}
            {t3?.inessive && <FormCell label="-massa（正在做）" value={t3.inessive} />}
            {t3?.elative && <FormCell label="-masta（做完回来）" value={t3.elative} />}
            {t3?.adessive && <FormCell label="-malla（通过做）" value={t3.adessive} />}
            {t3?.abessive && <FormCell label="-matta（没做）" value={t3.abessive} />}
          </div>
        )}
      </div>
    );
  }
  if (inf.nounInflections) {
    const n = inf.nounInflections;
    return (
      <div className="space-y-2">
        <div className="text-xs font-bold text-lake-blue-700">名词 / 形容词 · 格变化</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <FormCell label="单数属格" value={n.singularGenitive} />
          <FormCell label="单数部分格" value={n.singularPartitive} />
          <FormCell label="复数主格" value={n.pluralNominative} />
          <FormCell label="复数属格" value={n.pluralGenitive} />
          <FormCell label="复数部分格" value={n.pluralPartitive} />
        </div>
      </div>
    );
  }
  return <p className="text-xs text-slate-400">暂无变格信息。</p>;
}

export default function VocabularyBook({ vocab, user, onRefresh }: VocabularyBookProps) {
  const [subTab, setSubTab] = useState<"book" | "mistakes">("book");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Spaced repetition state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewQueue, setReviewQueue] = useState<VocabularyWord[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gradingReview, setGradingReview] = useState(false);
  
  // Mistake practice state
  const [practiceMistakes, setPracticeMistakes] = useState(false);
  const [mistakeIndex, setMistakeIndex] = useState(0);
  const [mistakeInput, setMistakeInput] = useState("");
  const [mistakeChecked, setMistakeChecked] = useState(false);
  const [mistakeCorrect, setMistakeCorrect] = useState(false);
  const [mistakeActiveInput, setMistakeActiveInput] = useState(false);

  // Helper characters for Finnish
  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];

  // Filter words for active reviews (nextReviewAt <= now, or not reviewed yet)
  const pendingReviews = vocab.filter(w => {
    if (w.isMistake) return false; // Filter out mistakes
    if (!w.nextReviewAt) return true;
    return new Date(w.nextReviewAt) <= new Date();
  });
  const activeReviewQueue = reviewMode ? reviewQueue : pendingReviews;
  const currentReviewWord = activeReviewQueue[reviewIndex];

  // Filter for mistakes
  const mistakesList = vocab.filter(w => w.isMistake);

  const handleGradeSM2 = async (quality: number) => {
    if (gradingReview) return;
    const word = currentReviewWord;
    if (!word) {
      setReviewMode(false);
      setReviewIndex(0);
      setReviewQueue([]);
      return;
    }

    const { repetitions, easeFactor, intervalDays, nextReviewAt } = calculateSM2(
      quality,
      word.repetitions || 0,
      word.easeFactor || 2.5,
      word.intervalDays || 0
    );

    const reviewPatch = {
      repetitions,
      easeFactor,
      intervalDays,
      nextReviewAt,
      correctCount: quality >= 3 ? (word.correctCount || 0) + 1 : (word.correctCount || 0),
      incorrectCount: quality < 3 ? (word.incorrectCount || 0) + 1 : (word.incorrectCount || 0),
      ...(quality < 3 ? { isMistake: true } : word.isMistake !== undefined ? { isMistake: word.isMistake } : {}),
    };

    setGradingReview(true);
    try {
      await saveVocabularyReviewProgress(word, user, reviewPatch);
      await Promise.resolve(onRefresh());
      setShowAnswer(false);
      
      // Advance or end review session
      if (reviewIndex + 1 < activeReviewQueue.length) {
        setReviewIndex(reviewIndex + 1);
      } else {
        setReviewMode(false);
        setReviewIndex(0);
        setReviewQueue([]);
        alert("恭喜！您已完成了本次所有的待复习生词！💡");
      }
    } catch (err) {
      console.error(err);
      alert("保存复习结果失败，请稍后重试。如果您已登录，请检查网络或重新登录。");
    } finally {
      setGradingReview(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!window.confirm("确定要将这个词语从生词本永久删除吗？")) return;
    try {
      await deleteVocabularyWord(id, user);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Grade mistake test
  const handleCheckMistakeSpelling = () => {
    const current = mistakesList[mistakeIndex];
    if (!current) return;

    const isCorrect = mistakeInput.trim().toLowerCase() === current.word.trim().toLowerCase();
    setMistakeCorrect(isCorrect);
    setMistakeChecked(true);
  };

  const handleResolveMistake = async () => {
    const current = mistakesList[mistakeIndex];
    if (!current) return;

    // Mark mistake as resolved, but keep in standard vocabulary book
    try {
      await saveVocabularyReviewProgress(current, user, {
        repetitions: current.repetitions || 0,
        easeFactor: current.easeFactor || 2.5,
        intervalDays: current.intervalDays || 0,
        nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // schedule 1 day out
        correctCount: current.correctCount || 0,
        incorrectCount: current.incorrectCount || 0,
        isMistake: false,
      });
      onRefresh();
      
      // Advance or close
      setMistakeChecked(false);
      setMistakeInput("");
      
      if (mistakeIndex < mistakesList.length - 1) {
        // Since we resolved it, the length decreases. Keep same index or adjust
        // actually let's just keep same index as the next element will slide in
      } else {
        setPracticeMistakes(false);
        setMistakeIndex(0);
        alert("干得漂亮！本组错词全部重练完毕！🎉");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextMistake = () => {
    setMistakeChecked(false);
    setMistakeInput("");
    if (mistakeIndex + 1 < mistakesList.length) {
      setMistakeIndex(mistakeIndex + 1);
    } else {
      setPracticeMistakes(false);
      setMistakeIndex(0);
    }
  };

  const handleInsertCharToMistake = (char: string) => {
    setMistakeInput(prev => prev + char);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tab Triggers */}
      {!reviewMode && !practiceMistakes && (
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setSubTab("book")}
              className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer -mb-[2px] flex items-center gap-2 ${
                subTab === "book"
                  ? "border-lake-blue-500 text-lake-blue-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <BookMarked className="w-4 h-4" />
              我的生词本 ({vocab.filter(w => !w.isMistake).length})
            </button>
            <button
              onClick={() => setSubTab("mistakes")}
              className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer -mb-[2px] flex items-center gap-2 ${
                subTab === "mistakes"
                  ? "border-lake-blue-500 text-lake-blue-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              错词集锦 ({mistakesList.length})
            </button>
          </div>

          <div className="pb-2">
            {subTab === "book" && pendingReviews.length > 0 && (
              <button
                onClick={() => {
                  setReviewIndex(0);
                  setReviewQueue([...pendingReviews]);
                  setReviewMode(true);
                  setShowAnswer(false);
                }}
                className="px-4 py-2 bg-lake-blue-500 hover:bg-lake-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                开始今日间隔复习 ({pendingReviews.length} 个待复习)
              </button>
            )}

            {subTab === "mistakes" && mistakesList.length > 0 && (
              <button
                onClick={() => {
                  setMistakeIndex(0);
                  setPracticeMistakes(true);
                  setMistakeInput("");
                  setMistakeChecked(false);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                立即开始错词拼写重练
              </button>
            )}
          </div>
        </div>
      )}

      {/* REVIEW MODE: Spaced Repetition Review UI */}
      {reviewMode && currentReviewWord && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">
              间隔复习中 ({reviewIndex + 1} / {activeReviewQueue.length})
            </span>
            <button
              onClick={() => {
                setReviewMode(false);
                setReviewIndex(0);
                setReviewQueue([]);
                setShowAnswer(false);
              }}
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              退出复习
            </button>
          </div>

          {/* Core Word Flashcard */}
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-md text-center space-y-6 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-xs font-mono font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded">
              难度系数: {currentReviewWord.easeFactor || "2.5"}
            </div>

            <div className="space-y-3 py-6">
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">芬兰语单词</span>
              <h3 className="text-4xl md:text-5xl font-bold font-sans text-slate-800 tracking-wide">
                {currentReviewWord.word}
              </h3>
              <p className="text-xs text-slate-400 font-mono italic">
                {currentReviewWord.partOfSpeech} • {currentReviewWord.keyInflections}
              </p>
            </div>

            {/* Answer Display */}
            {!showAnswer ? (
              <div className="pt-6 border-t border-slate-50">
                <button
                  onClick={() => setShowAnswer(true)}
                  className="px-6 py-3 bg-lake-blue-500 hover:bg-lake-blue-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  显示中文释义与例句
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-6 border-t border-slate-50 animate-fade-in text-left">
                <div className="space-y-1.5 bg-slate-50 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">中文释义</span>
                  <p className="text-base font-bold text-slate-800">{currentReviewWord.translation}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">双语例句</span>
                  <div className="border-l-2 border-lake-blue-300 pl-4 space-y-1">
                    <p className="text-lg font-bold text-slate-800 leading-snug">
                      {currentReviewWord.exampleSentence}
                    </p>
                    <p className="text-xs text-slate-400">{currentReviewWord.translationExample}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <p>来源课程：<b>{currentReviewWord.sourceCourseTitle}</b></p>
                </div>

                {/* SM-2 grading buttons */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block text-center">
                    这个词记住了吗？
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: 5, label: "记住", sub: "轻松想起", bg: "bg-emerald-500 hover:bg-emerald-600 text-white" },
                      { val: 3, label: "模糊", sub: "费劲想起", bg: "bg-amber-500 hover:bg-amber-600 text-white" },
                      { val: 0, label: "不记得", sub: "完全忘了", bg: "bg-red-500 hover:bg-red-600 text-white" },
                    ].map((g) => (
                      <button
                        key={g.val}
                        onClick={() => handleGradeSM2(g.val)}
                        disabled={gradingReview}
                        className={`py-3 px-2 rounded-xl font-bold transition-[scale,box-shadow] hover:shadow active:scale-[0.96] text-center disabled:opacity-60 disabled:cursor-wait ${g.bg}`}
                      >
                        <span className="block text-base font-bold">{g.label}</span>
                        <span className="block text-[10px] opacity-90 font-medium">{g.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MISTAKE RETEST MODE */}
      {practiceMistakes && mistakesList.length > 0 && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">
              错词拼写挑战 ({mistakeIndex + 1} / {mistakesList.length})
            </span>
            <button
              onClick={() => setPracticeMistakes(false)}
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              退出挑战
            </button>
          </div>

          {/* Keyboard Helper */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1 shrink-0">
              键盘辅助：
            </span>
            <div className="flex gap-1.5 overflow-x-auto">
              {finnishChars.map((c) => (
                <button
                  key={c}
                  onClick={() => handleInsertCharToMistake(c)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-lake-blue-500 rounded-lg text-sm font-bold text-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-md text-center space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">请根据中文写出正确拼写：</span>
              <h3 className="text-2xl font-bold text-slate-800">{mistakesList[mistakeIndex].translation}</h3>
              <p className="text-xs text-slate-400 italic">
                词性: {mistakesList[mistakeIndex].partOfSpeech} • {mistakesList[mistakeIndex].keyInflections}
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-3 max-w-sm mx-auto">
              <input
                type="text"
                value={mistakeInput}
                onChange={(e) => setMistakeInput(e.target.value)}
                disabled={mistakeChecked}
                onKeyDown={(e) => e.key === "Enter" && !mistakeChecked && handleCheckMistakeSpelling()}
                className={`w-full px-4 py-3 text-center text-lg font-bold font-sans rounded-xl border focus:outline-none transition-all ${
                  mistakeChecked
                    ? mistakeCorrect
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-red-50 border-red-300 text-red-800 font-mono"
                    : "border-slate-200 focus:border-lake-blue-500 focus:ring-4 focus:ring-lake-blue-50"
                }`}
                placeholder="在此输入芬兰语拼写"
              />

              {!mistakeChecked ? (
                <button
                  onClick={handleCheckMistakeSpelling}
                  disabled={!mistakeInput.trim()}
                  className="w-full py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-200 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  核对拼写
                </button>
              ) : (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    mistakeCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {mistakeCorrect ? (
                      <p>🎉 拼写完全正确！芬兰语例句：<b>{mistakesList[mistakeIndex].exampleSentence}</b></p>
                    ) : (
                      <p>❌ 拼写错误。正确拼写应为：<b className="text-sm font-bold font-mono">{mistakesList[mistakeIndex].word}</b></p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    {mistakeCorrect ? (
                      <button
                        onClick={handleResolveMistake}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow"
                      >
                        <Check className="w-4 h-4" /> 移出错词本
                      </button>
                    ) : (
                      <button
                        onClick={handleNextMistake}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        继续下一个
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STANDARD DISPLAY: Vocabulary List */}
      {!reviewMode && !practiceMistakes && subTab === "book" && (
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          {vocab.filter(w => !w.isMistake).length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <BookMarked className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold">您的生词本目前空空如也</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                前往 <b>“上传新课”</b> 解析并加入单词，或者在历次练习中答错，词汇将自动汇总在这里。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-100">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">生词 & 变格</th>
                    <th className="py-3 px-4">词性</th>
                    <th className="py-3 px-4">中文释义</th>
                    <th className="py-3 px-4">例句</th>
                    <th className="py-3 px-4">复习情况</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vocab.filter(w => !w.isMistake).map((w) => {
                    const open = expandedId === w.id;
                    return (
                    <Fragment key={w.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setExpandedId(open ? null : w.id)}
                          className="flex items-start gap-1.5 text-left cursor-pointer group"
                          title="展开完整变格/变位"
                        >
                          <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 transition-transform ${open ? "rotate-90 text-lake-blue-500" : "text-slate-300"}`} />
                          <span>
                            <span className="block text-base font-bold text-slate-800 group-hover:text-lake-blue-600 transition-colors">{w.word}</span>
                            <span className="block text-[10px] font-semibold font-mono text-slate-400">{w.keyInflections}</span>
                          </span>
                        </button>
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500">{w.partOfSpeech}</td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-700">{w.translation}</td>
                      <td className="py-4 px-4 space-y-0.5">
                        <p className="text-sm font-medium text-slate-800 leading-relaxed">{w.exampleSentence}</p>
                        <p className="text-xs text-slate-400">{w.translationExample}</p>
                      </td>
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span>下期：{new Date(w.nextReviewAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2 text-[9px] font-bold text-slate-400">
                          <span className="bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded">
                            对 {w.correctCount || 0}
                          </span>
                          <span className="bg-red-50 text-red-500 px-1 py-0.5 rounded">
                            错 {w.incorrectCount || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteWord(w.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={6} className="px-6 pb-5 pt-1">
                          <ParadigmPanel w={w} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* STANDARD DISPLAY: Mistakes List */}
      {!reviewMode && !practiceMistakes && subTab === "mistakes" && (
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          {mistakesList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold">空空如也，您没有任何错词！</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                这是极其令人骄傲的成就！未来在随堂测试或专项演练中答错的生词，会在此自动归纳，帮助您逐一歼灭拼写死角。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-100">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">生词 & 变格</th>
                    <th className="py-3 px-4">词性</th>
                    <th className="py-3 px-4">中文释义</th>
                    <th className="py-3 px-4">错误率统计</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mistakesList.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 space-y-1">
                        <span className="text-base font-bold text-red-600">{w.word}</span>
                        <p className="text-[10px] font-semibold font-mono text-slate-400">{w.keyInflections}</p>
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500">{w.partOfSpeech}</td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-700">{w.translation}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 font-bold px-2.5 py-1 rounded-full border border-red-100">
                          拼写答错 {w.incorrectCount || 1} 次
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteWord(w.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
