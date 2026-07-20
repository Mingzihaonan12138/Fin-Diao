// 三通道掌握度：一个词分「认 / 听 / 写」三条独立通道各自记分。
//
// 背景：原来的复习/测验全是「看芬兰语 → 选中文」，四选一能靠排除法蒙，
// 练出来的"掌握"只覆盖被动识别。听不懂、写不出的词照样算已掌握。
// 三通道把它拆开：
//   see   看芬兰语 → 选中文        （被动识别）
//   hear  只听发音 → 打出芬兰语拼写（听力 + 拼写）
//   write 看中文   → 打出芬兰语    （主动产出）
// 每条通道连续答对 MASTER_HITS 次才算过；三条全过才是真的掌握。

import type { VocabularyWord } from "../types";

export type ChannelKey = "see" | "hear" | "write";

export const CHANNEL_KEYS: ChannelKey[] = ["see", "hear", "write"];

export const CHANNEL_META: Record<
  ChannelKey,
  { label: string; icon: string; prompt: string; color: string; dot: string }
> = {
  see: {
    label: "认",
    icon: "👁",
    prompt: "这个词是什么意思？",
    color: "text-sky-600",
    dot: "bg-sky-400",
  },
  hear: {
    label: "听",
    icon: "👂",
    prompt: "听发音，把这个词拼出来",
    color: "text-teal-600",
    dot: "bg-teal-400",
  },
  write: {
    label: "写",
    icon: "✍️",
    prompt: "用芬兰语写出这个词",
    color: "text-violet-600",
    dot: "bg-violet-400",
  },
};

/** 一条通道连续答对几次才算过关 */
export const MASTER_HITS = 2;

export interface WordChannels {
  see: number;
  hear: number;
  write: number;
}

const EMPTY: WordChannels = { see: 0, hear: 0, write: 0 };

export function getChannels(w: Pick<VocabularyWord, "channels">): WordChannels {
  const c = w.channels;
  if (!c) return { ...EMPTY };
  return {
    see: typeof c.see === "number" ? c.see : 0,
    hear: typeof c.hear === "number" ? c.hear : 0,
    write: typeof c.write === "number" ? c.write : 0,
  };
}

export function isChannelPassed(w: Pick<VocabularyWord, "channels">, k: ChannelKey): boolean {
  return getChannels(w)[k] >= MASTER_HITS;
}

/** 已过关的通道数 0–3 */
export function masteredChannelCount(w: Pick<VocabularyWord, "channels">): number {
  const c = getChannels(w);
  return CHANNEL_KEYS.filter(k => c[k] >= MASTER_HITS).length;
}

export function isFullyMastered(w: Pick<VocabularyWord, "channels">): boolean {
  return masteredChannelCount(w) === 3;
}

/**
 * 挑这个词当前最该练的通道：未过关的里分数最低的；
 * 同分时按 认 → 听 → 写 的难度顺序来（先能认得，再谈听写）。
 * 三条都过了返回 null。
 */
export function weakestChannel(w: Pick<VocabularyWord, "channels">): ChannelKey | null {
  const c = getChannels(w);
  const open = CHANNEL_KEYS.filter(k => c[k] < MASTER_HITS);
  if (open.length === 0) return null;
  let best = open[0];
  for (const k of open) if (c[k] < c[best]) best = k;
  return best;
}

/** 答对 +1（封顶 MASTER_HITS）；答错清零——这条通道要重新连对 */
export function bumpChannel(
  current: WordChannels,
  k: ChannelKey,
  correct: boolean
): WordChannels {
  const next = { ...current };
  next[k] = correct ? Math.min(MASTER_HITS, next[k] + 1) : 0;
  return next;
}

// ——— 拼写判分 ———

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();

/** ä→a ö→o å→a：判断是否只错在元音点 */
const stripDiacritics = (s: string) =>
  s.replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "a");

/** 连续重复字母压成一个：判断是否只错在长短音 */
const collapseDoubles = (s: string) => s.replace(/(.)\1+/g, "$1");

export interface SpellResult {
  correct: boolean;
  /** 答错时给出的针对性提示（中文母语者的两个死穴） */
  hint?: string;
}

/**
 * 严格全等判分：一个字符不对就是错（大小写和首尾空格不计——词形本身不区分大小写）。
 * 判错之后再诊断错因，把 ä/ö 点号和长短音单独点出来，因为这两类错误
 * 反复出现且自己看不出来，只说「答错了」没有教学价值。
 */
export function checkSpelling(input: string, answer: string): SpellResult {
  const a = norm(input);
  const b = norm(answer);
  if (a === b) return { correct: true };

  const reasons: string[] = [];
  if (stripDiacritics(a) === stripDiacritics(b)) {
    reasons.push("元音点：ä / ö / å 和 a / o 是不同的字母，不能省");
  }
  if (collapseDoubles(a) === collapseDoubles(b)) {
    reasons.push("长短音：双写字母（aa / tt / kk）长度错了，芬兰语里这会变成另一个词");
  }
  if (
    reasons.length === 0 &&
    collapseDoubles(stripDiacritics(a)) === collapseDoubles(stripDiacritics(b))
  ) {
    reasons.push("元音点 + 长短音都有出入，对照正确拼写逐字母看一遍");
  }
  return { correct: false, hint: reasons.join("；") || undefined };
}
