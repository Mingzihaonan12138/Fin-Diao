import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  loadCourseNotes, 
  loadVocabularyWords, 
  loadExerciseRecords,
  loadDailySentences
} from "./lib/sync";
import { CourseNote, VocabularyWord, ExerciseRecord } from "./types";

// Import modular components
import Dashboard from "./components/Dashboard";
import UploadLesson from "./components/UploadLesson";
import CourseBook from "./components/CourseBook";
import VocabularyBook from "./components/VocabularyBook";
import GrammarPractice from "./components/GrammarPractice";
import DailySentence from "./components/DailySentence";
import Settings from "./components/Settings";
import Reader from "./components/Reader";
import StickyNotes from "./components/StickyNotes";
import Auth from "./components/Auth";

// Icons
import {
  Compass,
  BookOpen,
  BookMarked,
  GraduationCap,
  Settings2,
  StickyNote,
  Loader2,
  Lock,
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  
  // App state
  const [activeTab, setActiveTab] = useState<string>("home");
  const [coursebookTab, setCoursebookTab] = useState<"notes" | "upload">("notes");
  const [practiceSubTab, setPracticeSubTab] = useState<"grammar" | "sentence" | "reader">("grammar");

  const handleSelectTab = (tabId: string) => {
    if (tabId === "upload") {
      setActiveTab("coursebook");
      setCoursebookTab("upload");
    } else if (tabId === "coursebook") {
      setActiveTab("coursebook");
      setCoursebookTab("notes");
    } else if (tabId === "practice") {
      setActiveTab("practice");
      setPracticeSubTab("grammar");
    } else if (tabId === "dailysentence") {
      setActiveTab("practice");
      setPracticeSubTab("sentence");
    } else {
      setActiveTab(tabId);
    }
  };

  const [courses, setCourses] = useState<CourseNote[]>([]);
  const [vocab, setVocab] = useState<VocabularyWord[]>([]);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [todaySentencesCount, setTodaySentencesCount] = useState(0);
  
  const [dataLoading, setDataLoading] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setIsGuest(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data (courses, vocab, records) on Auth or Guest status change
  const refreshData = async () => {
    if (!user && !isGuest) return;
    setDataLoading(true);
    try {
      const fetchedCourses = await loadCourseNotes(user);
      const fetchedVocab = await loadVocabularyWords(user);
      const fetchedRecords = await loadExerciseRecords(user);
      
      const todayStr = new Date().toISOString().split("T")[0];
      const fetchedSentences = await loadDailySentences(user, todayStr);
      
      setCourses(fetchedCourses);
      setVocab(fetchedVocab);
      setRecords(fetchedRecords);
      setTodaySentencesCount(fetchedSentences.length);
    } catch (err) {
      console.error("Failed to sync cloud data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user, isGuest]);

  const handleSelectCourseFromDashboard = (course: CourseNote) => {
    // We can pass this to trigger selected course viewing in CourseBook
    // To implement cleanly, let's select the "coursebook" tab.
    // CourseBook automatically handles detail displays inside.
    handleSelectTab("coursebook");
  };

  // Loading Screen for first time auth
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-lake-blue-600">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <h3 className="text-sm font-semibold tracking-wider font-display uppercase">Suomen oppiminen...</h3>
        <p className="text-xs text-slate-400 mt-1">正在加载芬兰语学习空间</p>
      </div>
    );
  }

  // Not logged in and not in Guest mode -> Show Login wall
  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Auth 
          user={null} 
          loading={false} 
          onEnterGuestMode={() => setIsGuest(true)} 
          isGuest={false} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EBE4D6] text-[#1C1A17] flex flex-col justify-between font-sans">
      
      {/* 1. Header (Nordic Navigation Rail) */}
      <header className="bg-[#F3EFE4] border-b border-[#D9D1C0] sticky top-0 z-50 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lake-blue-500 text-white font-extrabold flex items-center justify-center shadow-md shadow-lake-blue-100 text-sm">
              FI
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-[#1C1A17] leading-tight flex items-center gap-1.5">
                芬兰语学习
                <span className="text-[9px] font-bold bg-lake-blue-100 text-lake-blue-700 px-1.5 py-0.5 rounded uppercase">
                  A2→B1
                </span>
              </h1>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {[
              { id: "home", label: "学习首页", icon: Compass },
              { id: "coursebook", label: "我的课本", icon: BookOpen },
              { id: "vocab", label: "生词错词", icon: BookMarked },
              { id: "practice", label: "专项强化", icon: GraduationCap },
              { id: "notes", label: "心得便签", icon: StickyNote },
              { id: "settings", label: "系统设置", icon: Settings2 },
            ].map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === t.id
                      ? "bg-lake-blue-50 text-lake-blue-600"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* User profile capsule or guest sign-in button */}
          <div className="flex items-center gap-2.5">
            {dataLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-lake-blue-500" />
            )}
            
            {isGuest ? (
              <button
                onClick={() => setIsGuest(false)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> 注册同步
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-lake-blue-50 rounded-xl border border-lake-blue-100">
                <div className="w-5 h-5 rounded-full bg-lake-blue-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.email?.substring(0, 1).toUpperCase()}
                </div>
                <span className="text-[10px] font-bold text-lake-blue-800 max-w-[100px] truncate">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Area content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* Dynamic component routing based on activeTab */}
        <div className="space-y-6">
          {activeTab === "home" && (
            <Dashboard 
              courses={courses} 
              vocab={vocab} 
              records={records} 
              onSelectTab={handleSelectTab}
              onSelectCourse={handleSelectCourseFromDashboard}
              user={user}
              todaySentencesCount={todaySentencesCount}
            />
          )}

          {activeTab === "coursebook" && (
            <div className="space-y-6">
              {/* Inner Tabs for CourseBook */}
              <div className="flex bg-slate-100 p-1 rounded-2xl max-w-xs sm:max-w-sm">
                <button
                  onClick={() => setCoursebookTab("notes")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    coursebookTab === "notes"
                      ? "bg-white text-lake-blue-800 shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  我的课本
                </button>
                <button
                  onClick={() => setCoursebookTab("upload")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    coursebookTab === "upload"
                      ? "bg-white text-lake-blue-800 shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  AI 课文解析
                </button>
              </div>

              {coursebookTab === "notes" ? (
                <CourseBook 
                  courses={courses}
                  user={user}
                  onRefresh={refreshData}
                  onVocabAdded={refreshData}
                />
              ) : (
                <UploadLesson 
                  user={user}
                  onNoteSaved={refreshData}
                  onVocabAdded={refreshData}
                />
              )}
            </div>
          )}

          {activeTab === "vocab" && (
            <VocabularyBook 
              vocab={vocab}
              user={user}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "practice" && (
            <div className="space-y-6">
              {/* Inner Tabs for Practice */}
              <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm sm:max-w-md">
                {([
                  { id: "grammar", label: "语法专项" },
                  { id: "sentence", label: "每日造句" },
                  { id: "reader", label: "段落朗读" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPracticeSubTab(t.id)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                      practiceSubTab === t.id
                        ? "bg-white text-lake-blue-800 shadow-sm font-extrabold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {practiceSubTab === "grammar" && (
                <GrammarPractice
                  vocab={vocab}
                  user={user}
                  onRefreshStats={refreshData}
                />
              )}
              {practiceSubTab === "sentence" && (
                <DailySentence
                  vocab={vocab}
                  user={user}
                  onRefreshStats={refreshData}
                />
              )}
              {practiceSubTab === "reader" && <Reader user={user} />}
            </div>
          )}

          {activeTab === "notes" && (
            <StickyNotes
              user={user}
              targetType="board"
              heading="心得便签墙"
              hint="贴上你自己的总结、易混点、灵感——和课本里的笔记并行。点便签右下角圆点换颜色。"
            />
          )}

          {activeTab === "settings" && (
            <Settings
              user={user}
              loading={authLoading}
              onEnterGuestMode={() => setIsGuest(true)}
              isGuest={isGuest}
            />
          )}
        </div>
      </main>

      {/* 3. Mobile Navigation Bottom Rail (only visible on small viewports) */}
      <footer className="lg:hidden bg-[#F3EFE4] border-t border-[#D9D1C0] sticky bottom-0 z-50 shadow-lg">
        <div className="grid grid-cols-6 h-16">
          {[
            { id: "home", label: "首页", icon: Compass },
            { id: "coursebook", label: "课本", icon: BookOpen },
            { id: "vocab", label: "生词", icon: BookMarked },
            { id: "practice", label: "训练", icon: GraduationCap },
            { id: "notes", label: "便签", icon: StickyNote },
            { id: "settings", label: "设置", icon: Settings2 },
          ].map((t) => {
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTab(t.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === t.id
                    ? "text-lake-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <IconComp className="w-5 h-5 shrink-0" />
                <span className="text-[9px] font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      <footer className="hidden lg:block py-4 border-t border-[#D9D1C0] text-center text-xs text-slate-400 font-medium bg-[#F3EFE4]">
        Suomen oppiminen · A2-B1
      </footer>
    </div>
  );
}
