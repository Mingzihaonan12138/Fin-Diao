import { Volume2 } from "lucide-react";

// 提前缓存语音列表：移动端 getVoices() 首次常为空，靠 voiceschanged 事件补上，
// 这样第一次点就能选到芬兰语音色、避免"点一下没声音、再点才响"。
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && window.speechSynthesis) {
  const load = () => { cachedVoices = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

// 用浏览器内置的 fi-FI 语音朗读芬兰语，零成本、离线、无需存储音频。
export function speakFinnish(text: string) {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "fi-FI";
  utt.rate = 0.9; // 稍慢一点，便于跟读
  // 优先挑一个真正的芬兰语音色（有些浏览器只设 lang 不够）；缓存空时现取一次兜底
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const fiVoice = voices.find(v => v.lang?.toLowerCase().startsWith("fi"));
  if (fiVoice) utt.voice = fiVoice;
  window.speechSynthesis.speak(utt);
}

interface SpeakButtonProps {
  text: string;
  size?: "sm" | "md";
  className?: string;
}

export default function SpeakButton({ text, size = "sm", className = "" }: SpeakButtonProps) {
  const icon = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  const pad = size === "md" ? "p-2" : "p-1.5";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speakFinnish(text);
      }}
      title="朗读发音"
      aria-label={`朗读 ${text}`}
      className={`${pad} rounded-lg text-slate-300 hover:text-lake-blue-600 hover:bg-lake-blue-50/40 transition-colors cursor-pointer shrink-0 ${className}`}
    >
      <Volume2 className={icon} />
    </button>
  );
}
