export interface GrammarFormation {
  label: string;
  rule: string;
  example: string;
}

export interface GrammarTable {
  lemma: string;
  gloss: string;
  rows: Record<string, string>;
}

export interface GrammarCard {
  id: string;
  title: string;
  category: "动词" | "名词格" | "其它";
  level: "A2" | "B1";
  summary: string;
  formation: GrammarFormation[];
  table: GrammarTable | null;
  examples: { fi: string; zh: string }[];
  pitfalls: string;
}

export const grammarLibrary: GrammarCard[] = [
  {
    id: "verb_type_1", title: "1 类动词变位 (-Va, 双元音结尾)", category: "动词", level: "A2",
    summary: "去掉最后一个元音得词干，加人称词尾；hän 把词尾元音拉长（双写）。",
    formation: [
      { label: "第1步", rule: "去掉原形最后一个元音 → 词干", example: "puhua → puhu-" },
      { label: "第2步", rule: "加人称词尾 -n / -t / -∅ / -mme / -tte / -vat", example: "minä puhun" },
      { label: "hän", rule: "词干末元音拉长（双写）", example: "hän puhuu" },
      { label: "kpt", rule: "闭音节人称(minä/sinä/me/te)弱化，hän/he 保持强", example: "ottaa → otan, 但 hän ottaa" }
    ],
    table: { lemma: "puhua", gloss: "说", rows: { "minä": "puhun", "sinä": "puhut", "hän": "puhuu", "me": "puhumme", "te": "puhutte", "he": "puhuvat" } },
    examples: [{ fi: "Minä asun Helsingissä.", zh: "我住在赫尔辛基。" }, { fi: "Me ostamme kirjan.", zh: "我们买一本书。" }],
    pitfalls: "kpt 弱化只在 minä/sinä/me/te，hän/he 不弱化。"
  },
  {
    id: "verb_type_2", title: "2 类动词变位 (-da/-dä)", category: "动词", level: "A2",
    summary: "去掉 -da/-dä 得词干（以长元音/双元音结尾），直接加人称词尾；hän 不加多余词尾。",
    formation: [
      { label: "第1步", rule: "去掉 -da/-dä → 词干", example: "syödä → syö-" },
      { label: "第2步", rule: "加人称词尾；hän 词干不变", example: "minä syön / hän syö" },
      { label: "特殊", rule: "tehdä→tee-、nähdä→näe-", example: "teen, näen" }
    ],
    table: { lemma: "syödä", gloss: "吃", rows: { "minä": "syön", "sinä": "syöt", "hän": "syö", "me": "syömme", "te": "syötte", "he": "syövät" } },
    examples: [{ fi: "Juon vettä.", zh: "我喝水。" }, { fi: "He näkevät ystävän.", zh: "他们看见朋友。" }],
    pitfalls: "tehdä/nähdä 词干是 tee-/näe-（teen, näen），不是 tehd-。"
  },
  {
    id: "verb_type_3", title: "3 类动词变位 (-la/-na/-ra/-sta)", category: "动词", level: "A2",
    summary: "去掉最后两个字母，词干加 -e-，再加人称词尾；hän 双写 e。",
    formation: [
      { label: "第1步", rule: "去掉 -la/-lla/-na/-nä/-ra/-sta 等词尾两字母", example: "tulla → tul-" },
      { label: "第2步", rule: "词干加 -e-", example: "tul- → tule-" },
      { label: "第3步", rule: "加人称词尾；hän 双写 e", example: "tulen / hän tulee" }
    ],
    table: { lemma: "tulla", gloss: "来", rows: { "minä": "tulen", "sinä": "tulet", "hän": "tulee", "me": "tulemme", "te": "tulette", "he": "tulevat" } },
    examples: [{ fi: "Hän menee kouluun.", zh: "他去学校。" }, { fi: "Opiskelen suomea.", zh: "我学习芬兰语。" }],
    pitfalls: "插入的是 -e-（mennä→mene-, opiskella→opiskele-），别忘了。"
  },
  {
    id: "verb_type_4", title: "4 类动词变位 (-ata/-ätä, -ota, -uta…)", category: "动词", level: "A2",
    summary: "去掉 -ta/-tä 得词干（以 a/ä 等元音结尾），加人称词尾；常伴 kpt 强化。",
    formation: [
      { label: "第1步", rule: "去掉 -ta/-tä → 词干", example: "haluta → halua-" },
      { label: "第2步", rule: "加人称词尾；hän 末元音保持(不双写新元音)", example: "haluan / hän haluaa" },
      { label: "kpt", rule: "多有强化：v→p、t→tt 等", example: "tavata → tapaan、siivota → siivoan" }
    ],
    table: { lemma: "haluta", gloss: "想要", rows: { "minä": "haluan", "sinä": "haluat", "hän": "haluaa", "me": "haluamme", "te": "haluatte", "he": "haluavat" } },
    examples: [{ fi: "Tapaan ystävän.", zh: "我见朋友。" }, { fi: "Haluan kahvia.", zh: "我想要咖啡。" }],
    pitfalls: "tavata→tapaan（v→p 强化），不是 tavaan。"
  },
  {
    id: "verb_type_5", title: "5 类动词变位 (-ita/-itä)", category: "动词", level: "B1",
    summary: "去掉 -ta/-tä，词干加 -tse-，再加人称词尾。",
    formation: [
      { label: "第1步", rule: "去掉 -ta/-tä", example: "tarvita → tarvi-" },
      { label: "第2步", rule: "加 -tse-", example: "tarvi- → tarvitse-" },
      { label: "第3步", rule: "加人称词尾；hän 双写 e", example: "tarvitsen / hän tarvitsee" }
    ],
    table: { lemma: "tarvita", gloss: "需要", rows: { "minä": "tarvitsen", "sinä": "tarvitset", "hän": "tarvitsee", "me": "tarvitsemme", "te": "tarvitsette", "he": "tarvitsevat" } },
    examples: [{ fi: "Tarvitsen apua.", zh: "我需要帮助。" }, { fi: "Valitsemme tämän.", zh: "我们选这个。" }],
    pitfalls: "词干是 -tse-（不是 6 类的 -ne-）。书面语 tarvitsen，不是口语 tarvin。"
  },
  {
    id: "verb_type_6", title: "6 类动词变位 (-eta/-etä)", category: "动词", level: "B1",
    summary: "去掉 -ta/-tä，词干加 -ne-，再加人称词尾。多表示状态渐变（变…）。",
    formation: [
      { label: "第1步", rule: "去掉 -ta/-tä", example: "vanheta → vanhe-" },
      { label: "第2步", rule: "加 -ne-", example: "vanhe- → vanhene-" },
      { label: "第3步", rule: "加人称词尾；hän 双写 e", example: "vanhenen / hän vanhenee" }
    ],
    table: { lemma: "vanheta", gloss: "变老", rows: { "minä": "vanhenen", "sinä": "vanhenet", "hän": "vanhenee", "me": "vanhenemme", "te": "vanhenette", "he": "vanhenevat" } },
    examples: [{ fi: "Sää kylmenee.", zh: "天气变冷。" }, { fi: "Pakenen vaaraa.", zh: "我逃离危险。" }],
    pitfalls: "词干是 -ne-（不是 5 类的 -tse-）。kylmetä→kylmenen、paeta→pakenen。"
  },
  {
    id: "imperfekti", title: "过去时 (Imperfekti)", category: "动词", level: "A2",
    summary: "词干 + i + 人称词尾，表已发生。部分动词词干会变（a→o、去元音等）。",
    formation: [
      { label: "基本", rule: "词干 + i + 人称", example: "puhua → puhuin（我说过）" },
      { label: "末 a/ä", rule: "i 前 a/ä 常脱落或 a→o", example: "ostaa → ostin、muistaa → muistin" },
      { label: "末 i", rule: "i 脱落", example: "oppia → opin" }
    ],
    table: { lemma: "puhua", gloss: "说", rows: { "minä": "puhuin", "sinä": "puhuit", "hän": "puhui", "me": "puhuimme", "te": "puhuitte", "he": "puhuivat" } },
    examples: [{ fi: "Eilen olin kotona.", zh: "昨天我在家。" }, { fi: "Luin kirjan.", zh: "我读完了书。" }],
    pitfalls: "olla 过去时不规则：olin, olit, oli, olimme, olitte, olivat。"
  },
  {
    id: "konditionaali", title: "条件式 (Konditionaali, -isi-)", category: "动词", level: "B1",
    summary: "词干 + isi + 人称，表假设、礼貌请求、建议（'会/想要'）。",
    formation: [
      { label: "基本", rule: "词干 + isi + 人称", example: "puhua → puhuisin（我会说）" },
      { label: "礼貌", rule: "用于客气请求", example: "Voisitko auttaa? 你能帮忙吗？" }
    ],
    table: { lemma: "puhua", gloss: "说", rows: { "minä": "puhuisin", "sinä": "puhuisit", "hän": "puhuisi", "me": "puhuisimme", "te": "puhuisitte", "he": "puhuisivat" } },
    examples: [{ fi: "Jos minulla olisi aikaa, lukisin.", zh: "如果我有时间，我就会读书。" }],
    pitfalls: "条件句两个分句都用条件式：Jos olisi… lukisin…。"
  },
  {
    id: "infinitive_1", title: "第一不定式 (A-infinitiivi)", category: "动词", level: "B1",
    summary: "即词典原形，本身就是第一不定式。用在情态/特定动词后。",
    formation: [
      { label: "形式", rule: "动词原形不变", example: "puhua, syödä, mennä" },
      { label: "用法", rule: "接在 haluta/voida/osata/saada/täytyä/pitää/yrittää 等之后", example: "Osaan puhua. 我会说。" }
    ],
    table: null,
    examples: [{ fi: "Haluan syödä.", zh: "我想吃。" }, { fi: "On hauskaa opiskella.", zh: "学习很有趣。" }],
    pitfalls: "情态动词后接原形，不要再变位：Haluan puhua（√），Haluan puhun（✗）。"
  },
  {
    id: "infinitive_2", title: "第二不定式 (E-infinitiivi)", category: "动词", level: "B1",
    summary: "在动词词干上加 -essa/-essä（内格，'在…时'）或 -en（方式格，'…着'）。",
    formation: [
      { label: "内格 -essa/-essä", rule: "'在做某事的时候'", example: "puhua → puhuessa（说话时）、syödä → syödessä（吃饭时）" },
      { label: "方式格 -en", rule: "'……着/伴随状态'", example: "juosta → juosten（跑着）、puhua → puhuen" }
    ],
    table: null,
    examples: [{ fi: "Syödessä ei saa puhua.", zh: "吃饭时不能说话。" }, { fi: "Hän tuli juosten.", zh: "他跑着来了。" }],
    pitfalls: "内格表'时间同时'，方式格 -en 表'怎样地'。"
  },
  {
    id: "infinitive_3", title: "第三不定式 (MA-infinitiivi)", category: "动词", level: "B1",
    summary: "词干加 ma/mä，再配不同格表示'去做/正在做/做完/通过/没做'。",
    formation: [
      { label: "-maan/-mään（入格）", rule: "去做某事", example: "Menen ostamaan ruokaa. 我去买吃的。" },
      { label: "-massa/-mässä（内格）", rule: "正在做某事（在某处）", example: "Olen lukemassa. 我在读书。" },
      { label: "-masta/-mästä（出格）", rule: "做完回来 / 停止", example: "Tulen syömästä. 我吃完回来。" },
      { label: "-malla/-mällä（工具格）", rule: "通过做某事", example: "Opin puhumalla. 通过说来学。" },
      { label: "-matta/-mättä（无格）", rule: "没做某事就…", example: "Lähti sanomatta mitään. 没说话就走了。" }
    ],
    table: { lemma: "ostaa", gloss: "买", rows: { "去买 -maan": "ostamaan", "正在买 -massa": "ostamassa", "买完 -masta": "ostamasta", "通过买 -malla": "ostamalla", "没买 -matta": "ostamatta" } },
    examples: [{ fi: "Olen koulussa opiskelemassa.", zh: "我在学校学习。" }],
    pitfalls: "'去做'用 -maan（Menen syömään），不要用原形（Menen syödä ✗）。"
  },
  {
    id: "noun_sing_gen", title: "单数属格 (Genetiivi)", category: "名词格", level: "A2",
    summary: "词干 + -n，表'的'/后置词前/必要性主语；触发 kpt 弱化。",
    formation: [
      { label: "基本", rule: "词干 + n", example: "talo → talon、kissa → kissan" },
      { label: "kpt", rule: "弱化", example: "kauppa → kaupan、katu → kadun" },
      { label: "-i 旧词", rule: "i → e + n", example: "Suomi → Suomen、vesi → veden" },
      { label: "-nen", rule: "-nen → -sen", example: "nainen → naisen" },
      { label: "-us/-ys", rule: "→ -ukse- + n", example: "vastaus → vastauksen" }
    ],
    table: { lemma: "—", gloss: "示例", rows: { "talo": "talon", "kissa": "kissan", "mies": "miehen", "käsi": "käden", "kauppa": "kaupan" } },
    examples: [{ fi: "Tämä on isän kirja.", zh: "这是爸爸的书。" }, { fi: "Minun täytyy mennä.", zh: "我必须走。(必要性主语用属格)" }],
    pitfalls: "必要性结构 täytyä/pitää 的主语用属格：Minun täytyy（√），Minä täytyy（✗）。"
  },
  {
    id: "noun_plur_gen", title: "复数属格 (Monikon genetiivi)", category: "名词格", level: "B1",
    summary: "多个对象的'的'。词尾多样：-jen/-ien/-ten/-den(-tten)，常基于复数词干。",
    formation: [
      { label: "-jen", rule: "元音词干常加 -jen", example: "talo → talojen" },
      { label: "-ien", rule: "", example: "ystävä → ystävien" },
      { label: "-ten", rule: "辅音词干 -ten", example: "lapsi → lasten、mies → miesten" },
      { label: "-den/-iden", rule: "双元音/长词", example: "maa → maiden、opiskelija → opiskelijoiden" }
    ],
    table: { lemma: "—", gloss: "示例", rows: { "talo": "talojen", "maa": "maiden", "lapsi": "lasten", "kissa": "kissojen", "ystävä": "ystävien" } },
    examples: [{ fi: "Kissojen nimet ovat söpöjä.", zh: "这些猫的名字很可爱。" }],
    pitfalls: "现代标准用 -iden/-jen 等；古旧诗体 -ain/-äin（kissain）已少用。"
  },
  {
    id: "noun_sing_part", title: "单数部分格 (Partitiivi)", category: "名词格", level: "A2",
    summary: "数词后、否定句、未完成、不可数时用。词尾三套：-a/-ä、-ta/-tä、-tta/-ttä。",
    formation: [
      { label: "-a/-ä（基本）", rule: "多数词直接加", example: "talo → taloa、kirja → kirjaa" },
      { label: "-ta/-tä", rule: "辅音结尾/某些 -i 词/外来词", example: "mies → miestä、lapsi → lasta" },
      { label: "-tta/-ttä", rule: "-e 结尾词（双写 t）", example: "huone → huonetta、perhe → perhettä" },
      { label: "特殊", rule: "需单独记", example: "vesi → vettä" }
    ],
    table: { lemma: "—", gloss: "示例", rows: { "talo": "taloa", "kirja": "kirjaa", "mies": "miestä", "huone": "huonetta", "vesi": "vettä" } },
    examples: [{ fi: "Juon vettä.", zh: "我喝水。" }, { fi: "En osta kirjaa.", zh: "我不买书。(否定→部分格)" }, { fi: "Kolme taloa.", zh: "三座房子。(数词后)" }],
    pitfalls: "数词(除 yksi)后一律部分格：kaksi autoa（√），kaksi autot（✗）。"
  },
  {
    id: "noun_plur_part", title: "复数部分格 (Monikon partitiivi)", category: "名词格", level: "A2",
    summary: "多个对象 + 部分格环境（一些/许多/否定/存在句）。核心是'多个但不是完整确定的一整组'。",
    formation: [
      { label: "元音 -o/-ö/-u/-y", rule: "直接加 -ja/-jä", example: "talo → taloja、tyttö → tyttöjä" },
      { label: "-a/-ä（首音节 a/e/i）", rule: "a/ä 先变 o，再加 ja", example: "kirja → kirjoja、kissa → kissoja" },
      { label: "双元音结尾", rule: "去前一元音 + -ita/-itä", example: "maa → maita、työ → töitä" },
      { label: "-nen", rule: "-nen→-se→去e + -iä", example: "nainen → naisia、ihminen → ihmisiä" },
      { label: "-us/-ys", rule: "→-kse→去e + -ia", example: "kysymys → kysymyksiä" },
      { label: "-i（新词）", rule: "i→e + ja/jä", example: "bussi → busseja、pankki → pankkeja" },
      { label: "-i（旧词）/ -e", rule: "加 -a/ä 或 -ita", example: "lapsi → lapsia、huone → huoneita" }
    ],
    table: { lemma: "—", gloss: "示例", rows: { "kirja": "kirjoja", "maa": "maita", "nainen": "naisia", "kysymys": "kysymyksiä", "bussi": "busseja", "lapsi": "lapsia" } },
    examples: [{ fi: "Ostin kirjoja.", zh: "我买了一些书。" }, { fi: "Pöydällä on omenoita.", zh: "桌上有一些苹果。" }, { fi: "En nähnyt ihmisiä.", zh: "我没看到人。" }],
    pitfalls: "别按中文'一些/很多'机械判断；要看芬兰语句法环境（数量词、否定、存在句）。"
  },
  {
    id: "noun_plur_nom", title: "复数主格 (Monikon nominatiivi, T-plural)", category: "名词格", level: "A2",
    summary: "词干 + -t，表多个确定/完整的对象，或复数主语；触发 kpt 弱化。",
    formation: [
      { label: "基本", rule: "词干 + t", example: "talo → talot、kissa → kissat" },
      { label: "kpt", rule: "弱化", example: "tyttö → tytöt、katu → kadut" },
      { label: "辅音词干", rule: "", example: "mies → miehet、lapsi → lapset" }
    ],
    table: { lemma: "—", gloss: "示例", rows: { "talo": "talot", "kissa": "kissat", "mies": "miehet", "käsi": "kädet", "lapsi": "lapset" } },
    examples: [{ fi: "Kissat nukkuvat.", zh: "猫们在睡觉。(复数主语)" }, { fi: "Syön kaikki omenat.", zh: "我吃掉所有这些苹果。(完整全部)" }],
    pitfalls: "数字后不用 T-plural（用部分格）；存在句'有一些'用复数部分格，不用复数主格。"
  },
  {
    id: "locatives_six", title: "地点格六件套 (Paikallissijat)", category: "名词格", level: "A2",
    summary: "内三格(在里/从里/到里) + 外三格(在上/从上/到上)。都基于属格词干（kpt 弱化）。",
    formation: [
      { label: "内格 -ssa/-ssä", rule: "在…里面（抽象/内部）", example: "talossa（在房子里）" },
      { label: "出格 -sta/-stä", rule: "从…里面出来", example: "talosta（从房子里）" },
      { label: "入格 -Vn/-hVn/-seen", rule: "到…里面去", example: "taloon（到房子里）" },
      { label: "所格 -lla/-llä", rule: "在…上面 / 用工具", example: "talolla、bussilla（坐公交）" },
      { label: "离格 -lta/-ltä", rule: "从…上面", example: "talolta" },
      { label: "向格 -lle", rule: "到…上面 / 给某人", example: "talolle、minulle（给我）" }
    ],
    table: { lemma: "talo", gloss: "房子", rows: { "内格": "talossa", "出格": "talosta", "入格": "taloon", "所格": "talolla", "离格": "talolta", "向格": "talolle" } },
    examples: [{ fi: "Menen Suomesta Kiinaan.", zh: "我从芬兰去中国。(出格→入格)" }, { fi: "Tulen bussilla.", zh: "我坐公交来。(所格表工具)" }],
    pitfalls: "交通工具用所格 -lla（bussilla）；'给某人'用向格 -lle（minulle）。"
  },
  {
    id: "kpt_weak", title: "辅音弱化 (KPT-vaihtelu)", category: "其它", level: "A2",
    summary: "k/p/t 在闭音节里弱化；属格、复数等格变化常触发。开音节强，闭音节弱。",
    formation: [
      { label: "kk→k", rule: "", example: "pankki → pankin" },
      { label: "pp→p", rule: "", example: "kauppa → kaupan" },
      { label: "tt→t", rule: "", example: "tyttö → tytön" },
      { label: "k→∅/v", rule: "k 消失或变 v", example: "luku → luvun、Turku → Turussa" },
      { label: "p→v", rule: "", example: "leipä → leivän" },
      { label: "t→d", rule: "", example: "katu → kadun" },
      { label: "nk→ng", rule: "", example: "Helsinki → Helsingissä" },
      { label: "nt→nn, mp→mm, lt→ll, rt→rr", rule: "同化", example: "ranta → rannan、lampi → lammen、ilta → illan" }
    ],
    table: null,
    examples: [{ fi: "Asun Helsingissä.", zh: "我住赫尔辛基。(nk→ng)" }, { fi: "Tämä on Pekan auto.", zh: "这是 Pekka 的车。(kk→k)" }],
    pitfalls: "属格/复数主格触发弱化；单数部分格多数不弱化（kauppaa 不是 kaupaa）。"
  },
];

export const GRAMMAR_CATEGORIES: { key: GrammarCard["category"]; label: string }[] = [
  { key: "动词", label: "动词变位" },
  { key: "名词格", label: "名词格变化" },
  { key: "其它", label: "其它规则" },
];
