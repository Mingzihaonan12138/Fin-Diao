import { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Download,
  Save,
  Trash2,
  Loader2,
  Play,
  Pencil,
  Headphones,
  CloudOff,
  Cloud,
} from "lucide-react";
import { synthesizeFinnish, TtsVoice } from "../lib/tts";
import { Reading } from "../types";
import { loadReadings, saveReading, deleteReading } from "../lib/sync";

const VOICES: { id: TtsVoice; label: string }[] = [
  { id: "fi-FI-SelmaNeural", label: "Selma · 女声（自然，推荐）" },
  { id: "fi-FI-NooraNeural", label: "Noora · 女声" },
  { id: "fi-FI-HarriNeural", label: "Harri · 男声" },
];

// Firestore 单文档上限 1MiB；base64 超过这个长度就只存文本，播放时现合成（有 IndexedDB 缓存兜底）
const MAX_INLINE_B64 = 700_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.substring(dataUrl.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "audio/mpeg" });
}

interface ReaderProps {
  user: any;
}

export default function Reader({ user }: ReaderProps) {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<TtsVoice>("fi-FI-SelmaNeural");
  const [rate, setRate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: "ok" | "err" | "load" } | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    loadReadings(user).then(setReadings).catch(() => {});
  }, [user]);

  // 编辑区内容一变，上一次的合成结果就作废（避免"改了字下载/保存的还是旧音频"）
  const handleTextChange = (v: string) => {
    setText(v);
    setLastBlob(null);
  };

  const playBlob = (blob: Blob) => {
    const el = audioRef.current;
    if (!el) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    el.src = urlRef.current;
    el.play().catch(() =>
      setStatus({ msg: "浏览器拦截了自动播放，请点击播放器上的 ▶ 手动播放。", kind: "err" })
    );
  };

  const handleSpeak = async () => {
    const t = text.trim();
    if (!t) {
      setStatus({ msg: "请先输入芬兰语文本。", kind: "err" });
      return;
    }
    setBusy(true);
    setPlayingId(null);
    setStatus({ msg: "正在合成语音…", kind: "load" });
    try {
      const blob = await synthesizeFinnish(t, { voice, rate });
      setLastBlob(blob);
      playBlob(blob);
      setStatus({ msg: "✓ 合成完成，正在播放（已缓存，本机重播不耗额度）。", kind: "ok" });
    } catch (e: any) {
      setStatus({ msg: `合成失败：${e?.message || e}`, kind: "err" });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!lastBlob) return;
    const a = document.createElement("a");
    const url = URL.createObjectURL(lastBlob);
    a.href = url;
    a.download = `suomi_${Date.now()}.mp3`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSave = async () => {
    const t = text.trim();
    if (!t) {
      setStatus({ msg: "请先输入芬兰语文本。", kind: "err" });
      return;
    }
    setBusy(true);
    setStatus({ msg: "正在保存到听力库…", kind: "load" });
    try {
      let blob = lastBlob;
      if (!blob) {
        blob = await synthesizeFinnish(t, { voice, rate });
        setLastBlob(blob);
      }
      const b64 = await blobToBase64(blob);
      const inline = b64.length <= MAX_INLINE_B64;
      const firstLine = t.replace(/\s+/g, " ");
      const reading: Reading = {
        id: `reading-${Date.now()}`,
        title: firstLine.slice(0, 30) + (firstLine.length > 30 ? "…" : ""),
        text: t,
        voice,
        rate,
        ...(inline ? { audioB64: b64 } : {}),
        createdAt: new Date().toISOString(),
      };
      await saveReading(reading, user);
      setReadings(await loadReadings(user));
      setStatus({
        msg: inline
          ? "✓ 已存入听力库（含音频，跨设备随时听）。"
          : "✓ 已存入听力库（段落较长，只存了文本，播放时会即时合成）。",
        kind: "ok",
      });
    } catch (e: any) {
      setStatus({ msg: `保存失败：${e?.message || e}`, kind: "err" });
    } finally {
      setBusy(false);
    }
  };

  const handlePlaySaved = async (r: Reading) => {
    setPlayingId(r.id);
    try {
      let blob: Blob;
      if (r.audioB64) {
        blob = base64ToBlob(r.audioB64);
      } else {
        setStatus({ msg: "正在合成语音…", kind: "load" });
        blob = await synthesizeFinnish(r.text, { voice: r.voice as TtsVoice, rate: r.rate });
      }
      playBlob(blob);
      setStatus({ msg: `▶ 正在播放「${r.title}」`, kind: "ok" });
    } catch (e: any) {
      setStatus({ msg: `播放失败：${e?.message || e}`, kind: "err" });
      setPlayingId(null);
    }
  };

  const handleEditSaved = (r: Reading) => {
    setText(r.text);
    setVoice((VOICES.some(v => v.id === r.voice) ? r.voice : "fi-FI-SelmaNeural") as TtsVoice);
    setRate(r.rate ?? 0);
    setLastBlob(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSaved = async (r: Reading) => {
    if (!window.confirm(`确定删除「${r.title}」吗？`)) return;
    try {
      await deleteReading(r.id, user);
      setReadings(prev => prev.filter(x => x.id !== r.id));
      if (playingId === r.id) setPlayingId(null);
    } catch (e: any) {
      setStatus({ msg: `删除失败：${e?.message || e}`, kind: "err" });
    }
  };

  const rateLabel = rate === 0 ? "正常" : rate > 0 ? `+${rate}%` : `${rate}%`;
  const statusColor =
    status?.kind === "err" ? "text-red-500" : status?.kind === "ok" ? "text-emerald-600" : "text-lake-blue-600";

  return (
    <div className="space-y-6">
      {/* 输入与朗读 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-lake-blue-50 text-lake-blue-600 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">段落朗读 · Suomi TTS</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Azure 神经语音，发音接近真人 · 免费额度每月 50 万字符，缓存重播不消耗
            </p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Kirjoita tai liitä suomenkielinen teksti tähän…"
          rows={6}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-[15px] leading-relaxed text-slate-800 outline-none focus:border-lake-blue-400 focus:bg-white transition-colors resize-y"
        />
        <div className="text-right text-[11px] text-slate-400 mt-1 font-medium">{text.length} 字符</div>

        <div className="flex flex-wrap gap-4 mt-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-slate-500 mb-1.5">声音</label>
            <select
              value={voice}
              onChange={(e) => { setVoice(e.target.value as TtsVoice); setLastBlob(null); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-lake-blue-400 cursor-pointer"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-slate-500 mb-1.5">语速 · {rateLabel}</label>
            <input
              type="range"
              min={-40}
              max={40}
              step={5}
              value={rate}
              onChange={(e) => { setRate(Number(e.target.value)); setLastBlob(null); }}
              className="w-full accent-lake-blue-500 mt-2.5 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 mt-5">
          <button
            onClick={handleSpeak}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lake-blue-500 hover:bg-lake-blue-600 text-white text-sm font-extrabold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            朗读
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-extrabold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            存入听力库
          </button>
          <button
            onClick={handleDownload}
            disabled={!lastBlob}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-extrabold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            下载 MP3
          </button>
        </div>

        {status && <div className={`mt-3 text-sm font-semibold ${statusColor}`}>{status.msg}</div>}

        <audio ref={audioRef} controls className="w-full mt-4" />
      </div>

      {/* 听力库 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">我的听力库</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              保存过的段落，随时点开听{user ? "（云端同步，各设备可见）" : "（访客模式仅存本机）"}
            </p>
          </div>
        </div>

        {readings.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400 font-medium">
            还没有保存的段落——在上面粘贴一段芬兰语，点「存入听力库」。
          </div>
        ) : (
          <div className="space-y-2.5">
            {readings.map((r) => (
              <div
                key={r.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  playingId === r.id ? "border-lake-blue-300 bg-lake-blue-50/40" : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-800 truncate">{r.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400 font-medium">
                      <span>{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
                      <span>{r.text.length} 字符</span>
                      <span>{VOICES.find(v => v.id === r.voice)?.label.split(" ·")[0] || r.voice}</span>
                      <span className="inline-flex items-center gap-1">
                        {r.audioB64 ? (
                          <><Cloud className="w-3 h-3" /> 音频已存</>
                        ) : (
                          <><CloudOff className="w-3 h-3" /> 播放时合成</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePlaySaved(r)}
                      title="播放"
                      className="p-2 rounded-xl bg-lake-blue-500 hover:bg-lake-blue-600 text-white transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditSaved(r)}
                      title="载入编辑区"
                      className="p-2 rounded-xl text-slate-400 hover:text-lake-blue-600 hover:bg-lake-blue-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(r)}
                      title="删除"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="text-[11px] text-lake-blue-600 font-bold cursor-pointer select-none">
                    查看原文
                  </summary>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">{r.text}</p>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
