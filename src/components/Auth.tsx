import React, { useState } from "react";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { LogIn, UserPlus, LogOut, Loader2, Sparkles } from "lucide-react";

interface AuthProps {
  user: any;
  loading: boolean;
  onEnterGuestMode: () => void;
  isGuest: boolean;
}

export default function Auth({ user, loading, onEnterGuestMode, isGuest }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setActionLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let chineseError = "认证失败，请检查您的输入。";
      if (err.code === "auth/email-already-in-use") {
        chineseError = "该邮箱已被注册。";
      } else if (err.code === "auth/invalid-email") {
        chineseError = "邮箱格式不正确。";
      } else if (err.code === "auth/weak-password") {
        chineseError = "密码太弱，至少需要6个字符。";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        chineseError = "邮箱或密码错误，请重试。";
      }
      setError(chineseError);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-lake-blue-600">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-sm font-medium">正在加载用户数据...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lake-blue-100 flex items-center justify-center text-lake-blue-600 font-bold text-lg">
            {user.email?.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">当前已登录账号</p>
            <p className="text-sm font-semibold text-slate-700">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={actionLoading}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border border-slate-200 hover:border-red-200 hover:text-red-500 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          退出登录
        </button>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="bg-lake-blue-50 border border-lake-blue-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lake-blue-100 flex items-center justify-center text-lake-blue-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-lake-blue-500 font-medium">当前状态</p>
            <p className="text-sm font-semibold text-lake-blue-800">离线访客模式 (数据存在浏览器本地)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEnterGuestMode} // This will toggle back to login screen in App
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white text-lake-blue-600 border border-lake-blue-200 hover:bg-lake-blue-100 rounded-xl transition-all cursor-pointer"
          >
            登录/注册以同步云端
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-8 my-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-lake-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-sm">
          FI
        </div>
        <h2 className="text-2xl font-display font-semibold text-slate-800">
          {isRegister ? "创建你的芬兰语笔记本" : "芬兰语学习助手"}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {isRegister ? "加入同步练习与生词，多端同步，不再遗忘" : "输入账号登录，开启个性化间隔复习与 AI 提炼"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 mb-4 animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">邮箱地址</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-lake-blue-500 focus:outline-none transition-colors text-sm"
            placeholder="your-email@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">登录密码</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-lake-blue-500 focus:outline-none transition-colors text-sm"
            placeholder="至少 6 位字符"
          />
        </div>

        <button
          type="submit"
          disabled={actionLoading}
          className="w-full py-3 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-200 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRegister ? (
            <>
              <UserPlus className="w-4 h-4" /> 注册账号
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" /> 立即登录
            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col gap-3 text-center">
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 transition-colors"
        >
          {isRegister ? "已有账号？立即登录" : "还没有账号？免费注册一个"}
        </button>
        
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative bg-white px-3 text-xs text-slate-400">或者</span>
        </div>

        <button
          type="button"
          onClick={onEnterGuestMode}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          进入离线访客模式 ☕
        </button>
        <p className="text-[10px] text-slate-400">注意：访客模式下数据仅保存在浏览器 localStore，无法跨设备同步。</p>
      </div>
    </div>
  );
}
