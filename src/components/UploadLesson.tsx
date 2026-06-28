import React, { useState } from "react";
import { CourseNote, VocabularyWord, FillBlankQuestion, ConjugationTable, TranslationQuestion } from "../types";
import { loadCourseNotes, saveCourseNote, saveVocabularyWord, saveExerciseRecord } from "../lib/sync";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  Check, 
  Save, 
  Calendar, 
  AlertCircle, 
  BookMarked, 
  Play, 
  HelpCircle,
  PlusCircle,
  ThumbsUp,
  XCircle
} from "lucide-react";

interface UploadLessonProps {
  user: any;
  onNoteSaved: () => void;
  onVocabAdded: () => void;
}

export default function UploadLesson({ user, onNoteSaved, onVocabAdded }: UploadLessonProps) {
  const [textContent, setTextContent] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState("");

  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"points" | "grammar" | "vocab" | "exercise">("points");
  
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedVocabIds, setSavedVocabIds] = useState<string[]>([]);
  
  // Exercises state
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [blankAnswers, setBlankAnswers] = useState<{ [key: string]: string }>({});
  const [conjugationAnswers, setConjugationAnswers] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [translationChecked, setTranslationChecked] = useState<{ [key: string]: boolean }>({});
  const [translationChecks, setTranslationChecks] = useState<{ [key: string]: { [checkpoint: string]: boolean } }>({});
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);
  const [activeConjKey, setActiveConjKey] = useState<{ id: string; field: string } | null>(null);

  // Helper characters for Finnish
  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];

  const getSupplementCourseId = () => `course_ai_supplement_${user?.uid || "guest"}`;

  const isSupplementaryLookup = (result: any) => {
    if (!result || fileBase64) return false;
    const vocabularyCount = result.vocabulary?.length || 0;
    const grammarCount = result.grammarPoints?.length || 0;
    const exerciseCount =
      (result.exercises?.fillBlanks?.length || 0) +
      (result.exercises?.conjugations?.length || 0) +
      (result.exercises?.translations?.length || 0);

    return vocabularyCount > 0 && vocabularyCount <= 8 && grammarCount <= 2 && exerciseCount <= 6;
  };

  const uniqueByText = <T,>(items: T[], getKey: (item: T) => string) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = getKey(item).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Helper function to check if user's answer matches the correct answer (supports string or array of strings)
  const isAnswerCorrect = (userVal: string, correctVal: string | string[]): boolean => {
    if (!userVal || !correctVal) return false;
    const userClean = userVal.trim().toLowerCase();
    if (Array.isArray(correctVal)) {
      return correctVal.some(v => v.trim().toLowerCase() === userClean);
    }
    return String(correctVal).trim().toLowerCase() === userClean;
  };

  // Handle Drag & Drop / Click Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setError("");
    setFileName(file.name);
    setFileType(file.type);

    // Size limit 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小不能超过 10MB。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the raw base64 data part
      const base64Data = result.split(",")[1];
      setFileBase64(base64Data);
    };
    reader.onerror = () => {
      setError("读取文件失败，请重试。");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit to backend
  const handleParse = async () => {
    if (!fileBase64 && !textContent.trim()) {
      setError("请先上传文件（图片/PDF）或输入文本。");
      return;
    }

    setLoading(true);
    setError("");
    setParsedResult(null);
    setIsSaved(false);
    setSavedVocabIds([]);
    setExerciseSubmitted(false);
    setBlankAnswers({});
    setConjugationAnswers({});
    setTranslationChecked({});
    setTranslationChecks({});

    try {
      setLoadingStage("正在读取输入源...");
      
      const payload = {
        fileData: fileBase64,
        fileType: fileType,
        fileName: fileName,
        textContent: textContent.trim() || undefined
      };

      setLoadingStage("正在请求服务器密钥轮询池并联系 Gemini (可能会花费几秒钟)...");
      
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "请求失败");
      }

      setLoadingStage("正在解析并生成随堂测试题目...");
      setParsedResult(data);
      setCustomTitle(data.title || "芬兰语课程笔记");
      setActiveTab("points");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "解析失败，服务器连接异常，请重试。");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  // Save parsed result as "Course Note"
  const handleSaveNote = async () => {
    if (!parsedResult) return;
    try {
      const saveAsSupplement = isSupplementaryLookup(parsedResult);
      const courseId = saveAsSupplement ? getSupplementCourseId() : parsedResult.id || `course_${Date.now()}`;
      const existingSupplement = saveAsSupplement
        ? (await loadCourseNotes(user)).find((course) => course.id === courseId)
        : undefined;

      const mergedKeyPoints = existingSupplement
        ? uniqueByText([...(existingSupplement.keyPoints || []), ...(parsedResult.keyPoints || [])], String)
        : parsedResult.keyPoints || [];
      const mergedGrammarPoints = existingSupplement
        ? uniqueByText(
            [...(existingSupplement.grammarPoints || []), ...(parsedResult.grammarPoints || [])],
            (point) => `${point.title || ""}-${point.rule || ""}`
          )
        : parsedResult.grammarPoints || [];
      const mergedVocabulary = existingSupplement
        ? uniqueByText(
            [...(existingSupplement.vocabulary || []), ...(parsedResult.vocabulary || [])],
            (word) => word.word || ""
          )
        : parsedResult.vocabulary || [];
      const mergedExercises = existingSupplement
        ? {
            fillBlanks: uniqueByText(
              [...(existingSupplement.exercises?.fillBlanks || []), ...(parsedResult.exercises?.fillBlanks || [])],
              (question) => question.sentence || question.id || ""
            ),
            conjugations: uniqueByText(
              [...(existingSupplement.exercises?.conjugations || []), ...(parsedResult.exercises?.conjugations || [])],
              (table) => table.verb || table.id || ""
            ),
            translations: uniqueByText(
              [...(existingSupplement.exercises?.translations || []), ...(parsedResult.exercises?.translations || [])],
              (question) => question.chinese || question.finnish || question.id || ""
            ),
          }
        : parsedResult.exercises || { fillBlanks: [], conjugations: [], translations: [] };

      const fullNote: CourseNote = {
        id: courseId,
        userId: user ? user.uid : "guest",
        date: customDate,
        title: saveAsSupplement ? "零碎知识点 · AI 查词补充" : customTitle,
        keyPoints: mergedKeyPoints,
        grammarPoints: mergedGrammarPoints,
        vocabulary: mergedVocabulary,
        exercises: mergedExercises,
        createdAt: existingSupplement?.createdAt || new Date().toISOString(),
      };

      await saveCourseNote(fullNote, user);
      setIsSaved(true);
      onNoteSaved();
    } catch (err) {
      console.error(err);
      setError("保存课本失败，请重试。");
    }
  };

  // Add individual vocabulary word to book
  const handleAddWordToVocab = async (word: any) => {
    try {
      const wordId = `word_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const vocabWord: VocabularyWord = {
        id: wordId,
        word: word.word,
        partOfSpeech: word.partOfSpeech,
        translation: word.translation,
        exampleSentence: word.exampleSentence,
        translationExample: word.translationExample,
        keyInflections: word.keyInflections,
        sourceCourseId: isSupplementaryLookup(parsedResult) ? getSupplementCourseId() : parsedResult.id || "upload_note",
        sourceCourseTitle: isSupplementaryLookup(parsedResult) ? "零碎知识点 · AI 查词补充" : customTitle,
        addedAt: new Date().toISOString(),
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewAt: new Date().toISOString(),
        incorrectCount: 0,
        correctCount: 0,
        inflections: word.inflections,
      };

      await saveVocabularyWord(vocabWord, user);
      setSavedVocabIds(prev => [...prev, word.word]);
      onVocabAdded();
    } catch (err) {
      console.error(err);
    }
  };

  // Add ALL vocabulary words to book
  const handleAddAllToVocab = async () => {
    if (!parsedResult || !parsedResult.vocabulary) return;
    try {
      for (const word of parsedResult.vocabulary) {
        if (!savedVocabIds.includes(word.word)) {
          await handleAddWordToVocab(word);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Exercise: Submit and Grade Locally
  const handleExerciseSubmit = async () => {
    if (!parsedResult) return;
    
    let totalScore = 0;
    let totalQuestions = 0;
    const wrongWords: { word: string; pos: string; trans: string }[] = [];

    // 1. Grade blanks
    const fillBlanks = parsedResult.exercises?.fillBlanks || [];
    fillBlanks.forEach((q: FillBlankQuestion) => {
      totalQuestions++;
      const userAns = (blankAnswers[q.id] || "");
      if (isAnswerCorrect(userAns, q.answer)) {
        totalScore++;
      } else {
        // Find if this is in vocabulary to flag as mistake
        const cleanWord = q.sentence.match(/\((.*?)\)/)?.[1] || "";
        if (cleanWord) {
          wrongWords.push({ word: cleanWord, pos: "动词", trans: q.hint });
        }
      }
    });

    // 2. Grade conjugations
    const conjugations = parsedResult.exercises?.conjugations || [];
    conjugations.forEach((table: ConjugationTable) => {
      const pronouns = ["minä", "sinä", "hän", "me", "te", "he"];
      const tableAnswers = conjugationAnswers[table.id] || {};
      pronouns.forEach((p) => {
        totalQuestions++;
        const userAns = (tableAnswers[p] || "");
        const correctAns = (table.pronouns as any)[p];
        if (isAnswerCorrect(userAns, correctAns)) {
          totalScore++;
        } else {
          wrongWords.push({ word: table.verb, verbClass: table.verbClass } as any);
        }
      });
    });

    // 3. Translations (self checkpoints)
    const translations = parsedResult.exercises?.translations || [];
    translations.forEach((q: TranslationQuestion) => {
      totalQuestions++;
      // If user checked more than 60% of checkpoints, we count it as correct
      const checks = translationChecks[q.id] || {};
      const passedCount = q.selfCheckpoints.filter(cp => checks[cp]).length;
      if (passedCount >= q.selfCheckpoints.length * 0.6) {
        totalScore++;
      }
    });

    setExerciseSubmitted(true);

    // Save record to DB
    try {
      await saveExerciseRecord({
        id: `record_${Date.now()}`,
        userId: user ? user.uid : "guest",
        courseId: parsedResult.id || "upload_note",
        courseTitle: customTitle,
        date: new Date().toISOString().split("T")[0],
        score: totalScore,
        total: totalQuestions,
        details: {
          blankAnswers,
          conjugationAnswers,
          translationChecks
        }
      }, user);
    } catch (err) {
      console.error("Failed to save exercise record:", err);
    }
  };

  // Helper to insert character into active input box
  const handleInsertChar = (char: string) => {
    if (activeBlankId) {
      setBlankAnswers(prev => ({
        ...prev,
        [activeBlankId]: (prev[activeBlankId] || "") + char
      }));
    } else if (activeConjKey) {
      const { id, field } = activeConjKey;
      setConjugationAnswers(prev => {
        const tableAnswers = prev[id] || {};
        return {
          ...prev,
          [id]: {
            ...tableAnswers,
            [field]: (tableAnswers[field] || "") + char
          }
        };
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 1. Upload Form Card */}
      {!parsedResult && (
        <section className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">上传新的芬兰语材料</h3>
            <p className="text-xs text-slate-400 mt-1">
              支持上传 PPT 课件转换的 PDF、生词本拍照截图，或者直接将双语内容复制粘贴在下方。
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-semibold p-4 rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dual Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: File Drag & Drop */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 transition-all ${
                fileName ? "border-lake-blue-400 bg-lake-blue-50/10" : "border-slate-200 hover:border-lake-blue-300"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                fileName ? "bg-lake-blue-500 text-white" : "bg-slate-50 text-slate-400"
              }`}>
                {fileName ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">
                  {fileName ? fileName : "拖拽上传文件"}
                </p>
                <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  支持 <b>PDF、图片 (PNG/JPEG)</b>。为了最优的 AI 识别效果，Word 或 PPT 建议另存为 PDF 后上传。
                </p>
              </div>

              <label className="px-4 py-2 bg-lake-blue-50 text-lake-blue-600 hover:bg-lake-blue-100 font-semibold text-xs rounded-xl transition-all cursor-pointer">
                浏览文件
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              
              {fileName && (
                <button
                  type="button"
                  onClick={() => {
                    setFileName(null);
                    setFileType(null);
                    setFileBase64(null);
                  }}
                  className="text-[10px] text-red-500 hover:underline font-semibold"
                >
                  清除文件
                </button>
              )}
            </div>

            {/* Right Col: Text Copy Paste */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold text-slate-500">直接粘贴材料文本</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="在此粘贴双语生词列表、课文内容、或是语法例句..."
                className="w-full flex-1 min-h-[160px] p-4 text-sm rounded-2xl border border-slate-200 focus:border-lake-blue-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex justify-end">
            <button
              onClick={handleParse}
              disabled={loading || (!fileBase64 && !textContent.trim())}
              className="px-6 py-3 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在处理...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  一键 AI 精炼 & 随堂题生成
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Loading Screen Overlay */}
      {loading && (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-lake-blue-100 border-t-lake-blue-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-lake-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-slate-800">Gemini AI 正在解析归纳</h4>
            <p className="text-xs text-lake-blue-600 bg-lake-blue-50 px-4 py-2 rounded-xl font-medium max-w-md mx-auto">
              {loadingStage}
            </p>
          </div>
        </div>
      )}

      {/* 2. Extracted Results Display */}
      {parsedResult && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Note Info Headers & Save button */}
          <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 flex-1 w-full">
              {isSupplementaryLookup(parsedResult) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                  <BookMarked className="w-3.5 h-3.5" />
                  将汇总到固定卡片：零碎知识点 · AI 查词补充
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="text-xs font-semibold text-slate-500 focus:outline-none focus:underline"
                />
              </div>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="text-xl font-bold text-slate-800 w-full focus:outline-none focus:border-b focus:border-slate-300"
                placeholder="自定义课程名称"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setParsedResult(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                重新上传
              </button>
              
              <button
                onClick={handleSaveNote}
                disabled={isSaved}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all ${
                  isSaved 
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-700" 
                    : "bg-lake-blue-500 hover:bg-lake-blue-600 text-white"
                }`}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaved
                  ? "已保存到课本"
                  : isSupplementaryLookup(parsedResult)
                    ? "汇总到零碎知识点"
                    : "保存到课程笔记"}
              </button>
            </div>
          </section>

          {/* Extracted Tab Triggers */}
          <div className="flex border-b border-slate-200">
            {(["points", "grammar", "vocab", "exercise"] as const).map((tab) => {
              const label = {
                points: "本节要点",
                grammar: "语法规则",
                vocab: "本课生词",
                exercise: "随堂演练"
              }[tab];
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer -mb-[2px] ${
                    activeTab === tab
                      ? "border-lake-blue-500 text-lake-blue-600 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Extracted Tab Content */}
          <div className="space-y-6">
            
            {/* Tab 1: Key Points */}
            {activeTab === "points" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-base font-semibold text-slate-800">本节核心要点</h4>
                <ul className="space-y-3.5">
                  {(parsedResult.keyPoints || []).map((pt: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-lake-blue-50 text-lake-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab 2: Grammar Rules */}
            {activeTab === "grammar" && (
              <div className="space-y-4">
                {(parsedResult.grammarPoints || []).map((pt: any, idx: number) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        pt.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {pt.level}
                      </span>
                      <h4 className="text-base font-bold text-slate-800">{pt.title}</h4>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 text-xs font-medium text-slate-600 leading-relaxed">
                      {pt.rule}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">精选例句</p>
                      <div className="space-y-3">
                        {(pt.examples || []).map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="border-l-2 border-lake-blue-200 pl-4 space-y-1">
                            {/* ä ö å displays clearer and larger */}
                            <p className="text-lg font-medium text-slate-800 tracking-wide font-sans leading-snug">
                              {ex.finnish}
                            </p>
                            <p className="text-xs text-slate-400">{ex.chinese}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Vocabulary */}
            {activeTab === "vocab" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h4 className="text-base font-semibold text-slate-800">
                    本课生词统计 ({parsedResult.vocabulary?.length || 0} 个单词)
                  </h4>
                  <button
                    onClick={handleAddAllToVocab}
                    className="px-4 py-2 bg-lake-blue-50 text-lake-blue-600 hover:bg-lake-blue-100 text-xs font-semibold rounded-xl cursor-pointer transition-all inline-flex items-center gap-1"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    一键加入我的生词本
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm divide-y divide-slate-100">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">原形 & 变格</th>
                        <th className="py-3 px-4">词性</th>
                        <th className="py-3 px-4">中文释义</th>
                        <th className="py-3 px-4">例句</th>
                        <th className="py-3 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(parsedResult.vocabulary || []).map((w: any, idx: number) => {
                        const isAdded = savedVocabIds.includes(w.word);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 space-y-1">
                              <span className="text-base font-bold text-slate-800">{w.word}</span>
                              <p className="text-[10px] font-semibold font-mono text-slate-400">{w.keyInflections}</p>
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-slate-500">{w.partOfSpeech}</td>
                            <td className="py-4 px-4 text-sm font-medium text-slate-700">{w.translation}</td>
                            <td className="py-4 px-4 space-y-0.5">
                              <p className="text-sm font-medium text-slate-800 font-sans leading-relaxed">
                                {w.exampleSentence}
                              </p>
                              <p className="text-xs text-slate-400">{w.translationExample}</p>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleAddWordToVocab(w)}
                                disabled={isAdded}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  isAdded
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-500"
                                    : "border-slate-200 text-slate-400 hover:border-lake-blue-200 hover:text-lake-blue-600 hover:bg-lake-blue-50/10"
                                }`}
                                title={isAdded ? "已保存到生词本" : "加入我的生词本"}
                              >
                                {isAdded ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Exercises */}
            {activeTab === "exercise" && (
              <div className="space-y-6">
                
                {/* Shortcuts & helper character keyboard */}
                {(activeBlankId || activeConjKey) && (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 sticky top-4 z-40 animate-fade-in shadow-sm">
                    <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1 shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-lake-blue-500" />
                      芬兰语键盘助手：
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {finnishChars.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleInsertChar(c)}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-lake-blue-500 rounded-lg text-sm font-bold text-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* (a) Fill-in-the-blank questions */}
                {parsedResult.exercises?.fillBlanks?.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                    <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                      1. 填空输入正确词形
                    </h4>

                    <div className="space-y-5">
                      {parsedResult.exercises.fillBlanks.map((q: FillBlankQuestion, idx: number) => {
                        const userAns = blankAnswers[q.id] || "";
                        const isCorrect = isAnswerCorrect(userAns, q.answer);
                        return (
                          <div key={q.id} className="space-y-2 p-4 rounded-xl hover:bg-slate-50/50 transition-colors border border-transparent hover:border-slate-100">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-bold text-slate-400 mt-1">({idx + 1})</span>
                              <div className="space-y-1.5 flex-1">
                                <p className="text-base font-semibold text-slate-800 font-sans tracking-wide">
                                  {q.sentence.split("___").map((seg, i) => (
                                    <span key={i}>
                                      {seg}
                                      {i < q.sentence.split("___").length - 1 && (
                                        <input
                                          type="text"
                                          value={blankAnswers[q.id] || ""}
                                          onFocus={() => {
                                            setActiveBlankId(q.id);
                                            setActiveConjKey(null);
                                          }}
                                          onChange={(e) => setBlankAnswers({ ...blankAnswers, [q.id]: e.target.value })}
                                          disabled={exerciseSubmitted}
                                          className={`px-3 py-1 mx-2 text-center rounded-lg border font-bold text-sm transition-colors focus:outline-none w-32 ${
                                            exerciseSubmitted
                                              ? isCorrect
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                : "bg-red-50 border-red-200 text-red-600 font-mono"
                                              : activeBlankId === q.id
                                                ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                                : "border-slate-200"
                                          }`}
                                          placeholder="在此输入"
                                        />
                                      )}
                                    </span>
                                  ))}
                                </p>
                              </div>
                            </div>

                            {exerciseSubmitted && (
                              <div className={`ml-6 p-2.5 rounded-lg text-xs leading-relaxed ${
                                isCorrect ? "bg-emerald-50/50 text-emerald-700" : "bg-red-50/50 text-red-700"
                              }`}>
                                <div className="flex items-center gap-1 font-bold">
                                  {isCorrect ? <ThumbsUp className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                  {isCorrect ? "答对啦！" : `答错了。正确答案是: ${Array.isArray(q.answer) ? q.answer.join(" 或 ") : q.answer}`}
                                </div>
                                <p className="mt-1 text-slate-500 font-medium">提示：{q.hint}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* (b) Conjugation tables */}
                {parsedResult.exercises?.conjugations?.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                    <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                      2. 整张变位/变格表填写
                    </h4>

                    {parsedResult.exercises.conjugations.map((table: ConjugationTable) => (
                      <div key={table.id} className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-800">{table.title}</span>
                          <span className="text-xs bg-lake-blue-50 text-lake-blue-600 font-semibold px-2 py-0.5 rounded">
                            {table.verbClass}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {(["minä", "sinä", "hän", "me", "te", "he"] as const).map((pronoun) => {
                            const tableAns = conjugationAnswers[table.id] || {};
                            const userVal = tableAns[pronoun] || "";
                            const correctVal = (table.pronouns as any)[pronoun];
                            const isCorrect = isAnswerCorrect(userVal, correctVal);

                            return (
                              <div key={pronoun} className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <label className="text-[11px] font-bold text-slate-400 capitalize">{pronoun}</label>
                                <input
                                  type="text"
                                  value={userVal}
                                  onFocus={() => {
                                    setActiveConjKey({ id: table.id, field: pronoun });
                                    setActiveBlankId(null);
                                  }}
                                  onChange={(e) => {
                                    setConjugationAnswers({
                                      ...conjugationAnswers,
                                      [table.id]: {
                                        ...tableAns,
                                        [pronoun]: e.target.value
                                      }
                                    });
                                  }}
                                  disabled={exerciseSubmitted}
                                  placeholder={`${table.verb} ->`}
                                  className={`w-full px-3 py-1.5 text-center text-sm rounded-lg border font-semibold focus:outline-none focus:border-lake-blue-500 transition-colors ${
                                    exerciseSubmitted
                                      ? isCorrect
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        : "bg-red-50 border-red-100 text-red-600"
                                      : activeConjKey?.id === table.id && activeConjKey?.field === pronoun
                                        ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                        : "border-slate-200"
                                  }`}
                                />
                                {exerciseSubmitted && !isCorrect && (
                                  <p className="text-[10px] text-red-500 font-bold text-center mt-0.5">
                                    答案: {Array.isArray(correctVal) ? correctVal.join(" / ") : correctVal}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* (c) Translation checklist (A2 Default Self-Check) */}
                {parsedResult.exercises?.translations?.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                    <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                      3. 句子翻译/造句 (A2 级自查模式)
                    </h4>

                    <div className="space-y-6 divide-y divide-slate-100">
                      {parsedResult.exercises.translations.map((q: TranslationQuestion, idx: number) => {
                        const showAnswer = translationChecked[q.id];
                        const checks = translationChecks[q.id] || {};
                        return (
                          <div key={q.id} className={`space-y-3 ${idx > 0 ? "pt-5" : ""}`}>
                            <div className="flex gap-3">
                              <span className="text-sm font-bold text-slate-400">例 {idx + 1}</span>
                              <div className="space-y-2 flex-1">
                                <p className="text-sm font-semibold text-slate-700">翻译为芬兰语：</p>
                                <p className="text-base font-bold text-slate-800">{q.chinese}</p>
                                
                                <textarea
                                  placeholder="请在此写下您的翻译..."
                                  disabled={exerciseSubmitted}
                                  className="w-full p-4 border border-slate-200 focus:border-lake-blue-500 focus:outline-none rounded-xl text-sm min-h-[80px]"
                                />
                              </div>
                            </div>

                            {!showAnswer && !exerciseSubmitted ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setTranslationChecked({ ...translationChecked, [q.id]: true })}
                                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 text-slate-500" />
                                  提交翻译并进入自查
                                </button>
                              </div>
                            ) : (
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 ml-8 space-y-4 animate-fade-in">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">标准参考答案</span>
                                  <p className="text-base font-bold text-lake-blue-800 font-sans">{q.finnish}</p>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">对照自查清单 (对照打勾)</span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {(q.selfCheckpoints || []).map((cp) => (
                                      <label key={cp} className="flex items-start gap-2 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          disabled={exerciseSubmitted}
                                          checked={checks[cp] || false}
                                          onChange={(e) => {
                                            const tableChecks = translationChecks[q.id] || {};
                                            setTranslationChecks({
                                              ...translationChecks,
                                              [q.id]: {
                                                ...tableChecks,
                                                [cp]: e.target.checked
                                              }
                                            });
                                          }}
                                          className="mt-0.5 w-3.5 h-3.5 accent-lake-blue-500 rounded border-slate-200"
                                        />
                                        <span>{cp}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grade Submit bar */}
                <div className="flex justify-end">
                  <button
                    onClick={handleExerciseSubmit}
                    disabled={exerciseSubmitted}
                    className="px-6 py-3 bg-lake-blue-600 hover:bg-lake-blue-700 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {exerciseSubmitted ? "随堂分数已计入仪表盘" : "一键对错判分 & 提交成绩"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
