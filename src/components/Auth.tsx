import { useState } from "react";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { LogOut, Loader2, Sparkles } from "lucide-react";

interface AuthProps {
  user: any;
  loading: boolean;
  onEnterGuestMode: () => void;
  isGuest: boolean;
}

// Small inline Google "G" logo so we don't need an extra dependency.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function Auth({ user, loading, onEnterGuestMode, isGuest }: AuthProps) {
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setActionLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      let msg = "登录失败，请重试。";
      if (err.code === "auth/unauthorized-domain") {
        msg = "当前网址尚未被 Firebase 授权。请在 Firebase 控制台 Authentication → 设置 → 授权域 中添加本站域名后重试。";
      } else if (err.code === "auth/popup-blocked") {
        msg = "登录弹窗被浏览器拦截了，请允许弹窗后再试一次。";
      } else if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        msg = "登录窗口被关闭了，请重新点击登录。";
      }
      setError(msg);
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
          <div className="w-10 h-10 rounded-full bg-lake-blue-100 flex items-center justify-center text-lake-blue-600 font-bold text-lg overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.email?.substring(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">当前已登录账号</p>
            <p className="text-sm font-semibold text-slate-700">{user.displayName || user.email}</p>
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
            onClick={onEnterGuestMode} // toggles back to login screen in App
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white text-lake-blue-600 border border-lake-blue-200 hover:bg-lake-blue-100 rounded-xl transition-all cursor-pointer"
          >
            登录以同步云端
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
        <h2 className="text-2xl font-display font-semibold text-slate-800">芬兰语学习助手</h2>
        <p className="text-sm text-slate-400 mt-1">
          用 Google 账号登录，开启个性化间隔复习与多端同步
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 mb-4 animate-fade-in">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={actionLoading}
        className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
      >
        {actionLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <GoogleLogo /> 使用 Google 账号登录
          </>
        )}
      </button>

      <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col gap-3 text-center">
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
        <p className="text-[10px] text-slate-400">注意：访客模式下数据仅保存在浏览器本地，无法跨设备同步。</p>
      </div>
    </div>
  );
}
