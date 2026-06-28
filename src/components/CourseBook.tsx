import React, { useState } from "react";
import { CourseNote, VocabularyWord, FillBlankQuestion, ConjugationTable, TranslationQuestion } from "../types";
import { deleteCourseNote, saveVocabularyWord, saveExerciseRecord, saveCourseNote, loadVocabularyWords } from "../lib/sync";
import StickyNotes from "./StickyNotes";
import {
  BookOpen,
  Trash2,
  Calendar,
  ArrowLeft,
  BookMarked,
  Check,
  PlusCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  ThumbsUp,
  XCircle,
  Play,
  Upload,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface CourseBookProps {
  courses: CourseNote[];
  user: any;
  onRefresh: () => void;
  onVocabAdded: () => void;
}

export default function CourseBook({ courses, user, onRefresh, onVocabAdded }: CourseBookProps) {
  const [selectedCourse, setSelectedCourse] = useState<CourseNote | null>(null);
  const [activeTab, setActiveTab] = useState<"points" | "grammar" | "vocab" | "exercise">("points");
  
  // Exercise states for re-practicing
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [blankAnswers, setBlankAnswers] = useState<{ [key: string]: string }>({});
  const [conjugationAnswers, setConjugationAnswers] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [translationChecked, setTranslationChecked] = useState<{ [key: string]: boolean }>({});
  const [translationChecks, setTranslationChecks] = useState<{ [key: string]: { [checkpoint: string]: boolean } }>({});
  
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);
  const [activeConjKey, setActiveConjKey] = useState<{ id: string; field: string } | null>(null);
  const [revealAnswers, setRevealAnswers] = useState(false); // 学习模式：直接看答案
  
  const [savedVocabIds, setSavedVocabIds] = useState<string[]>([]);
  const [keyPointsExpanded, setKeyPointsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lessonVocabPracticeMode, setLessonVocabPracticeMode] = useState(false);
  const [lessonVocabPracticeIndex, setLessonVocabPracticeIndex] = useState(0);
  const [lessonVocabShowAnswer, setLessonVocabShowAnswer] = useState(false);
  const [lessonVocabStats, setLessonVocabStats] = useState({ remembered: 0, fuzzy: 0, forgotten: 0 });

  // JSON Import States
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");

  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];

  // Helper function to check if user's answer matches the correct answer (supports string or array of strings)
  const isAnswerCorrect = (userVal: string, correctVal: string | string[]): boolean => {
    if (!userVal || !correctVal) return false;
    const userClean = userVal.trim().toLowerCase();
    if (Array.isArray(correctVal)) {
      return correctVal.some(v => v.trim().toLowerCase() === userClean);
    }
    return String(correctVal).trim().toLowerCase() === userClean;
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这篇课程笔记吗？这将同时清空相关随堂记录。")) return;
    setDeletingId(id);
    try {
      await deleteCourseNote(id, user);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

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
        sourceCourseId: selectedCourse?.id || "course_note",
        sourceCourseTitle: selectedCourse?.title || "未命名笔记",
        addedAt: new Date().toISOString(),
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewAt: new Date().toISOString(),
        incorrectCount: 0,
        correctCount: 0,
      };

      await saveVocabularyWord(vocabWord, user);
      setSavedVocabIds(prev => [...prev, word.word]);
      onVocabAdded();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAllToVocab = async () => {
    if (!selectedCourse || !selectedCourse.vocabulary) return;
    try {
      for (const word of selectedCourse.vocabulary) {
        if (!savedVocabIds.includes(word.word)) {
          await handleAddWordToVocab(word);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExerciseSubmit = async () => {
    if (!selectedCourse) return;

    let totalScore = 0;
    let totalQuestions = 0;

    // Grade blanks
    const fillBlanks = selectedCourse.exercises?.fillBlanks || [];
    fillBlanks.forEach((q) => {
      totalQuestions++;
      const userAns = (blankAnswers[q.id] || "");
      if (isAnswerCorrect(userAns, q.answer)) {
        totalScore++;
      }
    });

    // Grade conjugations
    const conjugations = selectedCourse.exercises?.conjugations || [];
    conjugations.forEach((table) => {
      const pronouns = ["minä", "sinä", "hän", "me", "te", "he"];
      const tableAnswers = conjugationAnswers[table.id] || {};
      pronouns.forEach((p) => {
        totalQuestions++;
        const userAns = (tableAnswers[p] || "");
        const correctAns = (table.pronouns as any)[p];
        if (isAnswerCorrect(userAns, correctAns)) {
          totalScore++;
        }
      });
    });

    // Grade translations (self checked)
    const translations = selectedCourse.exercises?.translations || [];
    translations.forEach((q) => {
      totalQuestions++;
      const checks = translationChecks[q.id] || {};
      const passedCount = q.selfCheckpoints.filter(cp => checks[cp]).length;
      if (passedCount >= q.selfCheckpoints.length * 0.6) {
        totalScore++;
      }
    });

    setExerciseSubmitted(true);

    try {
      await saveExerciseRecord({
        id: `record_${Date.now()}`,
        userId: user ? user.uid : "guest",
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
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
      console.error(err);
    }
  };

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

  const startLessonVocabPractice = () => {
    setLessonVocabPracticeMode(true);
    setLessonVocabPracticeIndex(0);
    setLessonVocabShowAnswer(false);
    setLessonVocabStats({ remembered: 0, fuzzy: 0, forgotten: 0 });
  };

  const exitLessonVocabPractice = () => {
    setLessonVocabPracticeMode(false);
    setLessonVocabPracticeIndex(0);
    setLessonVocabShowAnswer(false);
  };

  const returnToCourseList = () => {
    setSelectedCourse(null);
    exitLessonVocabPractice();
  };

  const goToLessonVocabWord = (nextIndex: number) => {
    const words = selectedCourse?.vocabulary || [];
    if (nextIndex < 0 || nextIndex >= words.length) return;
    setLessonVocabPracticeIndex(nextIndex);
    setLessonVocabShowAnswer(false);
  };

  const handleLessonVocabGrade = (grade: "remembered" | "fuzzy" | "forgotten") => {
    if (!selectedCourse) return;
    const words = selectedCourse.vocabulary || [];
    setLessonVocabStats(prev => ({ ...prev, [grade]: prev[grade] + 1 }));
    setLessonVocabShowAnswer(false);

    if (lessonVocabPracticeIndex + 1 < words.length) {
      setLessonVocabPracticeIndex(prev => prev + 1);
    } else {
      setLessonVocabPracticeMode(false);
      setLessonVocabPracticeIndex(0);
      alert("本课随堂单词练习完成！");
    }
  };

  // Reset state on course selection or exit
  const handleSelectCourse = (course: CourseNote) => {
    setSelectedCourse(course);
    setActiveTab("points");
    setExerciseSubmitted(false);
    setBlankAnswers({});
    setConjugationAnswers({});
    setTranslationChecked({});
    setTranslationChecks({});
    setSavedVocabIds([]);
    setRevealAnswers(false);
    exitLessonVocabPractice();
  };

  if (selectedCourse) {
    const lessonVocabWords = selectedCourse.vocabulary || [];
    const currentLessonVocabWord = lessonVocabWords[lessonVocabPracticeIndex];

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* Back and summary row */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5 flex-1">
            <button
              onClick={returnToCourseList}
              className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回我的课本
            </button>
            <h3 className="text-xl font-bold text-slate-800">{selectedCourse.title}</h3>
            <p className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              创建于 {selectedCourse.date}
            </p>
          </div>
        </section>

        {/* Tab triggers */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {(["points", "grammar", "vocab", "exercise"] as const).map((tab) => {
            const label = {
              points: "本节要点",
              grammar: "语法规则",
              vocab: "随堂单词",
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
          <button
            onClick={returnToCourseList}
            className="mb-2 sm:mb-0 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-lake-blue-300 hover:text-lake-blue-600 text-xs font-bold text-slate-500 transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回课本列表
          </button>
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          
          {/* 1. Points */}
          {activeTab === "points" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                课程笔记已归档。语法点详细规则请前往「专项强化」→ 对应语法卡片查看。
              </p>
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setKeyPointsExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    本节笔记原文（{(selectedCourse.keyPoints || []).length} 条要点）
                  </span>
                  {keyPointsExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                    : <ChevronRight className="w-4 h-4 text-slate-400" />
                  }
                </button>
                {keyPointsExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <ul className="space-y-3">
                      {(selectedCourse.keyPoints || []).map((pt: string, idx: number) => (
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
              </div>

              <div className="pt-2">
                <StickyNotes
                  user={user}
                  targetType="course"
                  targetId={selectedCourse.id}
                  targetLabel={selectedCourse.title}
                  heading="我的心得便签"
                  hint="对这节课的总结、易混点或提醒——只贴在这节课上。"
                />
              </div>
            </div>
          )}

          {/* 2. Grammar Rules */}
          {activeTab === "grammar" && (
            <div className="space-y-4">
              {(selectedCourse.grammarPoints || []).map((pt: any, idx: number) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      pt.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                    }`}>
                      {pt.level}
                    </span>
                    <h4 className="text-base font-bold text-slate-800">{pt.title}</h4>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-5 text-[15px] font-medium text-slate-700 leading-7 whitespace-pre-line text-pretty">
                    {pt.rule}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">对照例句</p>
                    <div className="space-y-3">
                      {(pt.examples || []).map((ex: any, exIdx: number) => (
                        <div key={exIdx} className="border-l-2 border-lake-blue-200 pl-4 space-y-1">
                          <p className="text-lg font-medium text-slate-800 tracking-wide leading-snug">
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

          {/* 3. Vocabulary */}
          {activeTab === "vocab" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                <h4 className="text-base font-semibold text-slate-800">
                  词汇列表 ({selectedCourse.vocabulary?.length || 0} 个单词)
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={lessonVocabPracticeMode ? exitLessonVocabPractice : startLessonVocabPractice}
                    disabled={lessonVocabWords.length === 0}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {lessonVocabPracticeMode ? "退出本课练习" : "练习本课单词"}
                  </button>
                  <button
                    onClick={handleAddAllToVocab}
                    className="px-4 py-2 bg-lake-blue-50 text-lake-blue-600 hover:bg-lake-blue-100 text-xs font-semibold rounded-xl cursor-pointer transition-all inline-flex items-center gap-1"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    一键加入我的生词本
                  </button>
                </div>
              </div>

              {lessonVocabPracticeMode && currentLessonVocabWord ? (
                <div className="max-w-xl mx-auto space-y-5">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <span className="text-xs font-bold text-slate-500">
                      本课单词练习 ({lessonVocabPracticeIndex + 1} / {lessonVocabWords.length})
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      记住 {lessonVocabStats.remembered} · 模糊 {lessonVocabStats.fuzzy} · 不记得 {lessonVocabStats.forgotten}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => goToLessonVocabWord(lessonVocabPracticeIndex - 1)}
                      disabled={lessonVocabPracticeIndex === 0}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                    >
                      上一个
                    </button>
                    <button
                      onClick={() => goToLessonVocabWord(lessonVocabPracticeIndex + 1)}
                      disabled={lessonVocabPracticeIndex >= lessonVocabWords.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                    >
                      下一个
                    </button>
                    <button
                      onClick={exitLessonVocabPractice}
                      className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-bold text-red-500 transition-colors cursor-pointer"
                    >
                      返回随堂单词
                    </button>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-7 shadow-sm text-center space-y-6">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">随堂单词</span>
                      <h3 className="text-4xl md:text-5xl font-bold text-slate-800">
                        {currentLessonVocabWord.word}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono italic">
                        {currentLessonVocabWord.partOfSpeech} · {currentLessonVocabWord.keyInflections}
                      </p>
                    </div>

                    {!lessonVocabShowAnswer ? (
                      <button
                        onClick={() => setLessonVocabShowAnswer(true)}
                        className="px-6 py-3 bg-lake-blue-500 hover:bg-lake-blue-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
                      >
                        显示中文释义与例句
                      </button>
                    ) : (
                      <div className="space-y-5 pt-5 border-t border-slate-100 text-left animate-fade-in">
                        <div className="space-y-1.5 bg-slate-50 rounded-xl p-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">中文释义</span>
                          <p className="text-base font-bold text-slate-800">{currentLessonVocabWord.translation}</p>
                        </div>

                        <div className="border-l-2 border-lake-blue-300 pl-4 space-y-1">
                          <p className="text-lg font-bold text-slate-800 leading-snug">
                            {currentLessonVocabWord.exampleSentence}
                          </p>
                          <p className="text-xs text-slate-400">{currentLessonVocabWord.translationExample}</p>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500 block text-center">
                            这个词在本课里记住了吗？
                          </span>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { grade: "remembered" as const, label: "记住", sub: "轻松想起", bg: "bg-emerald-500 hover:bg-emerald-600" },
                              { grade: "fuzzy" as const, label: "模糊", sub: "费劲想起", bg: "bg-amber-500 hover:bg-amber-600" },
                              { grade: "forgotten" as const, label: "不记得", sub: "完全忘了", bg: "bg-red-500 hover:bg-red-600" },
                            ].map((g) => (
                              <button
                                key={g.grade}
                                onClick={() => handleLessonVocabGrade(g.grade)}
                                className={`py-3 px-2 rounded-xl font-bold text-white cursor-pointer transition-[scale,box-shadow] hover:shadow active:scale-[0.96] text-center ${g.bg}`}
                              >
                                <span className="block text-base">{g.label}</span>
                                <span className="block text-[10px] opacity-90 font-medium">{g.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">词原形 & 变格</th>
                      <th className="py-3 px-4">词性</th>
                      <th className="py-3 px-4">中文释义</th>
                      <th className="py-3 px-4">例句</th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedCourse.vocabulary || []).map((w: any, idx: number) => {
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
                            <p className="text-sm font-medium text-slate-800 leading-relaxed">
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
              )}
            </div>
          )}

          {/* 4. Exercises */}
          {activeTab === "exercise" && (
            <div className="space-y-6">

              <div className="flex justify-end">
                <button
                  onClick={() => setRevealAnswers(v => !v)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-[scale,background-color] active:scale-[0.96] cursor-pointer"
                  style={revealAnswers
                    ? { background: "#6189A6", color: "#fff", borderColor: "#6189A6" }
                    : { background: "#fff", color: "#4A7291", borderColor: "#D4E2EC" }}
                >
                  {revealAnswers ? "隐藏答案（自测模式）" : "显示答案（学习模式）"}
                </button>
              </div>

              {(activeBlankId || activeConjKey) && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 sticky top-4 z-40 animate-fade-in shadow-sm">
                  <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1 shrink-0">
                    芬兰语键盘助手：
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {finnishChars.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleInsertChar(c)}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-lake-blue-500 rounded-lg text-sm font-bold text-slate-800 transition-all cursor-pointer shadow-sm"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Blanks */}
              {selectedCourse.exercises?.fillBlanks?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                    1. 填空输入正确词形
                  </h4>

                  <div className="space-y-5">
                    {selectedCourse.exercises.fillBlanks.map((q, idx) => {
                      const userAns = blankAnswers[q.id] || "";
                      const isCorrect = isAnswerCorrect(userAns, q.answer);
                      return (
                        <div key={q.id} className="space-y-2 p-4 rounded-xl border border-transparent hover:bg-slate-50/50 hover:border-slate-100">
                          <p className="text-base font-semibold text-slate-800">
                            ({idx + 1}) {q.sentence.split("___").map((seg, i) => (
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
                                    className={`px-3 py-1 mx-2 text-center rounded-lg border font-bold text-sm focus:outline-none w-32 ${
                                      exerciseSubmitted
                                        ? isCorrect
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                          : "bg-red-50 border-red-200 text-red-600 font-mono"
                                        : activeBlankId === q.id
                                          ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                          : "border-slate-200"
                                    }`}
                                    placeholder="填入词形"
                                  />
                                )}
                              </span>
                            ))}
                          </p>
                          
                          {exerciseSubmitted && (
                            <div className={`ml-6 p-2.5 rounded-lg text-xs leading-relaxed ${
                              isCorrect ? "bg-emerald-50/50 text-emerald-700" : "bg-red-50/50 text-red-700"
                            }`}>
                              <div className="flex items-center gap-1 font-bold">
                                {isCorrect ? <ThumbsUp className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {isCorrect ? "打对啦！" : `答错了。正确变格是: ${Array.isArray(q.answer) ? q.answer.join(" 或 ") : q.answer}`}
                              </div>
                              <p className="mt-1 text-slate-500 font-medium font-sans">解释提示：{q.hint}</p>
                            </div>
                          )}

                          {revealAnswers && !exerciseSubmitted && (
                            <div className="ml-6 p-2.5 rounded-lg text-xs bg-lake-blue-50 text-lake-blue-700">
                              <span className="font-bold">答案：</span>
                              <b className="font-mono text-sm">{Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer}</b>
                              <span className="text-slate-500 ml-2">{q.hint}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conjugations */}
              {selectedCourse.exercises?.conjugations?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                    2. 变位/变格表测试
                  </h4>

                  {selectedCourse.exercises.conjugations.map((table) => (
                    <div key={table.id} className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-800">{table.title}</span>
                        <span className="text-xs bg-lake-blue-50 text-lake-blue-600 font-semibold px-2 py-0.5 rounded">
                          {table.verbClass}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(["minä", "sinä", "hän", "me", "te", "he"] as const).map((p) => {
                          const tableAns = conjugationAnswers[table.id] || {};
                          const userVal = tableAns[p] || "";
                          const correctVal = (table.pronouns as any)[p];
                          const isCorrect = isAnswerCorrect(userVal, correctVal);

                          return (
                            <div key={p} className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                              <label className="text-[11px] font-bold text-slate-400 capitalize">{p}</label>
                              <input
                                type="text"
                                value={userVal}
                                onFocus={() => {
                                  setActiveConjKey({ id: table.id, field: p });
                                  setActiveBlankId(null);
                                }}
                                onChange={(e) => {
                                  setConjugationAnswers({
                                    ...conjugationAnswers,
                                    [table.id]: {
                                      ...tableAns,
                                      [p]: e.target.value
                                    }
                                  });
                                }}
                                disabled={exerciseSubmitted}
                                className={`w-full px-3 py-1.5 text-center text-sm rounded-lg border font-semibold focus:outline-none focus:border-lake-blue-500 transition-colors ${
                                  exerciseSubmitted
                                    ? isCorrect
                                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                      : "bg-red-50 border-red-100 text-red-600"
                                    : activeConjKey?.id === table.id && activeConjKey?.field === p
                                      ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                      : "border-slate-200"
                                }`}
                              />
                              {((exerciseSubmitted && !isCorrect) || (revealAnswers && !exerciseSubmitted)) && (
                                <p className={`text-[10px] font-bold text-center mt-0.5 ${exerciseSubmitted ? "text-red-500" : "text-lake-blue-600"}`}>
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

              {/* Translations */}
              {selectedCourse.exercises?.translations?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lake-blue-500"></span>
                    3. 句子翻译/造句 (自查)
                  </h4>

                  <div className="space-y-6 divide-y divide-slate-100">
                    {selectedCourse.exercises.translations.map((q, idx) => {
                      const showAnswer = translationChecked[q.id];
                      const checks = translationChecks[q.id] || {};
                      return (
                        <div key={q.id} className={`space-y-3 ${idx > 0 ? "pt-5" : ""}`}>
                          <div className="flex gap-3">
                            <span className="text-sm font-bold text-slate-400">例 {idx + 1}</span>
                            <div className="space-y-2 flex-1">
                              <p className="text-base font-bold text-slate-800">{q.chinese}</p>
                              <textarea
                                placeholder="在脑海中想好或在此写下译文..."
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
                                提交对比参考答案与清单
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 ml-8 space-y-4 animate-fade-in">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">标准参考译法</span>
                                <p className="text-base font-bold text-lake-blue-800 font-sans">{q.finnish}</p>
                              </div>

                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">自查要点清单 (对照打勾)</span>
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

              {/* Submit / Retake */}
              <div className="flex justify-end">
                <button
                  onClick={handleExerciseSubmit}
                  disabled={exerciseSubmitted}
                  className="px-6 py-3 bg-lake-blue-600 hover:bg-lake-blue-700 disabled:bg-slate-200 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {exerciseSubmitted ? "随堂分数已提交" : "核对变格并提交得分"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={returnToCourseList}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-lake-blue-300 hover:text-lake-blue-600 text-xs font-bold text-slate-500 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回课本列表
          </button>
        </div>
      </div>
    );
  }

  const handleImportJson = async () => {
    setImportError("");
    setImportSuccess("");
    if (!importJsonText.trim()) {
      setImportError("请输入或粘贴要导入的词库 JSON 内容。");
      return;
    }

    setImporting(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(importJsonText.trim());
      } catch (jsonErr: any) {
        throw new Error(`JSON 语法解析错误: ${jsonErr.message}`);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("格式校验错误: 导入的 JSON 必须是一个对象。");
      }

      // —— 课程格式分支：直接是课程对象 / 课程数组 / { lessons: [...] } ——
      // （由 Claude + Omorfi 流水线产出，vocabulary 已是 App 内部结构，无需再映射）
      const lessonsArr: any[] | null = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as any).lessons)
          ? (parsed as any).lessons
          : ((parsed as any).vocabulary || (parsed as any).fillBlanks || (parsed as any).grammarPoints)
            ? [parsed]
            : null;
      if (lessonsArr) {
        let cc = 0;
        let vc = 0;
        for (const L of lessonsArr) {
          const cid = `course_${L.topic || "lesson"}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const course: CourseNote = {
            id: cid,
            userId: user ? user.uid : "guest",
            date: L.date || new Date().toISOString().split("T")[0],
            title: L.title || "导入课程",
            keyPoints: L.keyPoints || [],
            grammarPoints: L.grammarPoints || [],
            vocabulary: L.vocabulary || [],
            exercises: {
              fillBlanks: L.fillBlanks || L.exercises?.fillBlanks || [],
              conjugations: (L.conjugations || L.exercises?.conjugations || []).filter(
                (c: any) => c && c.pronouns && c.pronouns["minä"]
              ),
              translations: L.translations || L.exercises?.translations || [],
            },
            createdAt: new Date().toISOString(),
          };
          await saveCourseNote(course, user);
          cc++;
          for (const w of L.vocabulary || []) {
            if (!w || !w.word) continue;
            const vw: VocabularyWord = {
              id: `word_${String(w.word).trim().toLowerCase()}`,
              word: w.word,
              partOfSpeech: w.partOfSpeech || "",
              translation: w.translation || "",
              exampleSentence: w.exampleSentence || "",
              translationExample: w.translationExample || "",
              keyInflections: w.keyInflections || "",
              sourceCourseId: cid,
              sourceCourseTitle: course.title,
              addedAt: new Date().toISOString(),
              intervalDays: 0,
              easeFactor: 2.5,
              repetitions: 0,
              nextReviewAt: new Date().toISOString(),
              incorrectCount: 0,
              correctCount: 0,
              inflections: w.inflections ?? null, // 不变格的词(代词/副词)无 inflections，存 null 而非 undefined（Firestore 不接受 undefined）
            };
            await saveVocabularyWord(vw, user);
            vc++;
          }
        }
        setImportSuccess(`成功导入 ${cc} 节课、${vc} 个生词！可在下方课本列表与「生词错词」查看。`);
        setImportJsonText("");
        onRefresh();
        onVocabAdded();
        setTimeout(() => {
          setShowImportPanel(false);
          setImportSuccess("");
        }, 3500);
        return;
      }

      if (!parsed.lesson && (!parsed.words || !Array.isArray(parsed.words))) {
        throw new Error("格式校验错误: JSON 中必须含有课程字段（title/vocabulary）、'lesson' 对象或 'words' 数组。");
      }

      // Map unique words to avoid duplicate lemma upserts within the same import payload
      const uniqueImportWordsMap = new Map<string, any>();
      if (parsed.words && Array.isArray(parsed.words)) {
        for (const w of parsed.words) {
          if (w.lemma) {
            uniqueImportWordsMap.set(w.lemma.toLowerCase().trim(), w);
          } else {
            throw new Error("格式校验错误: 'words' 数组中的所有单词都必须包含 'lemma' 字段。");
          }
        }
      }
      const uniqueImportWords = Array.from(uniqueImportWordsMap.values());

      let courseId = `course_imported_${Date.now()}`;
      let lessonTitle = "未命名导入课程";

      // Helper function to map pos
      const mapPartOfSpeech = (pos: string): string => {
        if (!pos) return "其他";
        const p = pos.toLowerCase().trim();
        if (p === "verb" || p === "动词") return "动词";
        if (p === "noun" || p === "名词") return "名词";
        if (p === "adj" || p === "形容词" || p === "adjective") return "形容词";
        if (p === "adv" || p === "副词" || p === "adverb") return "副词";
        if (p === "pron" || p === "代词" || p === "pronoun") return "代词";
        if (p === "prep" || p === "介词" || p === "preposition") return "介词";
        if (p === "postp" || p === "后置词" || p === "postposition") return "后置词";
        return pos;
      };

      // Helper function to build key inflections string
      const constructKeyInflections = (word: any): string => {
        const forms = word.forms;
        if (!forms) return "";
        
        if (word.verbType && forms.present) {
          const p = forms.present;
          const m = Array.isArray(p.minä) ? p.minä[0] : p.minä;
          const s = Array.isArray(p.sinä) ? p.sinä[0] : p.sinä;
          const h = Array.isArray(p.hän) ? p.hän[0] : p.hän;
          return `${m || "-"}, ${s || "-"}, ${h || "-"} (Type ${word.verbType})`;
        } else if (forms.gen_sg || forms.part_sg) {
          const g = Array.isArray(forms.gen_sg) ? forms.gen_sg[0] : forms.gen_sg;
          const p = Array.isArray(forms.part_sg) ? forms.part_sg[0] : forms.part_sg;
          return `属格: ${g || "-"}, 部分格: ${p || "-"}`;
        }
        return "";
      };

      // Helper function to build word inflections object
      const buildWordInflections = (word: any): any => {
        const forms = word.forms;
        if (!forms) return undefined;
        
        const inflections: any = {
          word: word.lemma,
          partOfSpeech: mapPartOfSpeech(word.pos),
        };
        
        if (word.verbType !== undefined) {
          inflections.verbType = Number(word.verbType);
        }
        
        if (forms.present) {
          inflections.conjugations = {
            minä: forms.present.minä || "",
            sinä: forms.present.sinä || "",
            hän: forms.present.hän || "",
            me: forms.present.me || "",
            te: forms.present.te || "",
            he: forms.present.he || "",
          };
        }
        
        if (forms.inf1) {
          inflections.firstInfinitive = forms.inf1;
        }
        
        if (forms.inf2_ine || forms.inf2_ins) {
          inflections.secondInfinitive = {
            inessive: forms.inf2_ine || "",
            instructive: forms.inf2_ins || "",
          };
        }
        
        if (forms.inf3_ine || forms.inf3_ela || forms.inf3_ill || forms.inf3_ade || forms.inf3_abe) {
          inflections.thirdInfinitive = {
            inessive: forms.inf3_ine || "",
            elative: forms.inf3_ela || "",
            illative: forms.inf3_ill || "",
            adessive: forms.inf3_ade || "",
            abessive: forms.inf3_abe || "",
          };
        }
        
        if (forms.gen_sg || forms.gen_pl || forms.part_sg || forms.part_pl || forms.nom_pl) {
          inflections.nounInflections = {
            singularGenitive: forms.gen_sg || "",
            pluralGenitive: forms.gen_pl || "",
            singularPartitive: forms.part_sg || "",
            pluralPartitive: forms.part_pl || "",
            pluralNominative: forms.nom_pl || "",
          };
        }
        
        return inflections;
      };

      if (parsed.lesson) {
        const lesson = parsed.lesson;
        lessonTitle = lesson.title || "导入的课程";
        courseId = "course_imported_" + lessonTitle.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_");
        
        const mappedGrammarPoints = (lesson.grammar || []).map((pt: any, index: number) => {
          let ruleStr = pt.rule || "";
          if (pt.ending) ruleStr += `\n词尾特征: ${pt.ending}`;
          if (pt.pitfalls) ruleStr += `\n注意避坑: ${pt.pitfalls}`;
          if (pt.kpt) ruleStr += `\n涉及辅音弱化 (kpt)`;
          if (pt.source) ruleStr += `\n来源: ${pt.source}`;
          
          return {
            title: pt.point || `语法点 ${index + 1}`,
            level: pt.level === "B1" ? "B1" : "A2",
            rule: ruleStr,
            examples: (pt.examples || []).map((ex: any) => ({
              finnish: ex.fi || "",
              chinese: ex.zh || ""
            }))
          };
        });
        
        const courseVocabList = uniqueImportWords.map(word => ({
          word: word.lemma,
          partOfSpeech: mapPartOfSpeech(word.pos),
          translation: word.zh,
          exampleSentence: word.example?.fi || "",
          translationExample: word.example?.zh || "",
          keyInflections: constructKeyInflections(word),
          inflections: buildWordInflections(word),
        }));

        // Generate matching dynamic interactive exercise blanks & conjugations
        const fillBlanks: FillBlankQuestion[] = [];
        const conjugations: ConjugationTable[] = [];
        const translations: TranslationQuestion[] = [];
        
        const verbs = uniqueImportWords.filter(w => w.pos?.toLowerCase() === "verb" && w.forms?.present);
        verbs.slice(0, 3).forEach((v, index) => {
          const p = v.forms.present;
          const minäVal = Array.isArray(p.minä) ? p.minä[0] : p.minä;
          if (minäVal) {
            fillBlanks.push({
              id: `blank_imp_${index}`,
              sentence: `Minä ___ (${v.lemma}) suomea.`,
              answer: minäVal,
              hint: `人称 minä 的现在时变位形式`
            });
          }
          conjugations.push({
            id: `conj_imp_${index}`,
            title: `动词 '${v.lemma}' 现在时变位表`,
            verb: v.lemma,
            verbClass: v.verbType ? `Type ${v.verbType}` : "动词变位",
            pronouns: {
              minä: Array.isArray(p.minä) ? p.minä[0] : p.minä || "",
              sinä: Array.isArray(p.sinä) ? p.sinä[0] : p.sinä || "",
              hän: Array.isArray(p.hän) ? p.hän[0] : p.hän || "",
              me: Array.isArray(p.me) ? p.me[0] : p.me || "",
              te: Array.isArray(p.te) ? p.te[0] : p.te || "",
              he: Array.isArray(p.he) ? p.he[0] : p.he || "",
            }
          });
        });

        const nouns = uniqueImportWords.filter(w => (w.pos?.toLowerCase() === "noun" || w.pos?.toLowerCase() === "adj") && w.forms);
        nouns.slice(0, 2).forEach((n, index) => {
          const f = n.forms;
          const gs = Array.isArray(f.gen_sg) ? f.gen_sg[0] : f.gen_sg;
          if (gs) {
            fillBlanks.push({
              id: `blank_imp_n_${index}`,
              sentence: `Tämä on ___ (${n.lemma}) kirja.`,
              answer: gs,
              hint: `${n.lemma} 的单数属格 (genitiivi) 形式`
            });
          }
        });
        
        const fullNote: CourseNote = {
          id: courseId,
          userId: user ? user.uid : "guest",
          date: lesson.date || new Date().toISOString().split("T")[0],
          title: lessonTitle,
          keyPoints: lesson.summary || [],
          grammarPoints: mappedGrammarPoints,
          vocabulary: courseVocabList,
          exercises: {
            fillBlanks,
            conjugations,
            translations
          },
          createdAt: new Date().toISOString(),
        };

        await saveCourseNote(fullNote, user);
      }

      // Upsert words list into Firestore / localStorage (with SM-2 learning metrics preservation!)
      if (uniqueImportWords.length > 0) {
        const existingVocabs = await loadVocabularyWords(user);
        
        for (const word of uniqueImportWords) {
          const lemma = word.lemma;
          const pos = word.pos;
          const zh = word.zh;
          
          const existing = existingVocabs.find(v => v.word.toLowerCase() === lemma.toLowerCase().trim());
          
          let vocabWord: VocabularyWord;
          if (existing) {
            vocabWord = {
              ...existing,
              partOfSpeech: mapPartOfSpeech(pos),
              translation: zh,
              exampleSentence: word.example?.fi || "",
              translationExample: word.example?.zh || "",
              keyInflections: constructKeyInflections(word),
              sourceCourseId: courseId,
              sourceCourseTitle: lessonTitle,
              inflections: buildWordInflections(word) ?? null,
            };
          } else {
            const wordId = `word_${String(lemma).trim().toLowerCase()}`; // 按原型确定编号，与课程导入一致，避免重复
            vocabWord = {
              id: wordId,
              word: lemma,
              partOfSpeech: mapPartOfSpeech(pos),
              translation: zh,
              exampleSentence: word.example?.fi || "",
              translationExample: word.example?.zh || "",
              keyInflections: constructKeyInflections(word),
              sourceCourseId: courseId,
              sourceCourseTitle: lessonTitle,
              addedAt: new Date().toISOString(),
              intervalDays: 0,
              easeFactor: 2.5,
              repetitions: 0,
              nextReviewAt: new Date().toISOString(),
              incorrectCount: 0,
              correctCount: 0,
              inflections: buildWordInflections(word) ?? null,
            };
          }
          await saveVocabularyWord(vocabWord, user);
        }
      }

      setImportSuccess(`成功导入并更新了 ${uniqueImportWords.length} 个单词，并新增/覆盖了课程：'${lessonTitle}'！`);
      setImportJsonText("");
      onRefresh();
      onVocabAdded();
      
      // Auto close panel after 3 seconds
      setTimeout(() => {
        setShowImportPanel(false);
        setImportSuccess("");
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "导入解析失败，请检查您的 JSON 格式。");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">我的芬兰语课本</h3>
          <p className="text-xs text-slate-400 mt-1">
            这里归档了您所有已解析、总结的上课笔记与对应的课后生成习题。
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setShowImportPanel(!showImportPanel);
              setImportError("");
              setImportSuccess("");
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-lake-blue-300 hover:text-lake-blue-600 rounded-xl text-xs font-bold text-slate-600 shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {showImportPanel ? "收起导入面板" : "导入词库 JSON"}
          </button>
        </div>
      </div>

      {showImportPanel && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <AlertCircle className="w-4 h-4 text-lake-blue-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-bold text-slate-700">导入规则说明：</span>
              粘贴由外部权威工具（如 Omorfi）生成的词库 JSON，系统将自动解析。
              按 <strong>lemma 词原形去重且就地更新(upsert)</strong>，不会出现单词重复堆叠；若包含课程字段（lesson），将自动创建并更新对应的上课笔记。
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">词库 JSON 内容</label>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='在此粘贴您的词库 JSON (e.g. { "lesson": { ... }, "words": [ ... ] })'
              className="w-full h-44 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-lake-blue-500 bg-slate-50/50"
            />
          </div>

          {importError && (
            <div className="flex items-center gap-1.5 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              onClick={() => {
                setShowImportPanel(false);
                setImportJsonText("");
                setImportError("");
                setImportSuccess("");
              }}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleImportJson}
              disabled={importing}
              className="px-4.5 py-2 bg-lake-blue-600 hover:bg-lake-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-sm"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在导入中...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>开始解析导入</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <section className="bg-white border border-slate-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-slate-700">课本目前是空的</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              您还没有保存过课程笔记。请先前往 <b>“上传新课”</b> 上传 PPT 课件或材料，解析后点击“保存到课程笔记”即可归档在此处。
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelectCourse(c)}
              className="bg-white border border-slate-100 hover:border-lake-blue-300 hover:shadow-md/50 rounded-2xl p-5 shadow-sm space-y-4 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <h4 className="font-bold text-slate-800 text-base group-hover:text-lake-blue-600 transition-colors line-clamp-1">
                    {c.title}
                  </h4>
                  
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    disabled={deletingId === c.id}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer inline-flex shrink-0"
                    title="删除笔记"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{c.date}</span>
                </div>

                {/* Bullet point preview */}
                <div className="space-y-1 pt-1">
                  {(c.keyPoints || []).slice(0, 2).map((kp, idx) => (
                    <p key={idx} className="text-xs text-slate-500 truncate leading-relaxed">
                      • {kp}
                    </p>
                  ))}
                </div>
              </div>

              {/* Bottom statistics badges */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-2 text-[10px] font-bold">
                  <span className="bg-lake-blue-50 text-lake-blue-600 px-2 py-0.5 rounded">
                    {c.vocabulary?.length || 0} 生词
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {c.grammarPoints?.length || 0} 语法
                  </span>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                    配套练习
                  </span>
                </div>

                <span className="text-xs font-semibold text-lake-blue-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all">
                  看笔记/重练 <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
