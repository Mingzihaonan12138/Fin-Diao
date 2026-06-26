import React, { useState } from "react";
import { CourseNote, VocabularyWord } from "../types";
import { deleteCourseNote, saveVocabularyWord, saveExerciseRecord } from "../lib/sync";
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
  Loader2,
  ThumbsUp,
  XCircle,
  Play
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
  
  const [savedVocabIds, setSavedVocabIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];

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
      const userAns = (blankAnswers[q.id] || "").trim().toLowerCase();
      const correctAns = q.answer.trim().toLowerCase();
      if (userAns === correctAns) {
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
        const userAns = (tableAnswers[p] || "").trim().toLowerCase();
        const correctAns = (table.pronouns as any)[p].trim().toLowerCase();
        if (userAns === correctAns) {
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
  };

  if (selectedCourse) {
    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* Back and summary row */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5 flex-1">
            <button
              onClick={() => setSelectedCourse(null)}
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
        <div className="flex border-b border-slate-200">
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

        {/* Tab content */}
        <div className="space-y-6">
          
          {/* 1. Points */}
          {activeTab === "points" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="text-base font-semibold text-slate-800">课程核心内容</h4>
              <ul className="space-y-3.5">
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

                  <div className="bg-slate-50 rounded-xl p-4 text-xs font-medium text-slate-600 leading-relaxed">
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
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h4 className="text-base font-semibold text-slate-800">
                  词汇列表 ({selectedCourse.vocabulary?.length || 0} 个单词)
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
            </div>
          )}

          {/* 4. Exercises */}
          {activeTab === "exercise" && (
            <div className="space-y-6">
              
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
                      const isCorrect = userAns.trim().toLowerCase() === q.answer.trim().toLowerCase();
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
                                {isCorrect ? "打对啦！" : `答错了。正确变格是: ${q.answer}`}
                              </div>
                              <p className="mt-1 text-slate-500 font-medium font-sans">解释提示：{q.hint}</p>
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
                          const isCorrect = userVal.trim().toLowerCase() === correctVal.trim().toLowerCase();

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
                              {exerciseSubmitted && !isCorrect && (
                                <p className="text-[10px] text-red-500 font-bold text-center mt-0.5">
                                  答案: {correctVal}
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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-xl font-semibold text-slate-800">我的芬兰语课本</h3>
        <p className="text-xs text-slate-400 mt-1">
          这里归档了您所有已解析、总结的上课笔记与对应的课后生成习题。
        </p>
      </div>

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
