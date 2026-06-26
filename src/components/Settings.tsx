import React, { useState, useEffect } from "react";
import { Key, Shield, Plus, Trash2, CheckCircle, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import Auth from "./Auth";

interface SettingsProps {
  user: any;
  loading: boolean;
  onEnterGuestMode: () => void;
  isGuest: boolean;
}

export default function Settings({ user, loading, onEnterGuestMode, isGuest }: SettingsProps) {
  const [keys, setKeys] = useState<{ id: string; maskedKey: string; addedAt: string }[]>([]);
  const [newKey, setNewKey] = useState("");
  const [fetchingKeys, setFetchingKeys] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchKeys = async () => {
    setFetchingKeys(true);
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error("Failed to load Gemini keys:", err);
    } finally {
      setFetchingKeys(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    
    if (!newKey.trim()) return;
    if (!newKey.trim().startsWith("AIzaSy")) {
      setErrorMsg("无效的 Google Gemini API Key。格式应该以 'AIzaSy' 开头。");
      return;
    }

    setAddingKey(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("密钥已安全保存在服务器代理中！已自动合并进 API 密钥池中。");
        setNewKey("");
        fetchKeys();
      } else {
        setErrorMsg(data.error || "添加密钥失败。");
      }
    } catch (err: any) {
      setErrorMsg("服务器连接失败。");
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setSuccessMsg("");
    setErrorMsg("");
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMsg("密钥已从后台轮询池中移出。");
        fetchKeys();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "删除失败。");
      }
    } catch (err) {
      setErrorMsg("删除失败，网络异常。");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Account Section */}
      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-lake-blue-500" />
          账户信息
        </h3>
        <Auth 
          user={user} 
          loading={loading} 
          onEnterGuestMode={onEnterGuestMode} 
          isGuest={isGuest} 
        />
      </section>

      {/* 2. Key Pool Section */}
      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-lake-blue-500" />
              Gemini API 密钥池 (Round-Robin Proxy)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              由 Express 代理服务器统一调用，支持多密钥负载轮询。遭遇 429 速率限制时将自动切换。
            </p>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" />
            服务器安全防护激活
          </div>
        </div>

        {/* Explain Card */}
        <div className="bg-lake-blue-50/50 border border-lake-blue-100/60 rounded-xl p-4 flex gap-3 text-sm text-lake-blue-900">
          <HelpCircle className="w-5 h-5 text-lake-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-lake-blue-800">为什么要设置密钥池？</span>
            <p className="text-xs leading-relaxed text-lake-blue-600">
              免费或个人版 Gemini API 具有每分钟调用频率和每日总量限制 (429 Quota Exceeded)。
              通过在下方填入您向 Google AI Studio 申请的多个 API Key，我们的后端将在解析 PPT/PDF 上课资料时<b>自动轮询使用</b>这些密钥。
              如果某个 Key 报错限流，将<b>无缝且智能地秒级切换下一个</b>，极大地提高了解析的高可用性和容错率。
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium p-3.5 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-100 text-xs font-medium p-3.5 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Form to Add Key */}
        <form onSubmit={handleAddKey} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <input
              type="password"
              placeholder="输入新的 Gemini API Key (以 AIzaSy 开头)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-lake-blue-500 focus:outline-none transition-colors text-sm font-mono"
            />
            <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <button
            type="submit"
            disabled={addingKey || !newKey.trim()}
            className="px-5 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-200 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {addingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            添加密钥
          </button>
        </form>

        {/* Key List Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            当前服务器密钥池 ({keys.length + 1} 个密钥)
          </h4>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
            {/* Standard Key (Env key - not deletable) */}
            <div className="flex justify-between items-center px-4 py-3 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="font-mono text-xs font-medium text-slate-500">
                  SYSTEM_DEFAULT_KEY (系统内置主密钥)
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                  默认启用
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold italic">由 AI Studio 自动注入</span>
            </div>

            {/* Custom Keys */}
            {fetchingKeys ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span className="text-xs">正在拉取密钥池...</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="p-5 text-center text-slate-400 text-xs">
                没有额外添加的备用密钥。建议您添加 1-2 个备用 Key 以保障 AI 高频使用的稳定性。
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-lake-blue-400"></div>
                    <span className="font-mono text-xs font-medium text-slate-600">
                      {key.maskedKey}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      添加于 {new Date(key.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    disabled={deletingId === key.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="移出密钥池"
                  >
                    {deletingId === key.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
