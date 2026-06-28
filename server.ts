import express from "express";
import path from "path";
import fs from "fs";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// 1. Load Firebase Config & Initialize Admin SDK
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let config: any = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Error reading firebase-applet-config.json:", err);
  }
}

const firebaseConfig = {
  projectId: config.projectId || process.env.FIREBASE_PROJECT_ID,
  databaseId: config.firestoreDatabaseId,
};

const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
const hasApplicationCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
let db: Firestore | null = null;

try {
  if (hasServiceAccount) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")),
      projectId: firebaseConfig.projectId,
    });
    db = firebaseConfig.databaseId ? getFirestore(firebaseConfig.databaseId) : getFirestore();
  } else if (hasApplicationCredentials) {
    initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
    db = firebaseConfig.databaseId ? getFirestore(firebaseConfig.databaseId) : getFirestore();
  } else {
    console.warn("Firebase Admin credentials not found. Server-side key storage and cache are disabled.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin. Server-side key storage and cache are disabled:", err);
  db = null;
}

// Initialize Express App
const app = express();
const PORT = 3000;

// Set high limits for handling base64 PDF/image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 2. Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.databaseId,
    adminFirestoreEnabled: Boolean(db),
    geminiEnvKeyConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS),
  });
});

// 3. API Key Management (Server-side Firestore backend, never exposes actual keys to frontend)
app.get("/api/keys", async (req, res) => {
  try {
    if (!db) {
      return res.json([]);
    }
    const snapshot = await db.collection("gemini_keys").orderBy("addedAt", "desc").get();
    const keysList = snapshot.docs.map((doc) => {
      const data = doc.data();
      const rawKey = data.key || "";
      // Mask the key for frontend display (e.g., AIzaSy...1234)
      const maskedKey = rawKey.length > 10 
        ? `${rawKey.substring(0, 7)}...${rawKey.substring(rawKey.length - 4)}` 
        : "****";
      return {
        id: doc.id,
        maskedKey,
        addedAt: data.addedAt,
      };
    });
    res.json(keysList);
  } catch (error: any) {
    console.error("Failed to get API keys:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/keys", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        error: "服务器尚未配置 Firebase Admin 凭据，无法保存备用密钥。请使用 GEMINI_API_KEY 环境变量，或配置 FIREBASE_SERVICE_ACCOUNT。",
      });
    }
    const { key } = req.body;
    const trimmedKey = typeof key === "string" ? key.trim() : "";
    if (!trimmedKey || trimmedKey.length < 20) {
      return res.status(400).json({ error: "无效的 Gemini API Key。请检查是否复制完整。" });
    }

    const newDoc = await db.collection("gemini_keys").add({
      key: trimmedKey,
      addedAt: new Date().toISOString(),
    });

    res.json({ id: newDoc.id, message: "密钥添加成功！已自动存入安全轮询池。" });
  } catch (error: any) {
    console.error("Failed to add API key:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/keys/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        error: "服务器尚未配置 Firebase Admin 凭据，无法删除备用密钥。",
      });
    }
    const { id } = req.params;
    await db.collection("gemini_keys").doc(id).delete();
    res.json({ message: "密钥已成功从轮询池移除。" });
  } catch (error: any) {
    console.error("Failed to delete API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: load all active keys for round-robin
async function getActiveGeminiKeys(): Promise<string[]> {
  const keys: string[] = [];
  
  // 1. Add env key(s) if present. GEMINI_API_KEY (or GEMINI_API_KEYS) may hold
  // several keys separated by commas/whitespace for round-robin rotation.
  const envKeys = `${process.env.GEMINI_API_KEY || ""} ${process.env.GEMINI_API_KEYS || ""}`;
  envKeys
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
  
  // 2. Load keys from Firestore
  if (db) {
    try {
      const snapshot = await db.collection("gemini_keys").get();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.key && typeof data.key === "string" && !keys.includes(data.key)) {
          keys.push(data.key);
        }
      });
    } catch (err) {
      console.error("Error loading extra API keys from Firestore:", err);
    }
  }
  
  return keys.filter(Boolean);
}

// 4. API for Uploading & Processing Materials with Gemini
app.post("/api/upload", async (req, res) => {
  try {
    const { fileData, fileType, fileName, textContent } = req.body;

    if (!fileData && !textContent) {
      return res.status(400).json({ error: "请上传材料（PDF、图片）或提供复制的文本。" });
    }

    // Get all keys in rotation pool
    const keysPool = await getActiveGeminiKeys();
    if (keysPool.length === 0) {
      return res.status(400).json({ 
        error: "没有可用的 Gemini API 密钥。请在‘系统设置’中添加至少一个 Gemini API Key！" 
      });
    }

    // System prompt directing the model to extract and generate matching exercises
    const systemInstruction = `
你是一位极其专业的芬兰语讲师（主授 A2-B1 级别），能够完美处理中芬双语材料。
你的任务是解析用户上传的上课材料（可能是PPT、Word转PDF、笔记或图片），并提取整理出以下四个结构化板块。
请你严格根据材料内容进行总结和教学设计，如果材料内容较少，可自行进行符合 A2/B1 难度的科学扩充。

你必须输出符合以下 TypeScript 格式的纯 JSON 数据：

interface GeminiResult {
  title: string; // 本节课主题，不超过20字，例如 "属格变化与生活用词"
  keyPoints: string[]; // 本节要点，3-5条，例如 ["掌握单数属格-n的添加规律", "学习kpt辅音弱化在属格中的体现"]
  grammarPoints: {
    title: string; // 语法点标题，不超过15字
    level: "A2" | "B1"; // 语法难度评级（根据当前学习重点进行评定）
    rule: string; // 语法详细规则与变格规律
    examples: { finnish: string; chinese: string }[]; // 至少2个中芬对照例句
  }[];
  vocabulary: {
    word: string; // 单词原形
    partOfSpeech: string; // 词性，如 "名词", "动词", "形容词", "副词"
    translation: string; // 中文释义
    exampleSentence: string; // 芬兰语例句（字体在UI中会放大，请写得优美地道）
    translationExample: string; // 例句中文对照
    keyInflections: string; // 关键变格形式或词性归类。动词给出1/2人称/Type分类(如: "puhun, puhut, Type 1")；名词给出单数属格和部分格变化(如: "talo -> talon, taloa")
    inflections?: {
      word: string; // 单词原形本身
      partOfSpeech: string; // 与外层词性一致，如 "名词" 或 "动词"
      verbType?: number; // 如果是动词，必须给出1到6之间的动词分类数值(如: 1, 2, 3, 4, 5, 6)
      conjugations?: {
        minä: string; // minä现在时变位形式，例如 "puhun", "syön"
        sinä: string; // sinä现在时变位形式，例如 "puhut", "syöt"
        hän: string; // hän现在时变位形式，例如 "puhuu", "syö"
        me: string; // me现在时变位形式，例如 "puhumme", "syömme"
        te: string; // te现在时变位形式，例如 "puhutte", "syötte"
        he: string; // he现在时变位形式，例如 "puhuvat", "syövät"
      }; // 动词六人称现在时变位（仅动词必须提供，非动词不提供）
      firstInfinitive?: string; // 动词第一不定式 (原形，即word本身)，例如 "puhua"
      secondInfinitive?: {
        inessive: string; // 第二不定式内格 (inessive -essa/-essä)，如 "puhuessa", "syödessä"
        instructive: string; // 第二不定式方式格 (instructive -en)，如 "puhuen", "juosten"
      }; // 动词第二不定式（仅动词提供）
      thirdInfinitive?: {
        inessive: string; // 第三不定式内格 (-massa/-mässä)，如 "puhumassa"
        elative: string; // 第三不定式出格 (-masta/-mästä)，如 "puhumasta"
        illative: string; // 第三不定式入格 (-maan/-mään)，如 "puhumaan"
        adessive: string; // 第三不定式顺格 (-malla/-mällä)，如 "puhumalla"
        abessive: string; // 第三不定式无格 (-matta/-mättä)，如 "sanomatta"
      }; // 动词第三不定式（仅动词提供）
      nounInflections?: {
        singularGenitive: string; // 单数属格 -n，如 "talon"
        pluralGenitive: string; // 复数属格 -ien/-jen/-ten/-den，如 "talojen", "maiden"
        singularPartitive: string; // 单数部分格 -a/-ta/-tta，如 "taloa", "vettä"
        pluralPartitive: string; // 复数部分格 -ja/-ita/-itä，如 "taloja", "kirjoja"
        pluralNominative: string; // 复数主格 -t，如 "talot", "koirat"
      }; // 名词格变化（名词、形容词、代词等名词变格词类必须提供，动词不提供）
    };
  }[];
  exercises: {
    fillBlanks: {
      id: string; // 唯一标识，如 "fb1", "fb2"
      sentence: string; // 题目句子。把要填空的地方写成 "___ (单词原形)"，例如 "Me ___ (puhua) suomea."
      answer: string; // 正确填空词形，例如 "puhumme"
      hint: string; // 提示（解释为什么用这个形式，如 "puhua 动词第一类 me 变位形式"）
    }[]; // 生成 5-6 道填空题，覆盖本课核心语法点
    conjugations: {
      id: string; // 如 "conj1"
      title: string; // 变位表标题，如 "Verbi 'puhua' preesens (动词 'puhua' 现在时变位)"
      verb: string; // 动词/名词原形
      verbClass: string; // 分类，例如 "Type 1" 或 "kpt弱化变格"
      pronouns: {
        minä: string;
        sinä: string;
        hän: string;
        me: string;
        te: string;
        he: string;
      }; // 完整的六人称变位/六人称格变化，作为标准答案
    }[]; // 生成 1-2 张变位/变格对照表
    translations: {
      id: string; // 如 "trans1"
      chinese: string; // 中文句子
      finnish: string; // 芬兰语标准参考译文
      selfCheckpoints: string[]; // A2自查清单，3条，如 ["是否使用了正确的属格后缀 -n", "是否注意了kpt强弱变化", "主谓人称是否一致"]
    }[]; // 生成 3-4 道句子翻译题
  };
}

注意事项：
1. 必须返回纯 JSON 对象。不要包裹在 \`\`\`json ... \`\`\` 标记中，只返回 JSON 字符串本身。
2. 确保芬兰语字母 ä ö å 输入正确。
3. 严格围绕本课重点生成练习。填空题答案不能有歧义，只能有一个唯一正确写法。
4. 动词变格或变位要覆盖 "动词四类现在时变位"、"辅音弱化(kpt)"、"单数部分格"、"复数部分格"、"属格"、"宾格选择"、"地点格六件套（ssa/sta/Vn、lla/lta/lle）"、"过去时"等A2语法。
`;

    // Try API Keys one by one with rate limit (429) tolerance
    let lastError: any = null;
    let responseText = "";

    for (let i = 0; i < keysPool.length; i++) {
      const currentKey = keysPool[i];
      console.log(`[Gemini Proxy] Trying key index ${i} (${currentKey.substring(0, 10)}...)`);

      try {
        const ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const contents: any[] = [];
        
        // Add content depending on upload type
        if (fileData && fileType) {
          contents.push({
            inlineData: {
              mimeType: fileType,
              data: fileData, // Base64 raw string
            },
          });
        }

        let userPrompt = "请帮我提取和归纳以下上课材料的内容：\n";
        if (textContent) {
          userPrompt += `材料文本内容：\n${textContent}\n`;
        } else {
          userPrompt += "（见上传的图片/PDF文件）";
        }
        userPrompt += "\n请按照系统提示词约定的 TypeScript 格式返回纯 JSON。";

        contents.push(userPrompt);

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          responseText = response.text;
          console.log("[Gemini Proxy] API Call Succeeded with key index", i);
          break; // Succeeded! Break the key loop.
        }
      } catch (err: any) {
        lastError = err;
        console.error(`[Gemini Proxy] Key index ${i} failed. Error:`, err.message || err);
        
        // If it is a 429 rate limit or quota error, or key error, proceed to next key
        const errMsg = (err.message || "").toLowerCase();
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate") || errMsg.includes("api key") || errMsg.includes("unauthorized")) {
          console.warn("[Gemini Proxy] Rate-limit or invalid key detected, switching to next key...");
          continue;
        } else {
          // If it's some other non-recoverable schema or prompt error, throw or try next anyway
          continue;
        }
      }
    }

    if (!responseText) {
      const isRateLimited = (lastError?.message || "").includes("429") || (lastError?.message || "").includes("quota");
      const errorMsg = isRateLimited 
        ? "所有 Gemini API 密钥目前都已达到速率限制 (429) 或配额已满。请稍后再试，或者在‘系统设置’中添加更多备用密钥！"
        : `Gemini 解析失败: ${lastError?.message || "未知错误"}`;
      return res.status(500).json({ error: errorMsg });
    }

    // Clean response if model added backticks despite instruction
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    try {
      const parsedResult = JSON.parse(cleanJson);
      
      // Cache generated inflections in Firestore word_inflections_cache
      if (db && parsedResult && parsedResult.vocabulary && Array.isArray(parsedResult.vocabulary)) {
        for (const item of parsedResult.vocabulary) {
          if (item.word && item.inflections) {
            try {
              const wordLower = item.word.trim().toLowerCase();
              const cacheRef = db.collection("word_inflections_cache").doc(wordLower);
              await cacheRef.set({
                word: item.word,
                partOfSpeech: item.partOfSpeech,
                inflections: item.inflections,
                cachedAt: new Date().toISOString()
              }, { merge: true });
              console.log(`[Cache] Cached inflections in Firestore for: ${item.word}`);
            } catch (cacheErr) {
              console.error(`[Cache] Error caching word ${item.word}:`, cacheErr);
            }
          }
        }
      }
      
      res.json(parsedResult);
    } catch (parseErr) {
      console.error("Failed to parse Gemini output as JSON. Raw was:", responseText);
      res.status(500).json({ 
        error: "Gemini 输出了格式不正确的 JSON，解析失败。请重新上传重试。",
        raw: responseText 
      });
    }

  } catch (error: any) {
    console.error("General error in upload/process endpoint:", error);
    res.status(500).json({ error: error.message || "服务器内部错误" });
  }
});

// 5. Mount Vite middleware in Development OR Static file serving in Production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Finnish learning app is running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
