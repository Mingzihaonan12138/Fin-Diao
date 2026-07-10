import { useState } from "react";
import { ChevronRight, Check, RotateCcw, ThumbsUp, XCircle, Volume2, AlertTriangle } from "lucide-react";
import { grammarLibrary, GRAMMAR_CATEGORIES, GrammarCard } from "../data/grammarLibrary";
import { speakFinnish } from "../lib/tts";

interface GrammarPracticeProps {
  vocab?: any[];
  user: any;
  onRefreshStats: () => void;
}

export default function GrammarPractice({ vocab = [], onRefreshStats }: GrammarPracticeProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"explain" | "related" | "practice">("explain");

  // Practice states
  const [practiceTab, setPracticeTab] = useState<"blanks" | "tables">("blanks");
  const [blankAnswers, setBlankAnswers] = useState<{ [key: string]: string }>({});
  const [tableAnswers, setTableAnswers] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [blankGraded, setBlankGraded] = useState(false);
  const [tableGraded, setTableGraded] = useState(false);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [activeConjKey, setActiveConjKey] = useState<{ id: string; pronoun: string } | null>(null);

  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];

  const speak = (text: string) => speakFinnish(text);

  const isAnswerCorrect = (userVal: string, correctVal: string | string[]): boolean => {
    if (!userVal || !correctVal) return false;
    const userClean = userVal.trim().toLowerCase();
    if (Array.isArray(correctVal)) {
      return correctVal.some(v => v.trim().toLowerCase() === userClean);
    }
    return String(correctVal).trim().toLowerCase() === userClean;
  };

  const isVerb = (word: any) => {
    const pos = (word.partOfSpeech || "").toLowerCase().trim();
    return pos === "动词" || pos === "verb";
  };

  const isNounOrAdj = (word: any) => {
    const pos = (word.partOfSpeech || "").toLowerCase().trim();
    return pos === "名词" || pos === "noun" || pos === "形容词" || pos === "adj" || pos === "adjective";
  };

  const isPluraleTantum = (word: any): boolean => {
    if (!word.inflections?.nounInflections) return false;
    const inf = word.inflections.nounInflections;
    const hasSingular = !!(inf.singularGenitive || inf.singularPartitive);
    const hasPlural = !!(inf.pluralGenitive || inf.pluralPartitive || inf.pluralNominative);
    return !hasSingular && hasPlural;
  };

  const getFilteredWordsForTopic = (topicId: string, vocabList: any[]): any[] => {
    if (!vocabList || vocabList.length === 0) return [];
    return vocabList.filter(word => {
      const inf = word.inflections;
      if (!inf) return false;
      const verb = isVerb(word);
      const nounOrAdj = isNounOrAdj(word);
      switch (topicId) {
        case "verb_type_1": return verb && inf.verbType === 1 && !!inf.conjugations;
        case "verb_type_2": return verb && inf.verbType === 2 && !!inf.conjugations;
        case "verb_type_3": return verb && inf.verbType === 3 && !!inf.conjugations;
        case "verb_type_4": return verb && inf.verbType === 4 && !!inf.conjugations;
        case "verb_type_5": return verb && inf.verbType === 5 && !!inf.conjugations;
        case "verb_type_6": return verb && inf.verbType === 6 && !!inf.conjugations;
        case "infinitive_1": return verb && !!inf.firstInfinitive;
        case "infinitive_2": return verb && !!(inf.secondInfinitive?.inessive || inf.secondInfinitive?.instructive);
        case "infinitive_3": return verb && !!(inf.thirdInfinitive?.inessive || inf.thirdInfinitive?.elative || inf.thirdInfinitive?.illative || inf.thirdInfinitive?.adessive || inf.thirdInfinitive?.abessive);
        case "noun_sing_gen": return nounOrAdj && !!inf.nounInflections?.singularGenitive && !isPluraleTantum(word);
        case "noun_sing_part": return nounOrAdj && !!inf.nounInflections?.singularPartitive && !isPluraleTantum(word);
        case "noun_plur_nom": return nounOrAdj && !!inf.nounInflections?.pluralNominative;
        case "noun_plur_gen": return nounOrAdj && !!inf.nounInflections?.pluralGenitive;
        case "noun_plur_part": return nounOrAdj && !!inf.nounInflections?.pluralPartitive;
        default: return false;
      }
    });
  };

  // Get display text for a word's relevant form for a given topic
  const getRelevantForm = (word: any, topicId: string): string => {
    const inf = word.inflections;
    if (!inf) return "";
    const first = (v: any) => Array.isArray(v) ? v[0] : (v || "");
    switch (topicId) {
      case "verb_type_1": case "verb_type_2": case "verb_type_3":
      case "verb_type_4": case "verb_type_5": case "verb_type_6":
        return ""; // verb conjugation shows separate grid
      case "infinitive_1":
        return first(inf.firstInfinitive);
      case "infinitive_2": {
        const parts = [];
        if (inf.secondInfinitive?.inessive) parts.push(`${first(inf.secondInfinitive.inessive)} (-essa)`);
        if (inf.secondInfinitive?.instructive) parts.push(`${first(inf.secondInfinitive.instructive)} (-en)`);
        return parts.join("  /  ");
      }
      case "infinitive_3": {
        const t3 = inf.thirdInfinitive;
        if (!t3) return "";
        const parts = [];
        if (t3.illative) parts.push(`${first(t3.illative)} (-maan)`);
        if (t3.inessive) parts.push(`${first(t3.inessive)} (-massa)`);
        if (t3.elative) parts.push(`${first(t3.elative)} (-masta)`);
        if (t3.adessive) parts.push(`${first(t3.adessive)} (-malla)`);
        if (t3.abessive) parts.push(`${first(t3.abessive)} (-matta)`);
        return parts.join("  /  ");
      }
      case "noun_sing_gen":
        return first(inf.nounInflections?.singularGenitive);
      case "noun_plur_gen": {
        const v = inf.nounInflections?.pluralGenitive;
        return Array.isArray(v) ? v.join(" / ") : (v || "");
      }
      case "noun_sing_part":
        return first(inf.nounInflections?.singularPartitive);
      case "noun_plur_part":
        return first(inf.nounInflections?.pluralPartitive);
      case "noun_plur_nom":
        return first(inf.nounInflections?.pluralNominative);
      default:
        return "";
    }
  };

  // Build dynamic quizzes from vocab (Task 6 patch 2: keep raw string|string[] in pronouns)
  const getDynamicQuizzes = () => {
    const presetQuizzes: any = {
      A2: [
        {
          id: "verb_type_1", title: "1类动词变位",
          blanks: [
            { id: "v1_1", sentence: "Minä ___ (puhua) suomea.", answer: "puhun", hint: "puhua 是 1 类动词，minä 词尾加 -n" },
            { id: "v1_2", sentence: "Hän ___ (asua) Helsingissä.", answer: "asuu", hint: "asua 第三人称，词尾双写元音 asuu" },
          ],
          tables: [{ id: "t_v1", title: "asua (居住) 现在时变位", verb: "asua", verbClass: "Type 1", pronouns: { minä: "asun", sinä: "asut", hän: "asuu", me: "asumme", te: "asutte", he: "asuvat" } }],
        },
        {
          id: "verb_type_2", title: "2类动词变位",
          blanks: [
            { id: "v2_1", sentence: "Hän ___ (syödä) kalaa.", answer: "syö", hint: "syödä 2类，词干为 syö-，hän 不变" },
            { id: "v2_2", sentence: "Minä ___ (juoda) maitoa.", answer: "juon", hint: "juoda 词干 juo-，minä 加 -n：juon" },
          ],
          tables: [{ id: "t_v2", title: "syödä (吃) 现在时变位", verb: "syödä", verbClass: "Type 2", pronouns: { minä: "syön", sinä: "syöt", hän: "syö", me: "syömme", te: "syötte", he: "syövät" } }],
        },
        {
          id: "verb_type_3", title: "3类动词变位",
          blanks: [
            { id: "v3_1", sentence: "Minä ___ (tulla) kotiin.", answer: "tulen", hint: "tulla 去掉 la，插入 e 变 tule-，加 n：tulen" },
            { id: "v3_2", sentence: "Hän ___ (mennä) kauppaan.", answer: "menee", hint: "mennä 词干变 mene-，hän 双写 e：menee" },
          ],
          tables: [{ id: "t_v3", title: "mennä (去) 现在时变位", verb: "mennä", verbClass: "Type 3", pronouns: { minä: "menen", sinä: "menet", hän: "menee", me: "menemme", te: "menette", he: "menevät" } }],
        },
        {
          id: "verb_type_4", title: "4类动词变位",
          blanks: [
            { id: "v4_1", sentence: "Hän ___ (tavata) ystävän.", answer: "tapaa", hint: "tavata 去掉 t，v→p 强化：tapaa" },
            { id: "v4_2", sentence: "Me ___ (haluta) kahvia.", answer: "haluamme", hint: "haluta 词干 halua-，me 加 mme" },
          ],
          tables: [{ id: "t_v4", title: "haluta (想要) 现在时变位", verb: "haluta", verbClass: "Type 4", pronouns: { minä: "haluan", sinä: "haluat", hän: "haluaa", me: "haluamme", te: "haluatte", he: "haluavat" } }],
        },
        {
          id: "kpt_weak", title: "辅音弱化 kpt",
          blanks: [
            { id: "k1", sentence: "Minä asun ___ (Helsinki).", answer: "Helsingissä", hint: "Helsinki 内格，nk→ng 弱化：Helsingissä" },
            { id: "k2", sentence: "Tämä on ___ (Pekka) auto.", answer: "Pekan", hint: "Pekka 属格，kk→k 弱化：Pekan" },
          ],
          tables: [],
        },
        {
          id: "noun_sing_gen", title: "单数属格 (-n)",
          blanks: [
            { id: "nsg1", sentence: "___ (Suomi) pääkaupunki on Helsinki.", answer: "Suomen", hint: "Suomi → i 变 e 加 n：Suomen" },
            { id: "nsg2", sentence: "Tämä on ___ (isä) kirja.", answer: "isän", hint: "isä 属格词尾加 -n：isän" },
          ],
          tables: [],
        },
        {
          id: "noun_sing_part", title: "单数部分格",
          blanks: [
            { id: "nsp1", sentence: "Minulla on kolme ___ (talo).", answer: "taloa", hint: "数词后接单数部分格，talo 加 -a" },
            { id: "nsp2", sentence: "En osta ___ (kirja).", answer: "kirjaa", hint: "否定句宾语用部分格，kirja 加 -a" },
          ],
          tables: [],
        },
        {
          id: "noun_plur_nom", title: "复数主格 (-t)",
          blanks: [
            { id: "npn1", sentence: "Nuo ___ (koira) ovat kilttejä.", answer: "koirat", hint: "koira 复数主格加 -t：koirat" },
          ],
          tables: [],
        },
        {
          id: "locatives_six", title: "地点格六件套",
          blanks: [
            { id: "l1", sentence: "Lapset ovat ___ (koulu).", answer: "koulussa", hint: "在学校里，使用内格 koulussa" },
            { id: "l2", sentence: "Tulen kotiin ___ (bussi).", answer: "bussilla", hint: "乘坐交通工具，使用外格 -lla：bussilla" },
          ],
          tables: [{ id: "t_loc", title: "talo (房子) 六格对照", verb: "talo", verbClass: "地点格", pronouns: { "内格 -ssa": "talossa", "出格 -sta": "talosta", "入格 -Vn": "taloon", "所格 -lla": "talolla", "离格 -lta": "talolta", "向格 -lle": "talolle" } }],
        },
      ],
      B1: [
        {
          id: "verb_type_5", title: "5类动词变位",
          blanks: [
            { id: "v5_1", sentence: "Minä ___ (tarvita) apua.", answer: "tarvitsen", hint: "tarvita 去掉 ta，加 tse，minä 加 n：tarvitsen" },
          ],
          tables: [{ id: "t_v5", title: "tarvita (需要) 现在时变位", verb: "tarvita", verbClass: "Type 5", pronouns: { minä: "tarvitsen", sinä: "tarvitset", hän: "tarvitsee", me: "tarvitsemme", te: "tarvitsette", he: "tarvitsevat" } }],
        },
        {
          id: "verb_type_6", title: "6类动词变位",
          blanks: [
            { id: "v6_1", sentence: "Sää ___ (kylmetä) nopeasti.", answer: "kylmenee", hint: "kylmetä 加 ne，hän 双写 e：kylmenee" },
          ],
          tables: [{ id: "t_v6", title: "vanheta (变老) 现在时变位", verb: "vanheta", verbClass: "Type 6", pronouns: { minä: "vanhenen", sinä: "vanhenet", hän: "vanhenee", me: "vanhenemme", te: "vanhenette", he: "vanhenevat" } }],
        },
        {
          id: "infinitive_1", title: "第一不定式",
          blanks: [
            { id: "inf1_1", sentence: "Minä osaan ___ (puhua) suomea.", answer: "puhua", hint: "osata 后接第一不定式原形" },
          ],
          tables: [],
        },
        {
          id: "infinitive_2", title: "第二不定式",
          blanks: [
            { id: "inf2_1", sentence: "Syö-___ (syödä) ei saa puhua.", answer: "dessä", hint: "syödä 的 E-inessive：syödessä，'吃饭时'" },
          ],
          tables: [],
        },
        {
          id: "infinitive_3", title: "第三不定式",
          blanks: [
            { id: "inf3_1", sentence: "Menen kauppaan osta-___ (ostaa) ruokaa.", answer: "maan", hint: "去做某事用入格 -maan：ostamaan" },
            { id: "inf3_2", sentence: "Olen kirjastossa luke-___ (lukea) kirjaa.", answer: "massa", hint: "正在做某事用内格 -massa：lukemassa" },
          ],
          tables: [{ id: "t_inf3", title: "ostaa (买) 第三不定式各格", verb: "ostaa", verbClass: "MA-infinitiivi", pronouns: { "去买 -maan": "ostamaan", "正在买 -massa": "ostamassa", "买完 -masta": "ostamasta", "通过买 -malla": "ostamalla", "没买 -matta": "ostamatta" } }],
        },
        {
          id: "noun_plur_gen", title: "复数属格",
          blanks: [
            { id: "npg1", sentence: "Talo-___ (talo) värit ovat keltaisia.", answer: "jen", hint: "talo 复数属格加 -jen：talojen" },
          ],
          tables: [],
        },
        {
          id: "noun_plur_part", title: "复数部分格",
          blanks: [
            { id: "npp1", sentence: "Pöydällä on paljon omen-___ (omena).", answer: "oita", hint: "paljon 后接复数部分格，omena → omenoita" },
          ],
          tables: [],
        },
        {
          id: "konditionaali", title: "条件式",
          blanks: [
            { id: "bc1", sentence: "Jos minulla olisi rahaa, ___ (ostaa) uuden auton.", answer: "ostaisin", hint: "ostaa 条件式第一人称：词干 + isi + n = ostaisin" },
          ],
          tables: [{ id: "t_cond", title: "puhua (说) 条件式变位", verb: "puhua", verbClass: "条件式 -isi-", pronouns: { minä: "puhuisin", sinä: "puhuisit", hän: "puhuisi", me: "puhuisimme", te: "puhuisitte", he: "puhuisivat" } }],
        },
      ],
    };

    const result: any = { A2: [], B1: [] };

    for (const diff of ["A2", "B1"] as const) {
      const origList = presetQuizzes[diff] || [];
      result[diff] = origList.map((origTopic: any) => {
        const topicId = origTopic.id;
        const matchingWords = getFilteredWordsForTopic(topicId, vocab);
        if (matchingWords.length === 0) return origTopic;

        const sampleSize = Math.min(matchingWords.length, 4);
        const shuffled = [...matchingWords].sort(() => 0.5 - Math.random());
        const blankWords = shuffled.slice(0, sampleSize);

        const generatedBlanks = blankWords.map((word, idx) => {
          const inf = word.inflections;
          let sentence = "";
          let answer: string | string[] = "";
          let hint = "";

          if (topicId.startsWith("verb_type_")) {
            const pronouns = ["minä", "sinä", "hän", "me", "te", "he"];
            const p = pronouns[idx % pronouns.length];
            answer = inf.conjugations?.[p] || "";
            sentence = `请写出动词 '${word.word}' (${word.translation}) 的 [${p}] 人称现在时变位：___`;
            hint = `动词原形: ${word.word}，变位人称: ${p}`;
          } else if (topicId === "infinitive_1") {
            answer = inf.firstInfinitive || "";
            sentence = `请写出动词 '${word.word}' (${word.translation}) 的 [第一不定式] 形式：___`;
            hint = `${word.word} 的第一不定式`;
          } else if (topicId === "infinitive_2") {
            const keys = [];
            if (inf.secondInfinitive?.inessive) keys.push("inessive");
            if (inf.secondInfinitive?.instructive) keys.push("instructive");
            const key = keys[idx % keys.length] || "inessive";
            answer = inf.secondInfinitive?.[key] || "";
            const label = key === "inessive" ? "内格 (-essa/-essä)" : "方式格 (-en)";
            sentence = `请写出动词 '${word.word}' (${word.translation}) 的 [第二不定式 ${label}] 形式：___`;
            hint = `${word.word} 的第二不定式 ${label}`;
          } else if (topicId === "infinitive_3") {
            const keys = ["inessive","elative","illative","adessive","abessive"].filter(k => inf.thirdInfinitive?.[k]);
            const key = keys[idx % keys.length] || "inessive";
            answer = inf.thirdInfinitive?.[key] || "";
            const caseLabels: any = { inessive: "内格(-massa)", elative: "出格(-masta)", illative: "入格(-maan)", adessive: "工具格(-malla)", abessive: "无格(-matta)" };
            sentence = `请写出动词 '${word.word}' (${word.translation}) 的 [第三不定式 ${caseLabels[key]}] 形式：___`;
            hint = `${word.word} 的第三不定式 ${caseLabels[key]}`;
          } else if (topicId === "noun_sing_gen") {
            answer = inf.nounInflections?.singularGenitive || "";
            sentence = `请写出 '${word.word}' (${word.translation}) 的 [单数属格 (-n)] 形式：___`;
            hint = `${word.word} 的单数属格`;
          } else if (topicId === "noun_sing_part") {
            answer = inf.nounInflections?.singularPartitive || "";
            sentence = `请写出 '${word.word}' (${word.translation}) 的 [单数部分格] 形式：___`;
            hint = `${word.word} 的单数部分格`;
          } else if (topicId === "noun_plur_nom") {
            answer = inf.nounInflections?.pluralNominative || "";
            sentence = `请写出 '${word.word}' (${word.translation}) 的 [复数主格 (-t)] 形式：___`;
            hint = `${word.word} 的复数主格`;
          } else if (topicId === "noun_plur_gen") {
            answer = inf.nounInflections?.pluralGenitive || "";
            sentence = `请写出 '${word.word}' (${word.translation}) 的 [复数属格] 形式：___`;
            hint = `${word.word} 的复数属格`;
          } else if (topicId === "noun_plur_part") {
            answer = inf.nounInflections?.pluralPartitive || "";
            sentence = `请写出 '${word.word}' (${word.translation}) 的 [复数部分格] 形式：___`;
            hint = `${word.word} 的复数部分格`;
          }

          return { id: `gen_b_${topicId}_${word.id}_${idx}`, sentence, answer, hint };
        });

        const generatedTables = [];
        const tableWord = matchingWords[0];
        if (tableWord) {
          if (topicId.startsWith("verb_type_")) {
            // Task 6 patch 2: keep raw string|string[] values (not cleanAnswer)
            const pObj: any = {
              minä: tableWord.inflections?.conjugations?.minä || "",
              sinä: tableWord.inflections?.conjugations?.sinä || "",
              hän: tableWord.inflections?.conjugations?.hän || "",
              me: tableWord.inflections?.conjugations?.me || "",
              te: tableWord.inflections?.conjugations?.te || "",
              he: tableWord.inflections?.conjugations?.he || "",
            };
            generatedTables.push({
              id: `gen_t_${topicId}_${tableWord.id}`,
              title: `${tableWord.word} (${tableWord.translation}) 现在时变位`,
              verb: tableWord.word,
              verbClass: tableWord.inflections?.verbType ? `Type ${tableWord.inflections.verbType}` : "动词变位",
              pronouns: pObj,
            });
          } else if (["infinitive_1", "infinitive_2", "infinitive_3"].includes(topicId)) {
            const tableWords = matchingWords.slice(0, 6);
            const pronouns: any = {};
            tableWords.forEach((tw: any) => {
              let ansVal: any = "";
              if (topicId === "infinitive_1") ansVal = tw.inflections?.firstInfinitive;
              else if (topicId === "infinitive_2") ansVal = tw.inflections?.secondInfinitive?.inessive || tw.inflections?.secondInfinitive?.instructive;
              else if (topicId === "infinitive_3") ansVal = tw.inflections?.thirdInfinitive?.inessive || tw.inflections?.thirdInfinitive?.illative;
              if (ansVal) pronouns[`${tw.word} (${tw.translation})`] = ansVal;
            });
            if (Object.keys(pronouns).length > 0) {
              generatedTables.push({
                id: `gen_t_${topicId}`,
                title: `${topicId === "infinitive_1" ? "第一" : topicId === "infinitive_2" ? "第二" : "第三"}不定式形式表`,
                verb: "不定式", verbClass: "Infinitive", pronouns,
              });
            }
          } else {
            const pObj: any = {};
            const ni = tableWord.inflections?.nounInflections;
            if (ni) {
              // Task 6 patch 2: keep raw values (string|string[])
              if (!isPluraleTantum(tableWord)) {
                if (ni.singularGenitive) pObj["单数属格 (gen_sg)"] = ni.singularGenitive;
                if (ni.singularPartitive) pObj["单数部分格 (part_sg)"] = ni.singularPartitive;
              }
              if (ni.pluralGenitive) pObj["复数属格 (gen_pl)"] = ni.pluralGenitive;
              if (ni.pluralPartitive) pObj["复数部分格 (part_pl)"] = ni.pluralPartitive;
              if (ni.pluralNominative) pObj["复数主格 (nom_pl)"] = ni.pluralNominative;
            }
            if (Object.keys(pObj).length > 0) {
              generatedTables.push({
                id: `gen_t_noun_${tableWord.id}`,
                title: `${tableWord.word} (${tableWord.translation}) 名词五格`,
                verb: tableWord.word,
                verbClass: isPluraleTantum(tableWord) ? "仅复数名词" : "名词变格",
                pronouns: pObj,
              });
            }
          }
        }

        return {
          ...origTopic,
          blanks: generatedBlanks.length > 0 ? generatedBlanks : origTopic.blanks,
          tables: generatedTables.length > 0 ? generatedTables : origTopic.tables,
        };
      });
    }
    return result;
  };

  const allDynamic = getDynamicQuizzes();
  const allQuizzesFlat = [...allDynamic.A2, ...allDynamic.B1];
  const currentQuiz = allQuizzesFlat.find((q: any) => q.id === selectedTopicId);
  const currentCard: GrammarCard | undefined = grammarLibrary.find(c => c.id === selectedTopicId);
  const relatedWords = selectedTopicId ? getFilteredWordsForTopic(selectedTopicId, vocab) : [];

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setDetailTab("explain");
    setPracticeTab("blanks");
    setBlankAnswers({});
    setTableAnswers({});
    setBlankGraded(false);
    setTableGraded(false);
    setActiveInputId(null);
    setActiveConjKey(null);
  };

  const handleResetTablesOnlyWrongs = (tableId: string, correctTable: any) => {
    const answers = tableAnswers[tableId] || {};
    const newAnswers: { [key: string]: string } = {};
    Object.keys(correctTable.pronouns).forEach(p => {
      const userVal = answers[p] || "";
      if (isAnswerCorrect(userVal, correctTable.pronouns[p])) {
        newAnswers[p] = answers[p];
      } else {
        newAnswers[p] = "";
      }
    });
    setTableAnswers({ ...tableAnswers, [tableId]: newAnswers });
    setTableGraded(false);
  };

  // ─────────────── List View ───────────────
  if (!selectedTopicId) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h3 className="text-xl font-bold text-slate-800">语法专项强化</h3>
          <p className="text-xs text-slate-400 mt-1">点击语法点查看规则讲解 + 相关词 + 专项练习</p>
        </div>

        {GRAMMAR_CATEGORIES.map(cat => {
          const cards = grammarLibrary.filter(c => c.category === cat.key);
          return (
            <div key={cat.key} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">
                {cat.label}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleSelectTopic(card.id)}
                    className="bg-white border border-slate-100 hover:border-lake-blue-300 hover:shadow-md rounded-xl p-4 text-left space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        card.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {card.level}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-lake-blue-600 transition-colors">
                      {card.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {card.summary}
                    </p>
                    <div className="flex items-center justify-end text-lake-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─────────────── Detail View ───────────────
  if (!currentCard) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>未找到语法卡片</p>
        <button onClick={() => setSelectedTopicId(null)} className="mt-4 text-lake-blue-600 text-sm">返回</button>
      </div>
    );
  }

  const isVerbConjTopic = selectedTopicId?.startsWith("verb_type_");

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => setSelectedTopicId(null)}
          className="mt-1 text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700 shrink-0 cursor-pointer"
        >
          ← 返回
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-slate-800">{currentCard.title}</h3>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              currentCard.level === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
            }`}>
              {currentCard.level}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{currentCard.summary}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {([
          { key: "explain", label: "讲解" },
          { key: "related", label: `相关词 (${relatedWords.length})` },
          { key: "practice", label: "练习" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setDetailTab(tab.key)}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer -mb-[2px] ${
              detailTab === tab.key
                ? "border-lake-blue-500 text-lake-blue-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 讲解 tab ── */}
      {detailTab === "explain" && (
        <div className="space-y-5">
          {/* Formation steps */}
          {currentCard.formation.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">变形规则</h4>
              <div className="space-y-2.5">
                {currentCard.formation.map((f, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 text-xs font-bold text-lake-blue-600 bg-lake-blue-50 px-2 py-0.5 rounded min-w-[56px] text-center">
                      {f.label}
                    </span>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {f.rule && <span className="text-slate-500">{f.rule}：</span>}
                      <code className="font-mono font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded text-sm">
                        {f.example}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example table from grammar library */}
          {currentCard.table && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">示例变位表</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{currentCard.table.lemma}</span>
                  <span>({currentCard.table.gloss})</span>
                  <button
                    onClick={() => speak(currentCard.table!.lemma)}
                    className="ml-1 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-lake-blue-600 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(currentCard.table.rows).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 capitalize">{k}</span>
                    <code className="text-sm font-bold text-slate-800 font-mono">{v}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar library examples */}
          {currentCard.examples.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">例句</h4>
              <div className="space-y-2">
                {currentCard.examples.map((ex, i) => (
                  <div key={i} className="border-l-2 border-lake-blue-200 pl-3 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-800">{ex.fi}</p>
                      <button
                        onClick={() => speak(ex.fi)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-300 hover:text-lake-blue-500 transition-colors cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{ex.zh}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pitfalls */}
          {currentCard.pitfalls && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">易错点</span>
                <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">{currentCard.pitfalls}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 相关词 tab ── */}
      {detailTab === "related" && (
        <div className="space-y-4">
          {relatedWords.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-2 shadow-sm">
              <p className="text-sm font-medium text-slate-500">暂无相关词</p>
              <p className="text-xs text-slate-400">请先在「课本」页导入词库 JSON，系统会自动将单词分配到对应语法点。</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${isVerbConjTopic ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
              {relatedWords.map((word: any) => {
                const relevantForm = getRelevantForm(word, selectedTopicId!);
                return (
                  <div key={word.id} className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-bold text-slate-800">{word.word}</span>
                        <span className="text-xs text-slate-400 ml-1.5">{word.translation}</span>
                      </div>
                      <button
                        onClick={() => speak(word.word)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-lake-blue-500 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isVerbConjTopic && word.inflections?.conjugations ? (
                      <div className="grid grid-cols-3 gap-1">
                        {(["minä","sinä","hän","me","te","he"] as const).map(p => {
                          const val = word.inflections.conjugations[p];
                          const display = Array.isArray(val) ? val[0] : (val || "—");
                          return (
                            <div key={p} className="bg-slate-50 rounded-lg px-2 py-1 flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-400">{p}</span>
                              <code className="text-xs font-bold text-slate-700 font-mono">{display}</code>
                            </div>
                          );
                        })}
                      </div>
                    ) : relevantForm ? (
                      <div className="bg-lake-blue-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs font-mono font-bold text-lake-blue-700">{word.word}</span>
                        <span className="text-xs text-slate-400 mx-1">→</span>
                        <span className="text-xs font-mono font-bold text-lake-blue-800">{relevantForm}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 练习 tab ── */}
      {detailTab === "practice" && (
        <div className="space-y-5">
          {(!currentQuiz || (currentQuiz.blanks?.length === 0 && currentQuiz.tables?.length === 0)) ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-2 shadow-sm">
              <p className="text-sm font-medium text-slate-500">暂无专项练习</p>
              <p className="text-xs text-slate-400">导入词库后系统将根据该语法点自动生成填空和变位表练习。</p>
            </div>
          ) : (
            <>
              {/* Practice sub-tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl max-w-xs">
                {(["blanks", "tables"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPracticeTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      practiceTab === tab ? "bg-white text-lake-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "blanks" ? "填空练习" : "变位大表"}
                  </button>
                ))}
              </div>

              {/* Finnish char helper */}
              {(activeInputId || activeConjKey) && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-4 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 shrink-0">键盘辅助：</span>
                  <div className="flex gap-1.5">
                    {finnishChars.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          if (activeInputId) {
                            setBlankAnswers(prev => ({ ...prev, [activeInputId]: (prev[activeInputId] || "") + c }));
                          } else if (activeConjKey) {
                            const { id, pronoun } = activeConjKey;
                            setTableAnswers(prev => ({
                              ...prev,
                              [id]: { ...(prev[id] || {}), [pronoun]: ((prev[id] || {})[pronoun] || "") + c }
                            }));
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-lake-blue-400 rounded-lg text-sm font-bold text-slate-800 cursor-pointer shadow-sm"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Blanks */}
              {practiceTab === "blanks" && currentQuiz?.blanks?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="space-y-4">
                    {currentQuiz.blanks.map((q: any, idx: number) => {
                      const userVal = blankAnswers[q.id] || "";
                      const isCorrect = isAnswerCorrect(userVal, q.answer);
                      return (
                        <div key={q.id} className="space-y-2 p-3 rounded-xl hover:bg-slate-50/50">
                          <p className="text-sm font-semibold text-slate-800">
                            ({idx + 1}) {q.sentence.split("___").map((seg: string, i: number) => (
                              <span key={i}>
                                {seg}
                                {i < q.sentence.split("___").length - 1 && (
                                  <input
                                    type="text"
                                    value={blankAnswers[q.id] || ""}
                                    onFocus={() => { setActiveInputId(q.id); setActiveConjKey(null); }}
                                    onChange={e => setBlankAnswers({ ...blankAnswers, [q.id]: e.target.value })}
                                    disabled={blankGraded}
                                    className={`px-2 py-1 mx-1.5 text-center rounded-lg border font-bold text-sm focus:outline-none w-32 ${
                                      blankGraded
                                        ? isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"
                                        : activeInputId === q.id ? "border-lake-blue-500 ring-2 ring-lake-blue-50" : "border-slate-200"
                                    }`}
                                    placeholder="输入答案"
                                  />
                                )}
                              </span>
                            ))}
                          </p>
                          {blankGraded && (
                            <div className={`ml-4 p-2.5 rounded-lg text-xs leading-relaxed ${isCorrect ? "bg-emerald-50/60 text-emerald-700" : "bg-red-50/60 text-red-700"}`}>
                              <div className="flex items-center gap-1 font-bold">
                                {isCorrect ? <ThumbsUp className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {isCorrect ? "答对啦！" : `答错了。正确形式: ${Array.isArray(q.answer) ? q.answer.join(" 或 ") : q.answer}`}
                              </div>
                              <p className="mt-0.5 text-slate-500">{q.hint}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-3 border-t border-slate-50">
                    <button
                      onClick={() => { setBlankGraded(true); onRefreshStats(); }}
                      disabled={blankGraded}
                      className="px-6 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                    >
                      提交判分
                    </button>
                  </div>
                </div>
              )}

              {/* Tables */}
              {practiceTab === "tables" && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  {(!currentQuiz?.tables || currentQuiz.tables.length === 0) ? (
                    <p className="text-sm text-slate-400 text-center py-8">该专题暂无变位大表练习</p>
                  ) : (
                    <>
                      {currentQuiz.tables.map((table: any) => (
                        <div key={table.id} className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-sm font-bold text-slate-700">{table.title}</span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{table.verbClass}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.keys(table.pronouns).map(p => {
                              const correctVal = table.pronouns[p];
                              const userVal = (tableAnswers[table.id] || {})[p] || "";
                              const isCorrect = isAnswerCorrect(userVal, correctVal);
                              return (
                                <div key={p} className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1">
                                  <label className="text-[11px] font-bold text-slate-400 capitalize">{p}</label>
                                  <input
                                    type="text"
                                    value={userVal}
                                    onFocus={() => { setActiveConjKey({ id: table.id, pronoun: p }); setActiveInputId(null); }}
                                    onChange={e => setTableAnswers(prev => ({
                                      ...prev,
                                      [table.id]: { ...(prev[table.id] || {}), [p]: e.target.value }
                                    }))}
                                    disabled={tableGraded}
                                    className={`w-full px-2.5 py-1.5 text-center text-sm rounded-lg border font-semibold focus:outline-none transition-colors ${
                                      tableGraded
                                        ? isCorrect ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-600"
                                        : activeConjKey?.id === table.id && activeConjKey?.pronoun === p ? "border-lake-blue-500 ring-2 ring-lake-blue-50" : "border-slate-200 bg-white"
                                    }`}
                                  />
                                  {tableGraded && !isCorrect && (
                                    <p className="text-[10px] text-red-500 font-bold text-center">
                                      正确: {Array.isArray(correctVal) ? correctVal.join(" 或 ") : correctVal}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {tableGraded && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleResetTablesOnlyWrongs(table.id, table)}
                                className="px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> 只重练错格
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex justify-end pt-3 border-t border-slate-50">
                        <button
                          onClick={() => { setTableGraded(true); onRefreshStats(); }}
                          disabled={tableGraded}
                          className="px-6 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          提交大表逐格判分
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
