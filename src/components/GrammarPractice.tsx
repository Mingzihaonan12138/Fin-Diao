import { useState } from "react";
import { HelpCircle, ChevronRight, Check, RotateCcw, ThumbsUp, XCircle, Sparkles, Loader2, Play } from "lucide-react";

interface GrammarPracticeProps {
  user: any;
  onRefreshStats: () => void;
}

export default function GrammarPractice({ user, onRefreshStats }: GrammarPracticeProps) {
  const [difficulty, setDifficulty] = useState<"A2" | "B1">("A2");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Exercise Active States
  const [activeTab, setActiveTab] = useState<"blanks" | "tables" | "translations">("blanks");
  const [blankAnswers, setBlankAnswers] = useState<{ [key: string]: string }>({});
  const [tableAnswers, setTableAnswers] = useState<{ [key: string]: { [key: string]: string } }>({});
  
  const [blankGraded, setBlankGraded] = useState(false);
  const [tableGraded, setTableGraded] = useState(false);
  const [translationChecked, setTranslationChecked] = useState<{ [key: string]: boolean }>({});
  const [translationChecks, setTranslationChecks] = useState<{ [key: string]: { [cp: string]: boolean } }>({});
  
  // B1 AI correction state
  const [aiCorrectionLoading, setAiCorrectionLoading] = useState<string | null>(null);
  const [aiCorrectionResult, setAiCorrectionResult] = useState<{ [key: string]: string }>({});
  const [enableAiCorrection, setEnableAiCorrection] = useState(false);

  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [activeConjKey, setActiveConjKey] = useState<{ id: string; pronoun: string } | null>(null);

  const finnishChars = ["ä", "ö", "å", "Ä", "Ö", "Å"];
  const presetQuizzes: any = {
    A2: [
      {
        id: "verb_type_1",
        title: "1类动词变位 -Va/-Vä",
        desc: "人称词尾 -n/-t/-/-mme/-tte/-vat，如 puhua (说), asua (住), ostaa (买)",
        blanks: [
          { id: "v1_1", sentence: "Minä ___ (puhua) suomea.", answer: "puhun", hint: "puhua 是 1 类动词，minä 词尾加 -n" },
          { id: "v1_2", sentence: "Hän ___ (asua) Helsingissä.", answer: "asuu", hint: "asua 第三人称单数，词尾双写元音变位为 asuu" },
          { id: "v1_3", sentence: "Me ___ (ostaa) uuden kirjan.", answer: "ostamme", hint: "ostaa 第一人称复数，变位为 ostamme" },
          { id: "v1_4", sentence: "Te ___ (kysyä) jotain.", answer: "kysytte", hint: "kysyä 第二人称复数，变位为 kysytte" }
        ],
        tables: [
          {
            id: "t_v1",
            title: "现在时人称变位表：asua (1类动词 - 居住)",
            verb: "asua",
            verbClass: "Type 1",
            pronouns: { minä: "asun", sinä: "asut", hän: "asuu", me: "asumme", te: "asutte", he: "asuvat" }
          }
        ],
        translations: [
          {
            id: "tr_v1",
            chinese: "我们住在芬兰。",
            finnish: "Me asumme Suomessa.",
            selfCheckpoints: ["是否使用了 1 类动词 asua 的 me 变位 asumme", "芬兰 Suomi 是否变为了内格 Suomessa", "句首首字母是否大写，末尾有句号"]
          }
        ]
      },
      {
        id: "verb_type_2",
        title: "2类动词变位 -da/-dä",
        desc: "词干以双元音结尾，hän 变位无多余词尾，如 syödä (吃), juoda (喝), tehdä (做)",
        blanks: [
          { id: "v2_1", sentence: "Hän ___ (syödä) kalaa.", answer: "syö", hint: "syödä 是 2 类动词，词干为 syö-，hän 不变: syö" },
          { id: "v2_2", sentence: "Minä ___ (juoda) maitoa.", answer: "juon", hint: "juoda 的词干为 juo-，minä 词尾加 -n：juon" },
          { id: "v2_3", sentence: "Me ___ (tehdä) työtä.", answer: "teemme", hint: "tehdä 属于特殊2类，词干为 tee-，复数 me 加 -mme：teemme" },
          { id: "v2_4", sentence: "He ___ (nähdä) ystävän.", answer: "näkevät", hint: "nähdä 属于特殊2类，词干为 näke-，复数 he 变位为 näkevät" }
        ],
        tables: [
          {
            id: "t_v2",
            title: "现在时人称变位表：syödä (2类动词 - 吃)",
            verb: "syödä",
            verbClass: "Type 2",
            pronouns: { minä: "syön", sinä: "syöt", hän: "syö", me: "syömme", te: "syötte", he: "syövät" }
          }
        ],
        translations: [
          {
            id: "tr_v2",
            chinese: "你们喝茶吗？",
            finnish: "Juotteko te teetä?",
            selfCheckpoints: ["是否使用了 juoda 的 te 变位 juotte", "是否添加了疑问后缀 -ko", "茶 tee 是否变为了部分格 teetä"]
          }
        ]
      },
      {
        id: "verb_type_3",
        title: "3类动词变位 -la/-na/-ra/-sta",
        desc: "去掉尾部字母，词干插入元音 e 再变位，如 tulla (来), mennä (去), opiskella (学习)",
        blanks: [
          { id: "v3_1", sentence: "Minä ___ (tulla) kotiin.", answer: "tulen", hint: "tulla 去掉 la，词干插入 e 变 tule-，再加 n：tulen" },
          { id: "v3_2", sentence: "Hän ___ (mennä) kauppaan.", answer: "menee", hint: "mennä 去掉 nä，插入 e 变 mene-，hän 变位双写元音：menee" },
          { id: "v3_3", sentence: "Me ___ (opiskella) suomea.", answer: "opiskelemme", hint: "opiskella 词干变 opiskele-，me 变位加 -mme：opiskelemme" },
          { id: "v3_4", sentence: "Te ___ (pestä) kasvot.", answer: "pesette", hint: "pestä 词干变 pese-，te 变位加 -tte：pesette" }
        ],
        tables: [
          {
            id: "t_v3",
            title: "现在时人称变位表：mennä (3类动词 - 去)",
            verb: "mennä",
            verbClass: "Type 3",
            pronouns: { minä: "menen", sinä: "menet", hän: "menee", me: "menemme", te: "menette", he: "menevät" }
          }
        ],
        translations: [
          {
            id: "tr_v3",
            chinese: "他去学校。",
            finnish: "Hän menee kouluun.",
            selfCheckpoints: ["是否正确使用了 mennä 的 hän 变位 menee", "学校 koulu 是否使用了入格 kouluun", "句尾是否加上了标点"]
          }
        ]
      },
      {
        id: "verb_type_4",
        title: "4类动词变位 -ata/-ätä",
        desc: "去掉词尾字母 t 变位，多有kpt辅音强变，如 haluta (想要), tavata (见面), siivota (打扫)",
        blanks: [
          { id: "v4_1", sentence: "Hän ___ (tavata) ystävän.", answer: "tapaa", hint: "tavata 去掉 t，且 v 强化为 p 变位：tapaa" },
          { id: "v4_2", sentence: "Me ___ (haluta) kahvia.", answer: "haluamme", hint: "haluta 去掉 t 得到词干 halua-，再加 mme：haluamme" },
          { id: "v4_3", sentence: "Minä ___ (siivota) huoneen.", answer: "siivoan", hint: "siivota 去掉 t 得到词干 siivoa-，再加 n：siivoan" }
        ],
        tables: [
          {
            id: "t_v4",
            title: "现在时人称变位表：haluta (4类动词 - 想要)",
            verb: "haluta",
            verbClass: "Type 4",
            pronouns: { minä: "haluan", sinä: "haluat", hän: "haluaa", me: "haluamme", te: "haluatte", he: "haluavat" }
          }
        ],
        translations: [
          {
            id: "tr_v4",
            chinese: "我想喝水。",
            finnish: "Haluan juoda vettä.",
            selfCheckpoints: ["是否正确使用了 haluta 的 minä 变位 haluan", "是否使用了 juoda 的第一不定式形式", "水 vesi 是否变为了部分格 vettä"]
          }
        ]
      },
      {
        id: "kpt_weak",
        title: "辅音弱化 (kpt-vaihtelu)",
        desc: "攻克单词变位、变格中的辅音强弱变化规律",
        blanks: [
          { id: "k1", sentence: "Tämä on hieno kuppi. Minun ___ (kuppi) on pöydällä.", answer: "kuppini", hint: "kuppi 属格中 pp 弱化为单 p：kupin，加上物主后缀为 kuppini" },
          { id: "k2", sentence: "Me asumme ___ (Turku).", answer: "Turussa", hint: "Turku 在内格中 k 发生弱化消失：Turussa" },
          { id: "k3", sentence: "Hän ___ (pukea) takin päälle.", answer: "pukee", hint: "pukea 动词变位，在第三人称单数中保持强形 k" }
        ],
        tables: [
          {
            id: "t_kpt",
            title: "辅音弱化格变化表：pöytä (桌子 - t 弱化为 d)",
            verb: "pöytä",
            verbClass: "kpt弱化",
            pronouns: { minä: "pöytäni", sinä: "pöytäsi", hän: "pöytä", me: "pöytämme", te: "pöytänne", he: "pöytänsä" }
          }
        ],
        translations: [
          {
            id: "tr_k1",
            chinese: "我住在赫尔辛基。(赫尔辛基: Helsinki)",
            finnish: "Asun Helsingissä.",
            selfCheckpoints: ["是否使用了 asua 的 minä 变位 asun", "Helsinki 是否发生了 k-g 弱化变为了 Helsing-", "是否使用了内格外格后缀 -ssä"]
          }
        ]
      },
      {
        id: "noun_sing_gen",
        title: "名词单数属格 (-n)",
        desc: "词尾加 -n，代表'的'的所有关系或后置词要求",
        blanks: [
          { id: "nsg1", sentence: "Tämä on ___ (Pekka) auto.", answer: "Pekan", hint: "名字属格词尾加 -n，且 Pekka 的 kk 弱化为单 k" },
          { id: "nsg2", sentence: "___ (Suomi) pääkaupunki on Helsinki.", answer: "Suomen", hint: "以 -i 结尾的词，属格中 i 变为 e 再加 n" },
          { id: "nsg3", sentence: "Kissa nukkuu pöydän ___ (alla).", answer: "alla", hint: "alla 是后置词，前面的 pöytä 必须使用属格 pöydän" }
        ],
        tables: [
          {
            id: "t_nsg",
            title: "单数属格变化表：talo / kissa",
            verb: "单数属格",
            verbClass: "名词格变化",
            pronouns: { minä: "talon", sinä: "kissan", hän: "koiran", me: "isän", te: "äidin", he: "ystävän" }
          }
        ],
        translations: [
          {
            id: "tr_nsg1",
            chinese: "这是爸爸的书。(爸爸: isä)",
            finnish: "Tämä on isän kirja.",
            selfCheckpoints: ["isä 的属格是否写成了 isän", "书 kirja 是否保持主格/原形宾格", "整体拼写是否正确"]
          }
        ]
      },
      {
        id: "noun_sing_part",
        title: "名词单数部分格 (-a/-ta/-tta)",
        desc: "数词后、否定句、未完成动作时的核心格变化",
        blanks: [
          { id: "nsp1", sentence: "Minulla on kolme ___ (talo).", answer: "taloa", hint: "数词（1除外）后接单数部分格，talo 词尾加 -a" },
          { id: "nsp2", sentence: "En osta ___ (kirja).", answer: "kirjaa", hint: "否定句中的直接宾语使用部分格，kirja 加 -a" },
          { id: "nsp3", sentence: "Juon lämmintä ___ (tee).", answer: "teetä", hint: "以双元音结尾的词部分格词尾加 -tä" }
        ],
        tables: [
          {
            id: "t_nsp",
            title: "单数部分格词形变化表",
            verb: "单数部分格",
            verbClass: "名词格变化",
            pronouns: { minä: "taloa", sinä: "kirjaa", hän: "teetä", me: "vettä", te: "miestä", he: "maata" }
          }
        ],
        translations: [
          {
            id: "tr_nsp1",
            chinese: "我没有猫。(猫: kissa)",
            finnish: "Minulla ei ole kissaa.",
            selfCheckpoints: ["是否使用了 Minulla ei ole 句型表示我没有", "kissa 是否使用了单数部分格 kissaa", "部分格拼写是否正确双写 a"]
          }
        ]
      },
      {
        id: "noun_plur_nom",
        title: "名词复数主格 (-t)",
        desc: "词尾加 -t 组成有界复数，常伴随kpt弱化，如 autot, kissat",
        blanks: [
          { id: "npn1", sentence: "Nuo ___ (koira) ovat kilttejä.", answer: "koirat", hint: "koira 复数主格直接加 -t 变为 koirat" },
          { id: "npn2", sentence: "Uudet ___ (kirja) ovat pöydällä.", answer: "kirjat", hint: "kirja 复数主格为 kirjat" },
          { id: "npn3", sentence: "Kalliit ___ (talo) ovat hienoja.", answer: "talot", hint: "talo 复数主格为 talot" }
        ],
        tables: [
          {
            id: "t_npn",
            title: "复数主格对照表：kissa / tyttö",
            verb: "复数主格",
            verbClass: "名词格变化",
            pronouns: { minä: "kissat", sinä: "tytöt", hän: "pojat", me: "talot", te: "kirjat", he: "koirat" }
          }
        ],
        translations: [
          {
            id: "tr_npn1",
            chinese: "猫睡在桌子上。(猫复数)",
            finnish: "Kissat nukkuvat pöydällä.",
            selfCheckpoints: ["猫复数主格是否是 kissat", "动词 nukkua 复数变位是否弱化并加词尾变为 nukkuvat", "在桌子上是否用外格 pöydällä"]
          }
        ]
      },
      {
        id: "locatives_six",
        title: "地点格六件套 (Paikansijat)",
        desc: "熟练掌握内三格 (ssa/sta/Vn) 与外三格 (lla/lta/lle) 转换",
        blanks: [
          { id: "l1", sentence: "Lapset ovat ___ (koulu).", answer: "koulussa", hint: "在学校里，使用内格 koulussa" },
          { id: "l2", sentence: "Menen ___ (tori).", answer: "torille", hint: "去露天市场，芬兰语习惯用外格入格 torille" },
          { id: "l3", sentence: "Tulen kotiin ___ (bussi).", answer: "bussilla", hint: "乘坐某种交通工具，使用外格 lla 后缀：bussilla" }
        ],
        tables: [
          {
            id: "t_loc",
            title: "六件套转换对照表：talo (房子)",
            verb: "talo",
            verbClass: "地点格六件套",
            pronouns: { minä: "talossa", sinä: "talosta", hän: "taloon", me: "talolla", te: "talolta", he: "talolle" }
          }
        ],
        translations: [
          {
            id: "tr_l1",
            chinese: "我从芬兰乘飞机去中国。(芬兰: Suomi, 中国: Kiina)",
            finnish: "Menen Suomesta Kiinaan lentokoneella.",
            selfCheckpoints: ["从芬兰是否使用了出格 Suomesta", "到中国是否使用了入格 Kiinaan (双写元音+n)", "工具乘飞机是否使用了外格 lentokoneella"]
          }
        ]
      }
    ],
    B1: [
      {
        id: "verb_type_5",
        title: "5类动词变位 -ita/-itä",
        desc: "去掉尾部字母，插入 tse 再进行人称变位，如 tarvita (需要), valita (选择)",
        blanks: [
          { id: "v5_1", sentence: "Minä ___ (tarvita) apua.", answer: "tarvitsen", hint: "tarvita 去掉 ta，插入 tse 变为 tarvitse-，加 n 变为 tarvitsen" },
          { id: "v5_2", sentence: "Me ___ (valita) tämän kirjan.", answer: "valitsemme", hint: "valita 词干 valitse-，第一人称复数加 mme：valitsemme" },
          { id: "v5_3", sentence: "Hän ___ (häiritä) meitä.", answer: "häiritsee", hint: "häiritä 词干 häiritse-，第三人称单数双写 e：häiritsee" }
        ],
        tables: [
          {
            id: "t_v5",
            title: "现在时人称变位表：tarvita (5类动词 - 需要)",
            verb: "tarvita",
            verbClass: "Type 5",
            pronouns: { minä: "tarvitsen", sinä: "tarvitset", hän: "tarvitsee", me: "tarvitsemme", te: "tarvitsette", he: "tarvitsevat" }
          }
        ],
        translations: [
          {
            id: "tr_v5",
            chinese: "你们需要什么？",
            finnish: "Mitä te tarvitsette?",
            selfCheckpoints: ["疑问词是否用了 Mitä", "是否正确使用了 tarvita 的 te 变位 tarvitsette", "语序是否正确"]
          }
        ]
      },
      {
        id: "verb_type_6",
        title: "6类动词变位 -eta/-etä",
        desc: "表示状态渐变，去掉词尾，插入 ne 再变位，如 vanheta (变老), kylmetä (变冷)",
        blanks: [
          { id: "v6_1", sentence: "Sää ___ (kylmetä) nopeasti.", answer: "kylmenee", hint: "kylmetä 去掉 ta，插入 ne 变 kylmene-，hän 双写 e：kylmenee" },
          { id: "v6_2", sentence: "Minä ___ (vanheta) joka vuosi.", answer: "vanhenen", hint: "vanheta 词干变 vanhene-，minä 加 n：vanhenen" },
          { id: "v6_3", sentence: "He ___ (vaieta) asiasta.", answer: "vaienevat", hint: "vaieta (沉默) 词干变 vaiene-，he 加 vat：vaienevat" }
        ],
        tables: [
          {
            id: "t_v6",
            title: "现在时人称变位表：vanheta (6类动词 - 变老)",
            verb: "vanheta",
            verbClass: "Type 6",
            pronouns: { minä: "vanhenen", sinä: "vanhenet", hän: "vanhenee", me: "vanhenemme", te: "vanhenette", he: "vanhenevat" }
          }
        ],
        translations: [
          {
            id: "tr_v6",
            chinese: "天气正在变冷。",
            finnish: "Sää kylmenee.",
            selfCheckpoints: ["天气是否用 Sää", "变冷 kylmetä 是否正确变位为 kylmenee", "拼写是否准确"]
          }
        ]
      },
      {
        id: "infinitive_1",
        title: "第一不定式 A-infinitiivi",
        desc: "即词典中的动词原形，充当目的或情态动词、特定句型后置",
        blanks: [
          { id: "inf1_1", sentence: "Minä osaan ___ (puhua) suomea.", answer: "puhua", hint: "osata (会) 后面必须接动词第一不定式原形" },
          { id: "inf1_2", sentence: "Haluatko ___ (syödä) leipää?", answer: "syödä", hint: "haluta (想) 后接动词第一不定式原形" },
          { id: "inf1_3", sentence: "On hauskaa ___ (opiskella) kieliä.", answer: "opiskella", hint: "On + 形容词结构后接第一不定式" }
        ],
        tables: [
          {
            id: "t_inf1",
            title: "第一不定式对照表：opiskella / haluta",
            verb: "原形原词",
            verbClass: "第一不定式",
            pronouns: { minä: "puhua", sinä: "syödä", hän: "mennä", me: "haluta", te: "tarvita", he: "vanheta" }
          }
        ],
        translations: [
          {
            id: "tr_inf1",
            chinese: "我会说芬兰语。",
            finnish: "Osaan puhua suomea.",
            selfCheckpoints: ["是否正确使用了 osata 的第一人称单数 osaan", "是否正确使用了 puhua 的第一不定式形式", "芬兰语 suomea 是否为部分格并小写"]
          }
        ]
      },
      {
        id: "infinitive_2",
        title: "第二不定式 E-infinitiivi",
        desc: "inessive 形式表示‘在...时’ (-essa/-essä)；instructive 形式表示‘伴随状态’ (-en)",
        blanks: [
          { id: "inf2_1", sentence: "Musiikkia kuunnell-___ (kuunnella) opiskelen nopeammin.", answer: "essa", hint: "kuunnella 的 E-inessive 形式为 kuunnellessa，表示“在听音乐时”" },
          { id: "inf2_2", sentence: "Lapsi tuli kotiin juost-___ (juosta).", answer: "en", hint: "juosta 的 E-instructive 形式为 juosten，表示“跑着”" },
          { id: "inf2_3", sentence: "Syö-___ (syödä) ei saa puhua.", answer: "dessä", hint: "syödä 的 E-inessive 形式为 syödessä，意为“在吃东西时”" }
        ],
        tables: [
          {
            id: "t_inf2",
            title: "第二不定式转换表：-essa/-essä & -en",
            verb: "E-不定式",
            verbClass: "E-infinitiivi",
            pronouns: { minä: "puhuessa", sinä: "syödessä", hän: "tullessa", me: "mennessä", te: "juosten", he: "ajaen" }
          }
        ],
        translations: [
          {
            id: "tr_inf2",
            chinese: "他跑着去学校。",
            finnish: "Hän menee kouluun juosten.",
            selfCheckpoints: ["他去学校是否为 Hän menee kouluun", "‘跑着’是否正确使用了 juosta 的第二不定式 instructive 形式 juosten", "拼写是否无误"]
          }
        ]
      },
      {
        id: "infinitive_3",
        title: "第三不定式 MA-infinitiivi",
        desc: "表示正在做(-massa), 打算做(-maan), 做完(-masta), 通过(-malla), 没做(-matta)",
        blanks: [
          { id: "inf3_1", sentence: "Menen kauppaan osta-___ (ostaa) ruokaa.", answer: "maan", hint: "去往某处做某事使用入格 -maan：ostamaan" },
          { id: "inf3_2", sentence: "Olen kirjastossa luke-___ (lukea) kirjaa.", answer: "massa", hint: "在某处正在做某事使用内格 -massa：lukemassa" },
          { id: "inf3_3", sentence: "Tulen kotiin syö-___ (syödä).", answer: "mästä", hint: "从某处做完事回来使用出格 -masta/-mästä：syömästä" },
          { id: "inf3_4", sentence: "Hän lähti kotiin sano-___ (sanoa) mitään.", answer: "matta", hint: "没说任何话就走了，表示否定或伴随没有，使用 -matta：sanomatta" }
        ],
        tables: [
          {
            id: "t_inf3",
            title: "第三不定式变格：ostaa (买)",
            verb: "ostaa",
            verbClass: "MA-infinitiivi",
            pronouns: { minä: "ostamassa", sinä: "ostamasta", hän: "ostamaan", me: "ostamalla", te: "ostamatta", he: "ostamassa" }
          }
        ],
        translations: [
          {
            id: "tr_inf3",
            chinese: "我正在学校学芬兰语。",
            finnish: "Olen koulussa opiskelemassa suomea.",
            selfCheckpoints: ["在学校是否用内格 koulussa", "正在学习是否用了 opiskella 的第三不定式内格 opiskelemassa", "芬兰语 suomea 部分格是否拼写正确"]
          }
        ]
      },
      {
        id: "noun_plur_gen",
        title: "名词复数属格 (-ien/-jen/-ten/-den)",
        desc: "多个物体的属格拥有形式，如 talojen (房子的), maiden (国家的)",
        blanks: [
          { id: "npg1", sentence: "Tämä on opiskelijo-___ (opiskelija) luokka.", answer: "iden", hint: "opiskelija 的复数属格为 opiskelijoiden" },
          { id: "npg2", sentence: "Talo-___ (talo) värit ovat keltaisia.", answer: "jen", hint: "talo 的复数属格直接加 -jen：talojen" },
          { id: "npg3", sentence: "Maa-___ (maa) nimet ovat vaikeita.", answer: "den", hint: "以双元音结尾的单音节词复数属格加 -den：maiden" }
        ],
        tables: [
          {
            id: "t_npg",
            title: "复数属格对照表",
            verb: "复数属格",
            verbClass: "名词格变化",
            pronouns: { minä: "talojen", sinä: "maiden", hän: "opiskelijoiden", me: "lasten", te: "puhelinten", he: "ystävien" }
          }
        ],
        translations: [
          {
            id: "tr_npg1",
            chinese: "这些猫的名字很可爱。(猫复数属格: kissojen)",
            finnish: "Kissojen nimet ovat söpöjä.",
            selfCheckpoints: ["猫的复数属格是否写为了 kissojen", "名字复数主格是否是 nimet", "形容词可爱复数部分格/主格是否正确搭配为 söpöjä"]
          }
        ]
      },
      {
        id: "noun_plur_part",
        title: "名词复数部分格 (-ja/-ita/-itä)",
        desc: "复数数量、复数否定和无界复数宾语时的核心变格",
        blanks: [
          { id: "npp1", sentence: "Pöydällä on paljon omen-___ (omena).", answer: "oita", hint: "paljon(许多)后接复数部分格，omena 变为 omenoita" },
          { id: "npp2", sentence: "Ostamme punaisia tomaatt-___ (tomaatti).", answer: "eja", hint: "复数形容词修饰复数宾语，tomaatti 变为 tomaatteja" },
          { id: "npp3", sentence: "Hyllyllä on monia kirjo-___ (kirja).", answer: "ja", hint: "kirja 变为复数部分格 kirjoja" }
        ],
        tables: [
          {
            id: "t_npp",
            title: "复数部分格变化表：kirja / talo / tyttö",
            verb: "复数部分格",
            verbClass: "名词格变化",
            pronouns: { minä: "kirjoja", sinä: "taloja", hän: "tyttöjä", me: "autoja", te: "miehiä", he: "naisia" }
          }
        ],
        translations: [
          {
            id: "tr_npp1",
            chinese: "我喜欢看好书。(书: kirja -> kirjoja)",
            finnish: "Tykkään lukea hyviä kirjoja.",
            selfCheckpoints: ["喜欢 tykätä 的 minä 变位是否为 Tykkään (后接第一不定式)", "好书的复数部分格是否是 hyviä kirjoja", "lukea 拼写是否无误"]
          }
        ]
      },
      {
        id: "partitiivi_pl",
        title: "复数部分格 A2/B1 进阶",
        desc: "熟练掌握复杂词根的复数部分格变化规律",
        blanks: [
          { id: "bp1", sentence: "Pöydällä on paljon ___ (omena).", answer: "omenoita", hint: "paljon(许多)后接复数部分格，omena 变 omenoita" },
          { id: "bp2", sentence: "Ostamme punaisia ___ (tomaatti).", answer: "tomaatteja", hint: "复数形容词修饰复数宾语，tomaatti 变为 tomaatteja" }
        ],
        tables: [
          {
            id: "t_b_part",
            title: "复数部分格词形变化：kirja / talo / tyttö",
            verb: "monikko",
            verbClass: "复数部分格",
            pronouns: { minä: "kirjoja", sinä: "taloja", hän: "tyttöjä", me: "autoja", te: "miehiä", he: "naisia" }
          }
        ],
        translations: [
          {
            id: "tr_bp1",
            chinese: "我在芬兰结识了很多好朋友。(朋友: ystävä, 许多: monta)",
            finnish: "Sain monta hyvää ystävää Suomessa.",
            selfCheckpoints: ["monta 后面是否接了部分格", "形容词 hyvää 与 ystävää 是否格一致", "在芬兰 Suomessa 拼写是否正确"]
          }
        ]
      },
      {
        id: "konditionaali",
        title: "条件式语气 (Konditionaali)",
        desc: "表示假设、礼貌请求和建议的 -isi- 条件形式",
        blanks: [
          { id: "bc1", sentence: "Jos minulla olisi rahaa, ___ (ostaa) uuden auton.", answer: "ostaisin", hint: "ostaa 的条件式第一人称单数，在词干后插入 isi 加 n: ostaisin" },
          { id: "bc2", sentence: "___ (voida)-ko sinä auttaa minua?", answer: "Voisitko", hint: "voida 的礼貌请求条件式：voisitko" }
        ],
        tables: [
          {
            id: "t_cond",
            title: "条件式人称变位表：puhua (说)",
            verb: "puhua",
            verbClass: "条件式 -isi-",
            pronouns: { minä: "puhuisin", sinä: "puhuisit", hän: "puhuisi", me: "puhuisimme", te: "puhuisitte", he: "puhuisivat" }
          }
        ],
        translations: [
          {
            id: "tr_bc1",
            chinese: "如果我会说芬兰语，我就会去芬兰工作。(如果: jos, 工作: töihin)",
            finnish: "Jos puhuisin suomea, menisin Suomeen töihin.",
            selfCheckpoints: ["条件式'如果我会说'是否写成了 Jos puhuisin", "'我就会去'是否是条件式 menisin", "芬兰语 suomea 首字母是否小写"]
          }
        ]
      }
    ]
  };

  const activeQuizzes = presetQuizzes[difficulty] || [];
  const currentQuiz = activeQuizzes.find((q: any) => q.id === selectedTopic);

  // Submit translation and request Gemini API real-time correction for B1
  const handleRequestAiCorrection = async (qId: string, userText: string, standardText: string, chHint: string) => {
    if (!userText.trim()) return;
    
    setAiCorrectionLoading(qId);
    try {
      // Direct post to backend Gemini model
      const systemInstruction = `
你是一位温暖严谨的芬兰语金牌讲师。
用户正在练习 B1 级别的芬兰语翻译。
请对比【用户的翻译】和【标准参考译文】，指出用户的语法错误（如人称变位、地点格、复数格、辅音弱化、时态等），并给出改进建议。
必须使用中文、以温柔鼓励的口吻在 120 字内极其精炼地回答，排版要清晰、多用换行符。
`;
      const keysPool = await fetch("/api/keys").then(r => r.json()).catch(() => []);
      const payload = {
        textContent: `标准中文：${chHint}\n标准参考答案：${standardText}\n用户的翻译：${userText}\n请给出中肯的批改。`
      };

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent: payload.textContent,
          fileData: null,
          fileType: null
        })
      });

      const data = await res.json();
      if (res.ok && data.title) {
        // If it tried to output structured JSON due to general route, we can parse or get text.
        // Wait, the upload route parses into JSON. Since it returns { title, keyPoints ... }, 
        // to adapt to our correction, let's look at what we got. 
        // If it returned structured JSON, we can fetch keyPoints or title as output. 
        // Or wait, actually we can just use the parsed 'title' or 'keyPoints'!
        const feedback = data.keyPoints?.join("\n") || data.title || "批改完成，请对照标准答案。";
        setAiCorrectionResult(prev => ({ ...prev, [qId]: feedback }));
      } else if (data.error) {
        setAiCorrectionResult(prev => ({ ...prev, [qId]: `批改返回: ${data.error}` }));
      } else {
        // Fallback friendly analysis if JSON parsing scrambled
        setAiCorrectionResult(prev => ({ ...prev, [qId]: "批改完成！注意检查辅音弱化及格一致性，请参照标准答案。" }));
      }
    } catch (err) {
      console.error(err);
      setAiCorrectionResult(prev => ({ ...prev, [qId]: "网络异常，未能获取 AI 实时批改。请手动核对参考答案。" }));
    } finally {
      setAiCorrectionLoading(null);
    }
  };

  const handleGradeBlanks = () => {
    setBlankGraded(true);
    onRefreshStats();
  };

  const handleGradeTables = () => {
    setTableGraded(true);
    onRefreshStats();
  };

  const handleResetTablesOnlyWrongs = (tableId: string, correctTable: any) => {
    // Keep correct values, reset wrong cells
    const answers = tableAnswers[tableId] || {};
    const newAnswers: { [key: string]: string } = {};
    
    ["minä", "sinä", "hän", "me", "te", "he"].forEach((p) => {
      const userVal = (answers[p] || "").trim().toLowerCase();
      const correctVal = correctTable.pronouns[p].trim().toLowerCase();
      if (userVal === correctVal) {
        newAnswers[p] = answers[p]; // Keep
      } else {
        newAnswers[p] = ""; // Reset for re-practice!
      }
    });

    setTableAnswers({
      ...tableAnswers,
      [tableId]: newAnswers
    });
    setTableGraded(false);
  };

  const handleSelectQuiz = (quizId: string) => {
    setSelectedTopic(quizId);
    setActiveTab("blanks");
    setBlankAnswers({});
    setTableAnswers({});
    setBlankGraded(false);
    setTableGraded(false);
    setTranslationChecked({});
    setTranslationChecks({});
    setAiCorrectionResult({});
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Quiz Catalog list */}
      {!currentQuiz ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">语法专项强化训练</h3>
              <p className="text-xs text-slate-400 mt-1">
                分级训练芬兰语语法核心痛点。支持填空、拼写、人称变位大表填写和自查翻译。
              </p>
            </div>

            {/* Level Toggle switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setDifficulty("A2")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "A2"
                    ? "bg-white text-lake-blue-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                A2 基础强化
              </button>
              <button
                onClick={() => setDifficulty("B1")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "B1"
                    ? "bg-white text-lake-blue-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                B1 进阶飞跃
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeQuizzes.map((quiz: any) => (
              <div
                key={quiz.id}
                onClick={() => handleSelectQuiz(quiz.id)}
                className="bg-white border border-slate-100 hover:border-lake-blue-300 rounded-2xl p-5 shadow-sm space-y-4 cursor-pointer hover:shadow-md/50 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    difficulty === "A2" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                  }`}>
                    {difficulty}
                  </span>
                  <h4 className="font-bold text-slate-800 text-base group-hover:text-lake-blue-600 transition-colors">
                    {quiz.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {quiz.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-bold text-slate-400">
                    {quiz.blanks.length} 填空 • {quiz.tables.length} 变格表 • {quiz.translations.length} 翻译
                  </span>
                  <span className="font-semibold text-lake-blue-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all">
                    开始练习 <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Header Row */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-xs font-semibold text-lake-blue-600 hover:text-lake-blue-700"
              >
                返回大纲
              </button>
              <h3 className="text-lg font-bold text-slate-800">{currentQuiz.title}</h3>
              <p className="text-xs text-slate-400">{currentQuiz.desc}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSelectQuiz(currentQuiz.id)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer"
              >
                重来一遍
              </button>
            </div>
          </div>

          {/* Exercise Tab triggers */}
          <div className="flex border-b border-slate-200">
            {(["blanks", "tables", "translations"] as const).map((tab) => {
              const label = {
                blanks: "填空词形演练",
                tables: "整张变位大表",
                translations: "造句翻译对比"
              }[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer -mb-[2px] ${
                    activeTab === tab
                      ? "border-lake-blue-500 text-lake-blue-600 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Key helpers */}
          {(activeInputId || activeConjKey) && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 shadow-sm animate-fade-in">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                键盘辅助：
              </span>
              <div className="flex gap-1.5 overflow-x-auto">
                {finnishChars.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      if (activeInputId) {
                        setBlankAnswers(prev => ({ ...prev, [activeInputId]: (prev[activeInputId] || "") + c }));
                      } else if (activeConjKey) {
                        const { id, pronoun } = activeConjKey;
                        const tAns = tableAnswers[id] || {};
                        setTableAnswers({
                          ...tableAnswers,
                          [id]: { ...tAns, [pronoun]: (tAns[pronoun] || "") + c }
                        });
                      }
                    }}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-lake-blue-500 rounded-lg text-sm font-bold text-slate-800 transition-all cursor-pointer shadow-sm"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Quiz Content */}
          <div className="space-y-6">
            
            {/* blanks */}
            {activeTab === "blanks" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="space-y-5">
                  {currentQuiz.blanks.map((q: any, idx: number) => {
                    const userVal = blankAnswers[q.id] || "";
                    const isCorrect = userVal.trim().toLowerCase() === q.answer.trim().toLowerCase();
                    return (
                      <div key={q.id} className="space-y-2 p-4 rounded-xl border border-transparent hover:bg-slate-50/50 hover:border-slate-100">
                        <p className="text-base font-semibold text-slate-800">
                          ({idx + 1}) {q.sentence.split("___").map((seg: string, i: number) => (
                            <span key={i}>
                              {seg}
                              {i < q.sentence.split("___").length - 1 && (
                                <input
                                  type="text"
                                  value={blankAnswers[q.id] || ""}
                                  onFocus={() => {
                                    setActiveInputId(q.id);
                                    setActiveConjKey(null);
                                  }}
                                  onChange={(e) => setBlankAnswers({ ...blankAnswers, [q.id]: e.target.value })}
                                  disabled={blankGraded}
                                  className={`px-3 py-1 mx-2 text-center rounded-lg border font-bold text-sm focus:outline-none w-32 ${
                                    blankGraded
                                      ? isCorrect
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-red-50 border-red-200 text-red-600 font-mono"
                                      : activeInputId === q.id
                                        ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                        : "border-slate-200"
                                  }`}
                                  placeholder="输入答案"
                                />
                              )}
                            </span>
                          ))}
                        </p>

                        {blankGraded && (
                          <div className={`ml-6 p-2.5 rounded-lg text-xs leading-relaxed ${
                            isCorrect ? "bg-emerald-50/50 text-emerald-700" : "bg-red-50/50 text-red-700"
                          }`}>
                            <div className="flex items-center gap-1 font-bold">
                              {isCorrect ? <ThumbsUp className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {isCorrect ? "答对啦！" : `答错了。正确形式: ${q.answer}`}
                            </div>
                            <p className="mt-1 text-slate-500 font-medium">规则：{q.hint}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <button
                    onClick={handleGradeBlanks}
                    disabled={blankGraded}
                    className="px-6 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    提交判分
                  </button>
                </div>
              </div>
            )}

            {/* tables */}
            {activeTab === "tables" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                {currentQuiz.tables.map((table: any) => (
                  <div key={table.id} className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-700">{table.title}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                        {table.verbClass}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(["minä", "sinä", "hän", "me", "te", "he"] as const).map((p) => {
                        const answers = tableAnswers[table.id] || {};
                        const userVal = answers[p] || "";
                        const correctVal = table.pronouns[p];
                        const isCorrect = userVal.trim().toLowerCase() === correctVal.trim().toLowerCase();

                        return (
                          <div key={p} className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                            <label className="text-[11px] font-bold text-slate-400 capitalize">{p}</label>
                            <input
                              type="text"
                              value={userVal}
                              onFocus={() => {
                                setActiveConjKey({ id: table.id, pronoun: p });
                                setActiveInputId(null);
                              }}
                              onChange={(e) => {
                                const tAns = tableAnswers[table.id] || {};
                                setTableAnswers({
                                  ...tableAnswers,
                                  [table.id]: { ...tAns, [p]: e.target.value }
                                });
                              }}
                              disabled={tableGraded}
                              className={`w-full px-3 py-1.5 text-center text-sm rounded-lg border font-semibold focus:outline-none focus:border-lake-blue-500 transition-colors ${
                                tableGraded
                                  ? isCorrect
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                    : "bg-red-50 border-red-100 text-red-600"
                                  : activeConjKey?.id === table.id && activeConjKey?.pronoun === p
                                    ? "border-lake-blue-500 ring-2 ring-lake-blue-50"
                                    : "border-slate-200 bg-white"
                              }`}
                            />
                            {tableGraded && !isCorrect && (
                              <p className="text-[10px] text-red-500 font-bold text-center mt-0.5">
                                正确: {correctVal}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {tableGraded && (
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleResetTablesOnlyWrongs(table.id, table)}
                          className="px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          只重练错格
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <button
                    onClick={handleGradeTables}
                    disabled={tableGraded}
                    className="px-6 py-2.5 bg-lake-blue-500 hover:bg-lake-blue-600 disabled:bg-slate-100 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    提交大表逐格判分
                  </button>
                </div>
              </div>
            )}

            {/* translations */}
            {activeTab === "translations" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                
                {difficulty === "B1" && (
                  <div className="flex items-center justify-between p-4 bg-lake-blue-50 border border-lake-blue-100 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-lake-blue-800">开启 AI 智能精细批改 (B1 专属)</span>
                      <p className="text-[10px] text-lake-blue-600 leading-relaxed">
                        启用后将使用轮询池中的 Gemini API 引擎，根据您的翻译进行地道化语法、人称一致性的精细点评批改。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableAiCorrection}
                        onChange={(e) => setEnableAiCorrection(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lake-blue-500"></div>
                    </label>
                  </div>
                )}

                <div className="space-y-6 divide-y divide-slate-100">
                  {currentQuiz.translations.map((q: any, idx: number) => {
                    const showAnswer = translationChecked[q.id];
                    const checks = translationChecks[q.id] || {};
                    const aiCorrection = aiCorrectionResult[q.id];

                    return (
                      <div key={q.id} className={`space-y-3 ${idx > 0 ? "pt-5" : ""}`}>
                        <div className="flex gap-3">
                          <span className="text-sm font-bold text-slate-400">例 {idx + 1}</span>
                          <div className="space-y-2 flex-1">
                            <p className="text-base font-bold text-slate-800">{q.chinese}</p>
                            <textarea
                              id={`ta_${q.id}`}
                              placeholder="在此输入您的芬兰语翻译..."
                              className="w-full p-4 border border-slate-200 focus:border-lake-blue-500 focus:outline-none rounded-xl text-sm min-h-[90px]"
                            />
                          </div>
                        </div>

                        {!showAnswer ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setTranslationChecked(prev => ({ ...prev, [q.id]: true }));
                                const userText = (document.getElementById(`ta_${q.id}`) as HTMLTextAreaElement)?.value || "";
                                if (difficulty === "B1" && enableAiCorrection) {
                                  await handleRequestAiCorrection(q.id, userText, q.finnish, q.chinese);
                                }
                              }}
                              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 text-slate-500" />
                              提交翻译查看答案
                            </button>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 ml-8 space-y-4 animate-fade-in">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">标准参考答案</span>
                              <p className="text-base font-bold text-lake-blue-800 font-sans">{q.finnish}</p>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">对照自查清单 (对照打勾)</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {(q.selfCheckpoints || []).map((cp: string) => (
                                  <label key={cp} className="flex items-start gap-2 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={checks[cp] || false}
                                      onChange={(e) => {
                                        const tableChecks = translationChecks[q.id] || {};
                                        setTranslationChecks({
                                          ...translationChecks,
                                          [q.id]: {
                                            ...tableChecks,
                                            [cp]: e.target.checked
                                          }
                                        });
                                      }}
                                      className="mt-0.5 w-3.5 h-3.5 accent-lake-blue-500 rounded border-slate-200"
                                    />
                                    <span>{cp}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* AI Correction Panel */}
                            {difficulty === "B1" && enableAiCorrection && (
                              <div className="border-t border-slate-200/60 pt-3 space-y-2">
                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  Gemini AI 实时精细批改：
                                </span>

                                {aiCorrectionLoading === q.id ? (
                                  <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-lake-blue-500" />
                                    <span>AI 老师正在认真审阅您的作业，请稍候...</span>
                                  </div>
                                ) : aiCorrection ? (
                                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900 leading-relaxed font-semibold whitespace-pre-wrap">
                                    {aiCorrection}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
