import { CourseNote, VocabularyWord, ExerciseRecord, UserStats } from "../types";
import { getDashboardStats } from "../lib/sync";
import { 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  GraduationCap, 
  Clock, 
  Sparkles, 
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
  
  // Format weekly practice count description
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-lake-blue-600 to-lake-blue-800 text-white rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
          <GraduationCap className="w-80 h-80" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Tervetuloa suomen kielen opiskeluun!
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Hei, {user ? user.email.split("@")[0] : "芬兰语学者"}!
          </h2>
          <p className="text-sm md:text-base text-lake-blue-100 max-w-xl">
            今天也是坚持攻克 A2 芬兰语的一天。在这里上传您的上课 PPT、笔记或图片，让 AI 帮您梳理出最地道的生词表、语法重点和自测题。
          </p>
        </div>
      </div>

      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today Reviews */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">今日待复习生词</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-slate-800">{stats.todayReviewCount}</span>
              <span className="text-xs text-slate-400 font-medium">个词语</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400">基于 SM-2 科学间隔记忆</span>
            <button
              onClick={() => onSelectTab("vocab")}
              className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              立即复习 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Weekly Exercise Volume */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">本周练习次数</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-slate-800">{stats.weeklyPracticeCount}</span>
              <span className="text-xs text-slate-400 font-medium">次完成</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400">过去7天的语法演练量</span>
            <button
              onClick={() => onSelectTab("practice")}
              className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              专项训练 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Total Notes */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">积累课程笔记</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-slate-800">{courses.length}</span>
              <span className="text-xs text-slate-400 font-medium">节课</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400">已提取语法与随堂考题</span>
            <button
              onClick={() => onSelectTab("upload")}
              className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              上传解析 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Daily Sentences Progress */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">今日自选造句</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-slate-800">{todaySentencesCount}</span>
              <span className="text-xs text-slate-400 font-medium">/ 10 句</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400">目标每日完成10句造句</span>
            <button
              onClick={() => onSelectTab("dailysentence")}
              className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              立即造句 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grammar Mastery & Recent Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grammar Point Mastery: Left 7 cols */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-lake-blue-500" />
              语法点掌握度 (A2/B1)
            </h3>
            <span className="text-xs text-slate-400">基于历次练习得分估算</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grammarPointsList.map((pt) => {
              const mastery = stats.grammarMastery[pt.key] || 0;
              return (
                <div key={pt.name} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">{pt.name}</span>
                    <span className="text-xs font-bold font-mono text-lake-blue-600">{mastery}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-lake-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${mastery}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`font-semibold px-1 rounded ${pt.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"}`}>
                      {pt.level}
                    </span>
                    <span className="text-slate-400">
                      {mastery >= 85 ? "完美掌握" : mastery >= 60 ? "基础通过" : "急需练习"}
                    </span>
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
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">尚无任何课程笔记</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    上传您的 A2 芬兰语上课 PPT 或笔记图片，AI 将帮您在此一键建立完整的课程归档。
                  </p>
                </div>
                <button
                  onClick={() => onSelectTab("upload")}
                  className="px-4 py-2 bg-lake-blue-50 text-lake-blue-600 hover:bg-lake-blue-100 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> 上传第一课
                </button>
              </div>
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
