import { useState, useEffect } from "react";
import { VocabularyWord } from "../types";
import { saveDailySentence, loadDailySentences } from "../lib/sync";
import { 
  PenTool, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  AlertCircle, 
  ThumbsUp, 
  History,
  Check,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface DailySentenceProps {
  vocab: VocabularyWord[];
  user: any;
  onRefreshStats?: () => void;
}

// Rich fallback dictionary of standard verbs covering all 6 types
const RECOMMENDED_VERBS = [
  {
    word: "puhua",
    partOfSpeech: "动词",
    translation: "说话，说",
    exampleSentence: "Minä puhun suomea ystävieni kanssa.",
    translationExample: "我和我的朋友们一起说芬兰语。",
    keyInflections: "puhun, puhut, puhuu (Type 1)",
    inflections: {
      verbType: 1,
      conjugations: {
        minä: "puhun",
        sinä: "puhut",
        hän: "puhuu",
        me: "puhumme",
        te: "puhutte",
        he: "puhuvat"
      }
    }
  },
  {
    word: "syödä",
    partOfSpeech: "动词",
    translation: "吃",
    exampleSentence: "Me syömme terveellistä aamupalaa joka aamu.",
    translationExample: "我们每天早上吃健康的早餐。",
    keyInflections: "syön, syöt, syö (Type 2 -da/dä)",
    inflections: {
      verbType: 2,
      conjugations: {
        minä: "syön",
        sinä: "syöt",
        hän: "syö",
        me: "syömme",
        te: "syötte",
        he: "syövät"
      }
    }
  },
  {
    word: "tulla",
    partOfSpeech: "动词",
    translation: "来",
    exampleSentence: "Tuleeko hän kurssille huomenna?",
    translationExample: "他明天会来上课吗？",
    keyInflections: "tulen, tulet, tulee (Type 3 -la/na/ra/sta)",
    inflections: {
      verbType: 3,
      conjugations: {
        minä: "tulen",
        sinä: "tulet",
        hän: "tulee",
        me: "tulemme",
        te: "tulette",
        he: "tulevat"
      }
    }
  },
  {
    word: "tavata",
    partOfSpeech: "动词",
    translation: "见面，遇见",
    exampleSentence: "Tapaamme ystävät kahvilassa kello kuusi.",
    translationExample: "我们六点在咖啡馆和朋友见面。",
    keyInflections: "tapaan, tapaat, tapaa (Type 4 -ata/ätä kpt强变弱)",
    inflections: {
      verbType: 4,
      conjugations: {
        minä: "tapaan",
        sinä: "tapaat",
        hän: "tapaa",
        me: "tapaamme",
        te: "tapaatte",
        he: "tapaavat"
      }
    }
  },
  {
    word: "tarvita",
    partOfSpeech: "动词",
    translation: "需要",
    exampleSentence: "Tarvitsen uuden sanakirjan ja kynän.",
    translationExample: "我需要一本新词典和一支配字笔。",
    keyInflections: "tarvitsen, tarvitset, tarvitsee (Type 5 -ita/itä)",
    inflections: {
      verbType: 5,
      conjugations: {
        minä: "tarvitsen",
        sinä: "tarvitset",
        hän: "tarvitsee",
        me: "tarvitsemme",
        te: "tarvitsette",
        he: "tarvitsevat"
      }
    }
  },
  {
    word: "vanheta",
    partOfSpeech: "动词",
    translation: "变老，变旧，过期",
    exampleSentence: "Maito vanhenee jääkaapissa nopeasti.",
    translationExample: "牛奶在冰箱里很快就会过期。",
    keyInflections: "vanhenen, vanhenet, vanhenee (Type 6 -eta/etä)",
    inflections: {
      verbType: 6,
      conjugations: {
        minä: "vanhenen",
        sinä: "vanhenet",
        hän: "vanhenee",
        me: "vanhenemme",
        te: "vanhenette",
        he: "vanhenevat"
      }
    }
  },
  {
    word: "opiskella",
    partOfSpeech: "动词",
    translation: "学习，钻研",
    exampleSentence: "Opiskelen suomea ahkerasti joka päivä.",
    translationExample: "我每天都很勤奋地学习芬兰语。",
    keyInflections: "opiskelen, opiskelet, opiskelee (Type 3)",
    inflections: {
      verbType: 3,
      conjugations: {
        minä: "opiskelen",
        sinä: "opiskelet",
        hän: "opiskelee",
        me: "opiskelemme",
        te: "opiskelette",
        he: "opiskelevat"
      }
    }
  },
  {
    word: "mennä",
    partOfSpeech: "动词",
    translation: "去，前往",
    exampleSentence: "Menen bussilla yliopistolle.",
    translationExample: "我乘公交车去大学。",
    keyInflections: "menen, menet, menee (Type 3)",
    inflections: {
      verbType: 3,
      conjugations: {
        minä: "menen",
        sinä: "menet",
        hän: "menee",
        me: "menemme",
        te: "menette",
        he: "menevät"
      }
    }
  },
  {
    word: "juoda",
    partOfSpeech: "动词",
    translation: "喝",
    exampleSentence: "Juon kuumaa teetä, koska olen sairas.",
    translationExample: "我喝热茶，因为我病了。",
    keyInflections: "juon, juot, juo (Type 2)",
    inflections: {
      verbType: 2,
      conjugations: {
        minä: "juon",
        sinä: "juot",
        hän: "juo",
        me: "juomme",
        te: "juotte",
        he: "juovat"
      }
    }
  },
  {
    word: "ajaa",
    partOfSpeech: "动词",
    translation: "驾驶，骑",
    exampleSentence: "Hän ajaa autoa varovasti lumisella tiellä.",
    translationExample: "他在积雪的路上小心地开车。",
    keyInflections: "ajan, ajat, ajaa (Type 1)",
    inflections: {
      verbType: 1,
      conjugations: {
        minä: "ajan",
        sinä: "ajat",
        hän: "ajaa",
        me: "ajamme",
        te: "ajatte",
        he: "ajavat"
      }
    }
  }
];

export default function DailySentence({ vocab, user, onRefreshStats }: DailySentenceProps) {
  const [completedSentences, setCompletedSentences] = useState<any[]>([]);
  const [currentVerb, setCurrentVerb] = useState<any>(null);
  const [isUsingSystemVerbs, setIsUsingSystemVerbs] = useState(false);
  const [userSentence, setUserSentence] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeInput, setActiveInput] = useState(false);
  const [checkpoints, setCheckpoints] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);

  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Filter user's vocabulary to find verbs
  const userVerbs = vocab.filter(w => {
    const pos = (w.partOfSpeech || "").trim();
    return pos === "动词" || pos.toLowerCase().includes("verb") || pos.includes("v.");
  });

  // 2. Load today's completed sentences on mount / user change
  const loadTodayData = async () => {
    setLoading(true);
    try {
      const todayList = await loadDailySentences(user, todayStr);
      setCompletedSentences(todayList);
    } catch (err) {
      console.error("Error loading daily sentences:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, [user]);

  // 3. Select a verb to practice
  const selectRandomVerb = () => {
    setUserSentence("");
    setIsSubmitted(false);
    setCheckpoints({});

    const pool = (userVerbs.length > 0 && !isUsingSystemVerbs) ? userVerbs : RECOMMENDED_VERBS;
    
    if (pool.length === 0) {
      setCurrentVerb(null);
      return;
    }

    // Attempt to select a verb not already completed today
    const completedWords = completedSentences.map(s => s.verb.toLowerCase());
    const uncompletedPool = pool.filter(v => !completedWords.includes(v.word.toLowerCase()));

    const activePool = uncompletedPool.length > 0 ? uncompletedPool : pool;
    const randomIndex = Math.floor(Math.random() * activePool.length);
    setCurrentVerb(activePool[randomIndex]);
  };

  // Set initial verb when pool or history loads
  useEffect(() => {
    if (!currentVerb && (userVerbs.length > 0 || isUsingSystemVerbs || RECOMMENDED_VERBS.length > 0)) {
      selectRandomVerb();
    }
  }, [vocab, completedSentences, isUsingSystemVerbs]);

  const handleToggleSource = () => {
    setIsUsingSystemVerbs(!isUsingSystemVerbs);
    setCurrentVerb(null); // Triggers re-select
  };

  const handleInsertChar = (char: string) => {
    setUserSentence(prev => prev + char);
  };

  const handleTextareaFocus = () => {
    setActiveInput(true);
  };

  // Checkpoints list depending on the verb type
  const getCheckpointsList = () => {
    if (!currentVerb) return [];
    
    const verbType = currentVerb.inflections?.verbType || 1;
    const baseList = [
      "是否正确使用了动词变位（如 minä -> -n, hän -> 双写元音或不加后缀）",
      "句子拼写是否完全正确，且符合芬兰语语序（SVO主谓宾结构）",
      "是否注意到了 kpt 辅音强弱变化规则（如 t -> d, kk -> k, p -> v）"
    ];

    if (verbType === 1) {
      baseList.push("注意：Type 1 动词在变位时，词干元音为 -a/-ä 等，hän 人称需要双写词尾元音（如 puhuu）");
    } else if (verbType === 2) {
      baseList.push("注意：Type 2 动词以 -da/-dä 结尾，变位时去掉 -da/-dä 并加上人称词尾（如 syö -> syön）");
    } else if (verbType === 3) {
      baseList.push("注意：Type 3 动词以 -la/-na/-ra/-sta 结尾，变位时词尾双写元音或辅音变化，hän人称需要加 -e（如 tulla -> tulee）");
    } else if (verbType === 4) {
      baseList.push("注意：Type 4 动词以 -ata/-ätä 结尾，词干发生 kpt 弱变强（反向弱化，如 tavata -> tapaa）");
    } else if (verbType === 5) {
      baseList.push("注意：Type 5 动词以 -ita/-itä 结尾，变位词干加上 -itse- 后接人称词尾（如 tarvita -> tarvitsen）");
    } else if (verbType === 6) {
      baseList.push("注意：Type 6 动词以 -eta/-etä 结尾，变位词干加上 -ene- 后接人称词尾（如 vanheta -> vanhenen）");
    }

    baseList.push("句子中如果有宾语，是否正确使用了部分格（Partitiivi）或宾格（Akkusatiivi）？");
    return baseList;
  };

  const handleSubmitReview = () => {
    if (!userSentence.trim()) return;
    setIsSubmitted(true);
    
    // Initialize checkpoints as unchecked
    const list = getCheckpointsList();
    const initialChecks: { [key: string]: boolean } = {};
    list.forEach(item => {
      initialChecks[item] = false;
    });
    setCheckpoints(initialChecks);
  };

  const handleCheckpointToggle = (item: string) => {
    setCheckpoints(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleSaveAndNext = async () => {
    if (!currentVerb) return;

    const sentenceItem = {
      id: `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: user ? user.uid : "guest",
      date: todayStr,
      verb: currentVerb.word,
      translation: currentVerb.translation,
      userSentence: userSentence.trim(),
      reference: currentVerb.exampleSentence,
      referenceTranslation: currentVerb.translationExample,
      checkpoints: checkpoints,
      createdAt: new Date().toISOString()
    };

    try {
      await saveDailySentence(sentenceItem, user);
      
      // Update local state
      setCompletedSentences(prev => [...prev, sentenceItem]);
      
      // Callback to refresh dashboard counts
      if (onRefreshStats) {
        onRefreshStats();
      }

      // Move to next word
      setUserSentence("");
      setIsSubmitted(false);
      setCheckpoints({});
      setCurrentVerb(null); // forces selection
    } catch (err) {
      console.error("Failed to save daily sentence:", err);
      alert("保存失败，请稍后重试");
    }
  };

  // Render variables
  const sentencesCount = completedSentences.length;
  const isGoalReached = sentencesCount >= 10;
  const progressPercent = Math.min(100, (sentencesCount / 10) * 100);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Progress Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1.5 text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="p-2 bg-lake-blue-50 text-lake-blue-600 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">每日自主造句强化 (Päivittäinen virke)</h2>
          </div>
          <p className="text-xs text-slate-400">
            自主造句是克服 A2/B1 瓶颈最高效的手段。每天用已学或推荐动词造句 10 个，自查语法规则，不扣积分，自主练习！
          </p>
        </div>

        {/* Circular or linear progress meter */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500">今日造句进度</span>
            <span className="font-extrabold text-lake-blue-600 font-mono text-sm">
              {sentencesCount} / 10
            </span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGoalReached ? "bg-emerald-500" : "bg-lake-blue-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="text-center md:text-right">
            {isGoalReached ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> 今日 10 句目标达成！🎉
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">
                还差 {10 - sentencesCount} 句完成今日练习计划
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Practice Zone */}
      {currentVerb ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Work Card: 7 columns */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 flex-wrap gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-lake-blue-600 bg-lake-blue-50 px-2 py-0.5 rounded-full tracking-wider uppercase">
                  练习目标词 (Verbi)
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <h3 className="text-3xl font-extrabold text-slate-800 tracking-wide">
                    {currentVerb.word}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono italic">
                    ({currentVerb.partOfSpeech || "动词"})
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  释义：{currentVerb.translation}
                </p>
              </div>

              {/* Toggle verb source pool */}
              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={handleToggleSource}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  {isUsingSystemVerbs ? "切换为我的生词本动词" : "切换为系统推荐动词"}
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  来源：{isUsingSystemVerbs ? "系统内置 A2 重点动词" : `我的生词本 (${userVerbs.length} 个动词)`}
                </span>
              </div>
            </div>

            {/* Hint Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Sparkles className="w-4 h-4 text-lake-blue-500" />
                词形变化参考（可做造句参考）
              </div>
              <p className="text-xs text-slate-500 font-mono leading-relaxed bg-white/60 p-2.5 rounded-lg border border-slate-100">
                <b>关键人称形式：</b> {currentVerb.keyInflections || "请在右侧自查详细六人称变位大表"}
              </p>
            </div>

            {/* Input area */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  芬兰语造句输入区：
                </label>
                <textarea
                  rows={3}
                  value={userSentence}
                  onChange={(e) => setUserSentence(e.target.value)}
                  onFocus={handleTextareaFocus}
                  disabled={isSubmitted}
                  placeholder={`请使用动词 "${currentVerb.word}" 写出一个完整的芬兰语句子（例如：你可以结合不同人称、时态或地点格等）...`}
                  className="w-full p-4 text-base font-medium text-slate-800 placeholder:text-slate-300 border border-slate-200 focus:border-lake-blue-500 focus:ring-4 focus:ring-lake-blue-50 rounded-2xl resize-none focus:outline-none transition-all disabled:bg-slate-50/50 disabled:text-slate-500"
                ></textarea>
              </div>

              {/* Helper keyboards */}
              {!isSubmitted && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 shrink-0">
                    特殊字符：
                  </span>
                  <div className="flex gap-1 overflow-x-auto">
                    {finnishChars.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleInsertChar(c)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:border-lake-blue-500 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-sm"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit triggers */}
              {!isSubmitted ? (
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={selectRandomVerb}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    换一个动词
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={!userSentence.trim()}
                    className="px-6 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    提交自查 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pt-4 border-t border-slate-100 animate-fade-in">
                  
                  {/* Reference Display */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block">标准参考译文 & 地道例句</span>
                    <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1.5">
                      <p className="text-base font-extrabold text-emerald-800 leading-snug">
                        {currentVerb.exampleSentence}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        参考释义：{currentVerb.translationExample}
                      </p>
                    </div>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-lake-blue-500" />
                        对照右侧大变位与以下自查清单，给自己的句子打分：
                      </span>
                    </div>

                    <div className="space-y-2">
                      {getCheckpointsList().map((cp) => (
                        <button
                          key={cp}
                          onClick={() => handleCheckpointToggle(cp)}
                          className="w-full flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl text-left transition-all border border-transparent hover:border-slate-100 cursor-pointer text-xs"
                        >
                          <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                            checkpoints[cp] 
                              ? "bg-lake-blue-500 border-lake-blue-500 text-white" 
                              : "border-slate-300 bg-white"
                          }`}>
                            {checkpoints[cp] && <Check className="w-3 h-3" />}
                          </div>
                          <span className={`font-semibold ${checkpoints[cp] ? "text-slate-400 line-through font-medium" : "text-slate-700"}`}>
                            {cp}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submission and Finish */}
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      重新修改句子
                    </button>
                    <button
                      onClick={handleSaveAndNext}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      标记完成，练习下一句
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Reference Side Card: 5 columns */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Detailed Conjugation Table */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <HelpCircle className="w-4 h-4 text-lake-blue-500" />
                动词 6人称现在时变位大表
              </h4>

              {currentVerb.inflections?.conjugations ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { p: "minä (我)", key: "minä" },
                      { p: "sinä (你)", key: "sinä" },
                      { p: "hän (他/她)", key: "hän" },
                      { p: "me (我们)", key: "me" },
                      { p: "te (你们)", key: "te" },
                      { p: "he (他们)", key: "he" }
                    ].map((row) => {
                      const value = currentVerb.inflections.conjugations[row.key] || "-";
                      return (
                        <div key={row.key} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                          <span className="text-[10px] text-slate-400 block font-bold">{row.p}</span>
                          <span className="text-sm font-bold text-slate-800">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Infinitive summary if available */}
                  <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold">不定式演练形式 (Infinitive)：</p>
                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 border border-slate-100 text-[10px] font-mono leading-relaxed">
                      <p><b>第一不定式 (A-inf):</b> {currentVerb.word}</p>
                      <p><b>第二不定式 (E-inf):</b> {currentVerb.inflections.secondInfinitive?.inessive || "N/A"}</p>
                      <p><b>第三不定式 (MA-inf):</b> {currentVerb.inflections.thirdInfinitive?.illative || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs space-y-1.5">
                  <p>该动词暂无详细六人称变位缓存</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    （生词卡片导入时会自动通过 AI 缓存词形大表。当前词支持快速造句，可使用自查清单自主判分）
                  </p>
                </div>
              )}
            </div>

            {/* Double-Check Tips */}
            <div className="bg-gradient-to-br from-lake-blue-50 to-lake-blue-100 border border-lake-blue-100/50 rounded-2xl p-5 shadow-sm space-y-3 text-slate-800">
              <h4 className="text-xs font-bold text-lake-blue-700 uppercase tracking-wider flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" />
                造句提分小贴士：
              </h4>
              <ul className="text-xs space-y-2 list-disc pl-4 text-lake-blue-900/80 font-medium">
                <li>尝试加入否定句形式，例如 <b>en puhu, et syö, emme mene</b>，注意否定动词后的部分格变化！</li>
                <li>结合地点格，例如 <b>Helsingissä</b> (在赫尔辛基), <b>Suomesta</b> (来自芬兰)，丰富句子的实际意义。</li>
                <li>注意 Type 3 词干双写：{"tulla -> tulen ->"} hän <b>tulee</b>。</li>
              </ul>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <p className="text-sm font-semibold">未找到可用于练习的动词</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            系统没有加载到动词池。您可以选择上方按钮“切换为系统推荐动词”来激活内置动词库进行练习，或者前往“上传新课”模块添加包含动词的上课讲义。
          </p>
          <button
            onClick={handleToggleSource}
            className="px-4 py-2 bg-lake-blue-500 text-white hover:bg-lake-blue-600 text-xs font-bold rounded-xl shadow cursor-pointer mt-2"
          >
            开启系统推荐动词
          </button>
        </div>
      )}

      {/* 3. History Zone */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
          <History className="w-4 h-4 text-slate-500" />
          今日造句成果 ({sentencesCount} 句已完成)
        </h4>

        {sentencesCount === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs leading-relaxed space-y-1">
            <p>今天还没有写过任何句子呢 🍀</p>
            <p className="text-slate-400">开始挑选您的第一个动词，写下您今日的芬兰语第一句吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedSentences.map((s, index) => (
              <div 
                key={s.id || index} 
                className="p-4 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 space-y-2 transition-all"
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      目标词：<b className="text-lake-blue-600 font-sans text-sm">{s.verb}</b> ({s.translation})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    提交时间：{new Date(s.createdAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div className="space-y-1.5 pl-6 border-l-2 border-slate-200">
                  <p className="text-base font-bold text-slate-800 font-sans break-words select-all">
                    {s.userSentence}
                  </p>
                  <div className="text-xs text-slate-500 leading-snug">
                    <p className="font-semibold text-emerald-700">地道参考例句：{s.reference}</p>
                    <p className="text-[11px] text-slate-400">例句释义：{s.referenceTranslation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
