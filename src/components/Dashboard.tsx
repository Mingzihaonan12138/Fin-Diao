import { useState } from "react";
import { CourseNote, VocabularyWord, ExerciseRecord } from "../types";
import { getDashboardStats } from "../lib/sync";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  TrendingUp,
  PlusCircle
} from "lucide-react";

interface DashboardProps {
  courses: CourseNote[];
  vocab: VocabularyWord[];
  records: ExerciseRecord[];
  onSelectTab: (tab: string) => void;
  onSelectCourse: (course: CourseNote) => void;
  user: any;
  todaySentencesCount?: number;
}

export default function Dashboard({
  courses,
  vocab,
  records,
  onSelectTab,
  onSelectCourse,
  user,
  todaySentencesCount = 0
}: DashboardProps) {
  const stats = getDashboardStats(vocab, records);
  const [showAllGrammar, setShowAllGrammar] = useState(false);

  const grammarPointsList = [
    { name: "动词变位 (Verbit 1-4)", key: "动词变位", level: "A2" },
    { name: "辅音弱化 (kpt-vaihtelu)", key: "辅音弱化", level: "A2" },
    { name: "单数部分格 (Partitiivi)", key: "单数部分格", level: "A2" },
    { name: "复数部分格 (Partitiivin monikko)", key: "复数部分格", level: "B1" },
    { name: "属格 (Genetiivi)", key: "属格", level: "A2" },
    { name: "地点格六件套 (Paikansijat)", key: "地点格六件套", level: "A2" },
    { name: "过去时 (Imperfekti)", key: "过去时", level: "A2" },
    { name: "条件式 (Konditionaali)", key: "条件式", level: "B1" },
  ];

  // Sort by mastery ascending, show weakest first
  const sortedGrammar = [...grammarPointsList].sort((a, b) =>
    (stats.grammarMastery[a.key] || 0) - (stats.grammarMastery[b.key] || 0)
  );
  const displayedGrammar = showAllGrammar ? sortedGrammar : sortedGrammar.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* One-line greeting */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-slate-700">
          Hei，{user ? user.email.split("@")[0] : "芬兰语学者"}！今天继续 A2 芬兰语。
        </p>
        <span className="text-xs font-bold text-slate-400 hidden sm:block">
          {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}
        </span>
      </div>

      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Reviews */}
        <button
          onClick={() => onSelectTab("vocab")}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left hover:border-lake-blue-200 hover:shadow-md transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">今日待复习</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl font-display font-bold text-slate-800">{stats.todayReviewCount}</span>
            <span className="text-xs text-slate-400">词</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">SM-2 间隔记忆</p>
        </button>

        {/* Card 2: Weekly Practice */}
        <button
          onClick={() => onSelectTab("practice")}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left hover:border-lake-blue-200 hover:shadow-md transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">本周练习</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl font-display font-bold text-slate-800">{stats.weeklyPracticeCount}</span>
            <span className="text-xs text-slate-400">次</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">过去7天</p>
        </button>

        {/* Card 3: Course Notes */}
        <button
          onClick={() => onSelectTab("coursebook")}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left hover:border-lake-blue-200 hover:shadow-md transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">课程笔记</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl font-display font-bold text-slate-800">{courses.length}</span>
            <span className="text-xs text-slate-400">节</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">已导入词库</p>
        </button>

        {/* Card 4: Daily Sentences */}
        <button
          onClick={() => onSelectTab("dailysentence")}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left hover:border-lake-blue-200 hover:shadow-md transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">今日造句</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl font-display font-bold text-slate-800">{todaySentencesCount}</span>
            <span className="text-xs text-slate-400">/ 10</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">每日目标</p>
        </button>
      </div>

      {/* Grammar Mastery & Recent Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grammar Point Mastery: Left 7 cols */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-lake-blue-500" />
              语法掌握度
            </h3>
            <button
              onClick={() => setShowAllGrammar(v => !v)}
              className="text-xs text-slate-400 hover:text-lake-blue-600 cursor-pointer transition-colors"
            >
              {showAllGrammar ? "收起" : "查看全部"}
            </button>
          </div>
          <div className="space-y-3">
            {displayedGrammar.map((pt) => {
              const mastery = stats.grammarMastery[pt.key] || 0;
              return (
                <div key={pt.name} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pt.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"}`}>
                        {pt.level}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{pt.name}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-lake-blue-600">{mastery}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-lake-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Course Notes: Right 5 cols */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-lake-blue-500" />
                最近课程笔记
              </h3>
              <button
                onClick={() => onSelectTab("coursebook")}
                className="text-xs font-medium text-slate-400 hover:text-lake-blue-600 transition-colors"
              >
                查看全部
              </button>
            </div>

            {courses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                暂无课程笔记。请在「课本」页导入词库 JSON 开始学习。
              </p>
            ) : (
              <div className="space-y-2">
                {courses.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCourse(c);
                      onSelectTab("coursebook");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:border-lake-blue-200 hover:bg-lake-blue-50/20 text-left transition-all cursor-pointer group"
                  >
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px] group-hover:text-lake-blue-600 transition-colors">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{c.date}</span>
                        <span>•</span>
                        <span>{c.vocabulary.length} 词</span>
                        <span>•</span>
                        <span>{c.grammarPoints.length} 语法</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-lake-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {courses.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => onSelectTab("upload")}
                className="w-full py-2.5 bg-lake-blue-50 hover:bg-lake-blue-100 text-lake-blue-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 添加新的上课材料
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
