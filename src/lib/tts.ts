// 芬兰语朗读统一出口：优先 Azure 神经语音（经 /api/tts 代理，发音接近真人），
// 音频按 voice|rate|text 存 IndexedDB——同一内容第二次播放不再调 Azure，
// 既省免费额度（F0 每月 50 万字符）又秒开。Azure 不可用时自动降级浏览器 TTS。

export type TtsVoice = "fi-FI-SelmaNeural" | "fi-FI-NooraNeural" | "fi-FI-HarriNeural";

export interface TtsOptions {
  voice?: TtsVoice;
  rate?: number; // Azure prosody 语速百分比，-40 ~ +40
}

const DEFAULT_VOICE: TtsVoice = "fi-FI-SelmaNeural";
const WORD_RATE = -10; // 单词/例句稍慢一点，便于跟读（对应旧浏览器 TTS 的 rate 0.9）

// ---------- IndexedDB 音频缓存 ----------

const DB_NAME = "fi_tts_cache";
const STORE = "audio";
let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function getCachedAudio(key: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    return await new Promise<Blob | null>((resolve) => {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      rq.onsuccess = () => resolve(rq.result instanceof Blob ? rq.result : null);
      rq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putCachedAudio(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getDb();
    db.transaction(STORE, "readwrite").objectStore(STORE).put(blob, key);
  } catch {
    // 缓存失败不影响播放
  }
}

// ---------- 神经语音合成 ----------

export async function synthesizeFinnish(text: string, opts?: TtsOptions): Promise<Blob> {
  const voice = opts?.voice || DEFAULT_VOICE;
  const rate = Math.max(-40, Math.min(40, Math.round(opts?.rate ?? 0)));
  const clean = text.trim();
  const key = `${voice}|${rate}|${clean}`;

  const cached = await getCachedAudio(key);
  if (cached) return cached;

  const resp = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: clean, voice, rate }),
  });
  if (!resp.ok) {
    let msg = `语音合成失败 (${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.error) msg = data.error;
    } catch {
      // 保留默认错误信息
    }
    throw new Error(msg);
  }
  const blob = await resp.blob();
  putCachedAudio(key, blob);
  return blob;
}

// ---------- 播放（共享 audio 元素 + 首次手势解锁，兼容 iOS 自动播放限制） ----------

let sharedAudio: HTMLAudioElement | null = null;
let lastUrl: string | null = null;
let playSeq = 0;
// Azure 失败（未配置/断网/超额）后短暂停用神经语音，点击立即走浏览器 TTS 不再干等
let neuralDisabledUntil = 0;

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

function makeSilentWavUrl(): string {
  // 8 帧静音 WAV，仅用于在用户手势里"解锁"audio 元素
  const frames = 8;
  const dataSize = frames * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, dataSize, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

if (typeof window !== "undefined") {
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const a = getAudio();
    const url = makeSilentWavUrl();
    a.src = url;
    a.play().catch(() => {});
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

export function stopSpeaking() {
  playSeq++;
  if (sharedAudio) sharedAudio.pause();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

async function playAudioBlob(blob: Blob): Promise<void> {
  const a = getAudio();
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  a.src = lastUrl;
  await a.play();
}

// ---------- 浏览器 TTS 兜底（原 SpeakButton 实现） ----------

let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && window.speechSynthesis) {
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function speakWithBrowser(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "fi-FI";
  utt.rate = 0.9;
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const fiVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("fi"));
  if (fiVoice) utt.voice = fiVoice;
  window.speechSynthesis.speak(utt);
}

// ---------- 对外主入口（签名与旧版一致，所有喇叭按钮共用） ----------

export function speakFinnish(text: string, opts?: TtsOptions) {
  if (!text || typeof window === "undefined") return;
  stopSpeaking();
  const seq = ++playSeq;

  if (Date.now() < neuralDisabledUntil) {
    speakWithBrowser(text);
    return;
  }

  synthesizeFinnish(text, { voice: opts?.voice, rate: opts?.rate ?? WORD_RATE })
    .then((blob) => {
      if (seq !== playSeq) return; // 期间用户又点了别的
      playAudioBlob(blob).catch(() => speakWithBrowser(text));
    })
    .catch(() => {
      neuralDisabledUntil = Date.now() + 60_000;
      if (seq === playSeq) speakWithBrowser(text);
    });
}
