import { Volume2 } from "lucide-react";
import { speakFinnish } from "../lib/tts";

// 朗读逻辑已移到 lib/tts.ts（Azure 神经语音 + IndexedDB 缓存 + 浏览器 TTS 兜底）；
// 这里继续 re-export，旧的 `import { speakFinnish } from "./SpeakButton"` 不用改。
export { speakFinnish };

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
