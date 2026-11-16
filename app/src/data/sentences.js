// Sentence curriculum: a small, controlled set of everyday words, combined into the
// core sentence patterns of Japanese — one new pattern per lesson.
//
// Words use furigana notation: kanji followed by its reading in brackets, e.g.
// "飲[の]みます". Sentences are lists of "wordId:ROLE" tokens (a trailing "," adds a
// comma after the word). Roles color the sentence into its building blocks:
//   T topic (は)   S subject (が)   O object (を)   L place / destination (に, で)
//   M time         V the predicate at the end (verb, です…)   Q anything else

export const ROLES = {
  T: { name: "Topic", hint: "what you're talking about", cls: "bg-sky-50 border-sky-200 text-sky-800", dot: "bg-sky-400" },
  S: { name: "Subject", hint: "what exists / is liked", cls: "bg-violet-50 border-violet-200 text-violet-800", dot: "bg-violet-400" },
  O: { name: "Object", hint: "what the action is done to", cls: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-400" },
  L: { name: "Place", hint: "where to / where", cls: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-400" },
  M: { name: "Time", hint: "when", cls: "bg-teal-50 border-teal-200 text-teal-800", dot: "bg-teal-400" },
  V: { name: "Ending", hint: "the verb / です — always last", cls: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-400" },
  Q: { name: "Other", hint: "", cls: "bg-stone-50 border-stone-200 text-stone-700", dot: "bg-stone-300" },
};

// Particles that close a phrase. か (question) is sentence-final, so it isn't one of them.
export const PARTICLE_NOTES = {
  wa: "は (read “wa”) marks the topic — “as for …”.",
  o: "を (read “o”) marks the object — what the action is done to.",
  ni: "に marks where you go (“to”) or where something is.",
  de: "で marks where an action happens (“at / in”).",
  ga: "が marks what exists, or what is liked.",
  mo: "も means “also / too”. It takes the place of は, が or を.",
  to: "と after a person means “with”. Between two things it means “and”.",
  kara: "から marks the starting point — “from” a place or a time.",
  made: "まで marks the end point — “until” a time, “as far as” a place.",
};

// [id, japanese (with furigana), romaji, english gloss]
const WORDS = [
  // particles
  ["wa", "は", "wa", "(topic)"], ["ga", "が", "ga", "(subject)"], ["o", "を", "o", "(object)"],
  ["ni", "に", "ni", "to"], ["de", "で", "de", "at"], ["ka", "か", "ka", "?"],
  // people & pointing
  ["watashi", "私[わたし]", "watashi", "I"], ["tanaka", "田中[たなか]さん", "Tanaka-san", "Mr/Ms Tanaka"],
  ["tomodachi", "友達[ともだち]", "tomodachi", "friend"], ["kore", "これ", "kore", "this"],
  ["koko", "ここ", "koko", "here"], ["doko", "どこ", "doko", "where"],
  ["nan", "何[なん]", "nan", "what"], ["nani", "何[なに]", "nani", "what"],
  ["hai", "はい", "hai", "yes"], ["iie", "いいえ", "iie", "no"],
  // people's roles
  ["kaishain", "会社員[かいしゃいん]", "kaishain", "office worker"], ["sensei", "先生[せんせい]", "sensei", "teacher"],
  ["gakusei", "学生[がくせい]", "gakusei", "student"], ["doitsujin", "ドイツ人[じん]", "doitsujin", "German (person)"],
  // food & drink
  ["mizu", "水[みず]", "mizu", "water"], ["koohii", "コーヒー", "koohii", "coffee"], ["ocha", "お茶[ちゃ]", "ocha", "tea"],
  ["biiru", "ビール", "biiru", "beer"], ["osake", "お酒[さけ]", "osake", "alcohol"], ["gohan", "ご飯[はん]", "gohan", "meal / rice"],
  ["pan", "パン", "pan", "bread"], ["niku", "肉[にく]", "niku", "meat"], ["sushi", "寿司[すし]", "sushi", "sushi"],
  ["menyuu", "メニュー", "menyuu", "menu"],
  // things & activities
  ["hon", "本[ほん]", "hon", "book"], ["terebi", "テレビ", "terebi", "TV"], ["eiga", "映画[えいが]", "eiga", "movie"],
  ["nihongo", "日本語[にほんご]", "nihongo", "Japanese"], ["neko", "猫[ねこ]", "neko", "cat"], ["jikan", "時間[じかん]", "jikan", "time"],
  // places
  ["nihon", "日本[にほん]", "nihon", "Japan"], ["toukyou", "東京[とうきょう]", "toukyou", "Tokyo"], ["eki", "駅[えき]", "eki", "station"],
  ["ie", "家[いえ]", "ie", "home"], ["kaisha", "会社[かいしゃ]", "kaisha", "office"], ["toire", "トイレ", "toire", "toilet"],
  ["konbini", "コンビニ", "konbini", "convenience store"], ["resutoran", "レストラン", "resutoran", "restaurant"],
  // time & amounts
  ["ashita", "明日[あした]", "ashita", "tomorrow"], ["kinou", "昨日[きのう]", "kinou", "yesterday"],
  ["mainichi", "毎日[まいにち]", "mainichi", "every day"],
  ["hitotsu", "一[ひと]つ", "hitotsu", "one (thing)"], ["futatsu", "二[ふた]つ", "futatsu", "two (things)"], ["mittsu", "三[みっ]つ", "mittsu", "three (things)"],
  // endings
  ["desu", "です", "desu", "is"], ["janai", "じゃないです", "ja nai desu", "is not"], ["kudasai", "ください", "kudasai", "please give"],
  ["arimasu", "あります", "arimasu", "there is (thing)"], ["arimasen", "ありません", "arimasen", "there isn't"],
  ["imasu", "います", "imasu", "there is (living)"], ["suki", "好[す]き", "suki", "liked"],
  ["nomimasu", "飲[の]みます", "nomimasu", "drink"], ["tabemasu", "食[た]べます", "tabemasu", "eat"], ["mimasu", "見[み]ます", "mimasu", "watch"],
  ["yomimasu", "読[よ]みます", "yomimasu", "read"], ["kaimasu", "買[か]います", "kaimasu", "buy"],
  ["benkyou", "勉強[べんきょう]します", "benkyou shimasu", "study"], ["ikimasu", "行[い]きます", "ikimasu", "go"],
  ["kaerimasu", "帰[かえ]ります", "kaerimasu", "go home"], ["hatarakimasu", "働[はたら]きます", "hatarakimasu", "work"],
  ["nomimasen", "飲[の]みません", "nomimasen", "don't drink"], ["tabemasen", "食[た]べません", "tabemasen", "don't eat"],
  ["mimasen", "見[み]ません", "mimasen", "don't watch"],
  ["ikitai", "行[い]きたい", "ikitai", "want to go"], ["tabetai", "食[た]べたい", "tabetai", "want to eat"],
  ["nomitai", "飲[の]みたい", "nomitai", "want to drink"], ["hanashitai", "話[はな]したい", "hanashitai", "want to speak"],
  ["tabemashita", "食[た]べました", "tabemashita", "ate"], ["ikimashita", "行[い]きました", "ikimashita", "went"],
  ["mimashita", "見[み]ました", "mimashita", "watched"], ["nomimashita", "飲[の]みました", "nomimashita", "drank"],
  ["benkyoushita", "勉強[べんきょう]しました", "benkyou shimashita", "studied"],
  // ----- lessons 13–20 -----
  // more particles; "and" is the と between two things, "to" the と after a person
  ["no", "の", "no", "'s / of"], ["mo", "も", "mo", "also"], ["and", "と", "to", "and"], ["to", "と", "to", "with"],
  ["kara", "から", "kara", "from"], ["made", "まで", "made", "until / up to"],
  ["dare", "誰[だれ]", "dare", "who"], ["doitsu", "ドイツ", "doitsu", "Germany"], ["kyou", "今日[きょう]", "kyou", "today"],
  ["issho", "一緒[いっしょ]に", "issho ni", "together"],
  // describing words (い-adjectives)
  ["oishii", "おいしい", "oishii", "delicious"], ["takai", "高[たか]い", "takai", "expensive"], ["yasui", "安[やす]い", "yasui", "cheap"],
  ["ookii", "大[おお]きい", "ookii", "big"], ["tanoshii", "楽[たの]しい", "tanoshii", "fun"], ["atsui", "暑[あつ]い", "atsui", "hot"],
  ["atarashii", "新[あたら]しい", "atarashii", "new"], ["ii", "いい", "ii", "good"],
  // clock times
  ["nanji", "何時[なんじ]", "nanji", "what time"], ["sanji", "三時[さんじ]", "sanji", "3 o'clock"], ["goji", "五時[ごじ]", "goji", "5 o'clock"],
  ["rokuji", "六時[ろくじ]", "rokuji", "6 o'clock"], ["shichiji", "七時[しちじ]", "shichiji", "7 o'clock"],
  ["hachiji", "八時[はちじ]", "hachiji", "8 o'clock"], ["kuji", "九時[くじ]", "kuji", "9 o'clock"],
  // more verb forms
  ["okimasu", "起[お]きます", "okimasu", "get up"], ["kimashita", "来[き]ました", "kimashita", "came"],
  ["ikimasen", "行[い]きません", "ikimasen", "don't go"],
  ["ikimashou", "行[い]きましょう", "ikimashou", "let's go"], ["tabemashou", "食[た]べましょう", "tabemashou", "let's eat"],
  ["nomimashou", "飲[の]みましょう", "nomimashou", "let's drink"],
];

const PHRASE_PARTICLES = new Set(["wa", "ga", "o", "ni", "de", "mo", "to", "kara", "made"]);
// Words that tie their neighbours into one phrase: の and the "and" と join the word
// before and after (私の本, パンと水); a describing word belongs to the word after it
// (おいしい寿司). Such a group moves through the sentence as one block.
const GLUE = new Set(["no", "and"]);
const PRE = new Set(["oishii", "takai", "yasui", "ookii", "tanoshii", "atsui", "atarashii", "ii"]);

export const LEXICON = Object.fromEntries(
  WORDS.map(([id, jp, ro, en]) => [id, { id, jp, ro, en, particle: PHRASE_PARTICLES.has(id), glue: GLUE.has(id), pre: PRE.has(id) }]),
);

// Each lesson: one pattern. `formula` blocks render as the colored pattern
// header; `note` is the whole explanation — kept to a few lines on purpose.
const LESSON_DEFS = [
  {
    id: "desu", title: "Say what something is — です", gist: "e.g. “This is water.”",
    formula: [["T", "X"], ["T", "は"], ["V", "Y"], ["V", "です"]],
    note: "は (read “wa”) marks the topic — what you're talking about. です at the end means “is / am / are”. It never changes: same for I, you, he, she, it.",
    sentences: [
      ["kore:T wa:T mizu:V desu:V", "This is water."],
      ["kore:T wa:T koohii:V desu:V", "This is coffee."],
      ["watashi:T wa:T kaishain:V desu:V", "I am an office worker."],
      ["watashi:T wa:T doitsujin:V desu:V", "I am German."],
      ["tanaka:T wa:T sensei:V desu:V", "Tanaka-san is a teacher."],
      ["koko:T wa:T eki:V desu:V", "This is the station."],
    ],
  },
  {
    id: "questions", title: "Ask and answer — か · じゃない", gist: "e.g. “Is this tea? — No, it isn't.”",
    formula: [["T", "X"], ["T", "は"], ["V", "Y"], ["V", "です"], ["Q", "か"]],
    note: "Add か to the end and it's a question — nothing else moves. For “is not”, swap です for じゃないです.",
    sentences: [
      ["kore:T wa:T ocha:V desu:V ka:V", "Is this tea?"],
      ["hai:Q, ocha:V desu:V", "Yes, it's tea."],
      ["iie:Q, ocha:V janai:V", "No, it isn't tea."],
      ["tanaka:T wa:T sensei:V desu:V ka:V", "Is Tanaka-san a teacher?"],
      ["watashi:T wa:T gakusei:V janai:V", "I'm not a student."],
      ["toire:T wa:T doko:V desu:V ka:V", "Where is the toilet?"],
      ["eki:T wa:T doko:V desu:V ka:V", "Where is the station?"],
    ],
  },
  {
    id: "kudasai", title: "Ask for things — ください", gist: "e.g. “Water, please.”",
    formula: [["O", "X"], ["O", "を"], ["V", "ください"]],
    note: "を (read “o”) marks the thing. ください = “please give me”. This one pattern gets you through cafés, shops and restaurants.",
    // A third entry is a fixed sentence id: these sentences were added, or moved to the
    // next lesson, after learners had progress stored under the ids by position.
    sentences: [
      ["mizu:O o:O kudasai:V", "Water, please."],
      ["koohii:O o:O kudasai:V", "Coffee, please."],
      ["kore:O o:O kudasai:V", "This one, please."],
      ["menyuu:O o:O kudasai:V", "The menu, please."],
      ["biiru:O o:O kudasai:V", "Beer, please.", "kudasai-beer"],
      ["ocha:O o:O kudasai:V", "Tea, please.", "kudasai-tea"],
    ],
  },
  {
    id: "howmany", title: "Say how many — 一つ · 二つ", gist: "e.g. “Two beers, please.”",
    formula: [["O", "X"], ["O", "を"], ["Q", "二つ"], ["V", "ください"]],
    note: "To say how many, put the number right before ください: {コーヒーを二[ふた]つください} — two coffees, please.",
    // Shown as an extra box on the lesson page; the numbers can be tapped to hear them.
    box: {
      title: "Counting things",
      items: [["一[ひと]つ", "hitotsu", "1"], ["二[ふた]つ", "futatsu", "2"], ["三[みっ]つ", "mittsu", "3"], ["四[よっ]つ", "yottsu", "4"], ["五[いつ]つ", "itsutsu", "5"]],
      notes: [
        "These numbers work for almost anything you order or buy: coffee, beer, cake, tickets. You don't have to think about what the thing is.",
      ],
    },
    sentences: [
      ["biiru:O o:O futatsu:Q kudasai:V", "Two beers, please.", "kudasai-4"],
      ["ocha:O o:O hitotsu:Q kudasai:V", "One tea, please.", "kudasai-5"],
      ["koohii:O o:O mittsu:Q kudasai:V", "Three coffees, please.", "kudasai-6"],
      ["kore:O o:O futatsu:Q kudasai:V", "Two of these, please."],
      ["mizu:O o:O mittsu:Q kudasai:V", "Three waters, please."],
      ["biiru:O o:O hitotsu:Q kudasai:V", "One beer, please."],
    ],
  },
  {
    id: "verbs", title: "Say what you do — ます", gist: "e.g. “I drink coffee.”",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ます"]],
    note: "The verb always comes last. ます is the polite ending — use it with everyone. You don't need to say “I”; it's understood.",
    sentences: [
      ["koohii:O o:O nomimasu:V", "I drink coffee."],
      ["gohan:O o:O tabemasu:V", "I eat (a meal)."],
      ["nihongo:O o:O benkyou:V", "I study Japanese."],
      ["terebi:O o:O mimasu:V", "I watch TV."],
      ["hon:O o:O yomimasu:V", "I read a book."],
      ["pan:O o:O kaimasu:V", "I buy bread."],
    ],
  },
  {
    id: "full", title: "Say who does what — は · を", gist: "e.g. “I study Japanese every day.”",
    formula: [["T", "X"], ["T", "は"], ["O", "Y"], ["O", "を"], ["V", "verb"]],
    note: "Put the blocks together: topic は, object を, verb last. A time word like 毎日 (every day) needs no particle.",
    sentences: [
      ["watashi:T wa:T koohii:O o:O nomimasu:V", "I drink coffee."],
      ["tanaka:T wa:T hon:O o:O yomimasu:V", "Tanaka-san reads a book."],
      ["watashi:T wa:T mainichi:M nihongo:O o:O benkyou:V", "I study Japanese every day."],
      ["tomodachi:T wa:T eiga:O o:O mimasu:V", "My friend watches a movie."],
      ["watashi:T wa:T mainichi:M pan:O o:O tabemasu:V", "I eat bread every day."],
    ],
  },
  {
    id: "masen", title: "Say what you don't do — ません", gist: "e.g. “I don't eat meat.”",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ません"]],
    note: "For “don't”, change ます to ません. Everything else stays the same. Great for food: {肉[にく]を食[た]べません} — I don't eat meat.",
    sentences: [
      ["watashi:T wa:T osake:O o:O nomimasen:V", "I don't drink alcohol."],
      ["niku:O o:O tabemasen:V", "I don't eat meat."],
      ["terebi:O o:O mimasen:V", "I don't watch TV."],
      ["tanaka:T wa:T koohii:O o:O nomimasen:V", "Tanaka-san doesn't drink coffee."],
      ["koohii:O o:O nomimasu:V ka:V", "Do you drink coffee?"],
      ["iie:Q, nomimasen:V", "No, I don't drink (it)."],
    ],
  },
  {
    id: "ni", title: "Say where you go — に", gist: "e.g. “I'm going to Tokyo.”",
    formula: [["L", "place"], ["L", "に"], ["V", "行きます"]],
    note: "に marks the destination: “to”. 帰ります means going back — home, or to your own country.",
    sentences: [
      ["eki:L ni:L ikimasu:V", "I go to the station."],
      ["toukyou:L ni:L ikimasu:V", "I go to Tokyo."],
      ["ashita:M, nihon:L ni:L ikimasu:V", "Tomorrow I'm going to Japan."],
      ["kaisha:L ni:L ikimasu:V", "I go to the office."],
      ["ie:L ni:L kaerimasu:V", "I go home."],
      ["doko:L ni:L ikimasu:V ka:V", "Where are you going?"],
    ],
  },
  {
    id: "de", title: "Say where you do it — で", gist: "e.g. “I eat at a restaurant.”",
    formula: [["L", "place"], ["L", "で"], ["O", "X"], ["O", "を"], ["V", "verb"]],
    note: "で marks where an action happens: “at / in”. Compare {駅[えき]に行[い]きます} (go TO the station) with {駅[えき]で飲[の]みます} (drink AT the station).",
    sentences: [
      ["ie:L de:L nihongo:O o:O benkyou:V", "I study Japanese at home."],
      ["konbini:L de:L mizu:O o:O kaimasu:V", "I buy water at the convenience store."],
      ["resutoran:L de:L gohan:O o:O tabemasu:V", "I eat at a restaurant."],
      ["kaisha:L de:L hatarakimasu:V", "I work at an office."],
      ["eki:L de:L koohii:O o:O nomimasu:V", "I drink coffee at the station."],
      ["doko:L de:L tabemasu:V ka:V", "Where shall we eat?"],
    ],
  },
  {
    id: "arimasu", title: "Say what there is — あります", gist: "e.g. “Do you have water?”",
    formula: [["S", "X"], ["S", "が"], ["V", "あります"]],
    note: "あります = there is / I have (things). います is for people and animals. が marks the thing that exists. Where it is takes に.",
    sentences: [
      ["mizu:S ga:S arimasu:V ka:V", "Do you have water?"],
      ["menyuu:S ga:S arimasu:V ka:V", "Is there a menu?"],
      ["jikan:S ga:S arimasen:V", "I don't have time."],
      ["neko:S ga:S imasu:V", "There's a cat."],
      ["tomodachi:S ga:S imasu:V", "I have a friend (here)."],
      ["eki:L ni:L konbini:S ga:S arimasu:V", "There's a convenience store at the station."],
    ],
  },
  {
    id: "suki", title: "Say what you like — 好きです", gist: "e.g. “I like sushi.”",
    formula: [["T", "X"], ["T", "は"], ["S", "Y"], ["S", "が"], ["V", "好きです"]],
    note: "What you like takes が, not を. 好きです literally means “is liked”. Not liked: {好[す]きじゃないです}.",
    sentences: [
      ["watashi:T wa:T sushi:S ga:S suki:V desu:V", "I like sushi."],
      ["nihon:S ga:S suki:V desu:V", "I like Japan."],
      ["neko:S ga:S suki:V desu:V", "I like cats."],
      ["koohii:S ga:S suki:V desu:V ka:V", "Do you like coffee?"],
      ["niku:S ga:S suki:V janai:V", "I don't like meat."],
    ],
  },
  {
    id: "tai", title: "Say what you want to do — たいです", gist: "e.g. “I want to go to Japan.”",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-たい"], ["V", "です"]],
    note: "Swap ます for たいです to say “want to”: {行[い]きます} → {行[い]きたいです}.",
    sentences: [
      ["nihon:L ni:L ikitai:V desu:V", "I want to go to Japan."],
      ["sushi:O o:O tabetai:V desu:V", "I want to eat sushi."],
      ["nihongo:O o:O hanashitai:V desu:V", "I want to speak Japanese."],
      ["mizu:O o:O nomitai:V desu:V", "I want to drink water."],
      ["nani:O o:O nomitai:V desu:V ka:V", "What do you want to drink?"],
    ],
  },
  {
    id: "mashita", title: "Say what you did — ました", gist: "e.g. “Yesterday I ate sushi.”",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ました"]],
    note: "Swap ます for ました for the past: {行[い]きます} → {行[い]きました}. Add か to ask: {飲[の]みましたか} — did you drink?",
    sentences: [
      ["kinou:M, sushi:O o:O tabemashita:V", "Yesterday I ate sushi."],
      ["toukyou:L ni:L ikimashita:V", "I went to Tokyo."],
      ["kinou:M, eiga:O o:O mimashita:V", "Yesterday I watched a movie."],
      ["nihongo:O o:O benkyoushita:V", "I studied Japanese."],
      ["koohii:O o:O nomimashita:V ka:V", "Did you drink coffee?"],
    ],
  },
  {
    id: "no", title: "Say whose it is — の", gist: "e.g. “This is my book.”",
    formula: [["T", "X"], ["T", "の"], ["T", "Y"]],
    note: "の links two nouns: the first one describes the second. {私[わたし]の本[ほん]} = my book, {日本語[にほんご]の本[ほん]} = a Japanese book, {友達[ともだち]の家[いえ]} = my friend's house. The main word always comes last.",
    sentences: [
      ["kore:T wa:T watashi:V no:V hon:V desu:V", "This is my book."],
      ["kore:T wa:T dare:V no:V koohii:V desu:V ka:V", "Whose coffee is this?"],
      ["tanaka:V no:V desu:V", "It's Tanaka-san's."],
      ["watashi:T no:T tomodachi:T wa:T sensei:V desu:V", "My friend is a teacher."],
      ["nihongo:O no:O hon:O o:O yomimasu:V", "I read a Japanese book."],
      ["tomodachi:L no:L ie:L ni:L ikimasu:V", "I go to my friend's house."],
    ],
  },
  {
    id: "mo", title: "Say “me too” — も", gist: "e.g. “I'm going too.”",
    formula: [["T", "X"], ["T", "も"], ["V", "…"]],
    note: "も means “also / too”. It replaces は, が or を — never both together: {私[わたし]は行[い]きます} → {私[わたし]も行[い]きます}.",
    sentences: [
      ["watashi:T mo:T ikimasu:V", "I'm going too."],
      ["watashi:T mo:T gakusei:V desu:V", "I'm a student too."],
      ["kore:O mo:O kudasai:V", "This one too, please."],
      ["sushi:S mo:S suki:V desu:V", "I like sushi too."],
      ["tanaka:T mo:T koohii:O o:O nomimasu:V", "Tanaka-san drinks coffee too."],
      ["watashi:T mo:T nihon:L ni:L ikitai:V desu:V", "I want to go to Japan too."],
    ],
  },
  {
    id: "to", title: "Say “and” and “with” — と", gist: "e.g. “Bread and water.” “With a friend.”",
    formula: [["O", "X"], ["O", "と"], ["O", "Y"]],
    note: "と between two things means “and”: {パンと水[みず]}. After a person it means “with”: {友達[ともだち]と} = with a friend. It only joins nouns — never whole sentences.",
    sentences: [
      ["pan:O and:O mizu:O o:O kaimasu:V", "I buy bread and water."],
      ["biiru:O and:O sushi:O o:O kudasai:V", "Beer and sushi, please."],
      ["koohii:S and:S ocha:S ga:S arimasu:V", "There's coffee and tea."],
      ["tomodachi:Q to:Q eiga:O o:O mimasu:V", "I watch a movie with a friend."],
      ["tanaka:Q to:Q toukyou:L ni:L ikimashita:V", "I went to Tokyo with Tanaka-san."],
      ["dare:Q to:Q ikimasu:V ka:V", "Who are you going with?"],
    ],
  },
  {
    id: "adjectives", title: "Say what it's like — 〜いです", gist: "e.g. “This is delicious.”",
    formula: [["T", "X"], ["T", "は"], ["V", "〜い"], ["V", "です"]],
    note: "Describing words like おいしい (delicious) end in い and go straight before です. No extra word for “is” — です just makes it polite.",
    sentences: [
      ["kore:T wa:T oishii:V desu:V", "This is delicious."],
      ["sushi:T wa:T oishii:V desu:V ka:V", "Is the sushi good?"],
      ["nihongo:T wa:T tanoshii:V desu:V", "Japanese is fun."],
      ["toukyou:T wa:T ookii:V desu:V", "Tokyo is big."],
      ["kyou:T wa:T atsui:V desu:V", "It's hot today."],
      ["kore:T wa:T takai:V desu:V", "This is expensive."],
    ],
  },
  {
    id: "adjnoun", title: "Describe a thing — おいしい寿司", gist: "e.g. “I ate delicious sushi.”",
    formula: [["O", "〜い"], ["O", "X"], ["O", "を"], ["V", "verb"]],
    note: "A describing word goes directly before its noun — nothing in between: {おいしい寿司[すし]} = delicious sushi, {新[あたら]しい本[ほん]} = a new book. The two then move as one block.",
    sentences: [
      ["oishii:O sushi:O o:O tabemashita:V", "I ate delicious sushi."],
      ["yasui:O koohii:O o:O kaimasu:V", "I buy cheap coffee."],
      ["atarashii:O hon:O o:O yomimasu:V", "I read a new book."],
      ["ookii:S neko:S ga:S imasu:V", "There's a big cat."],
      ["ii:O eiga:O o:O mimashita:V", "I watched a good movie."],
      ["kore:T wa:T ii:V hon:V desu:V", "This is a good book."],
      ["takai:L resutoran:L ni:L ikimashita:V", "I went to an expensive restaurant."],
    ],
  },
  {
    id: "time", title: "Say when — 〜時に", gist: "e.g. “I get up at seven.”",
    formula: [["M", "time"], ["M", "に"], ["V", "verb"]],
    note: "A clock time is the number + 時 (じ). It takes に: {七時[しちじ]に} = at seven. Words like 明日 or 毎日 take no particle.",
    box: {
      title: "The hours",
      items: [["一時[いちじ]", "ichiji", "1"], ["二時[にじ]", "niji", "2"], ["三時[さんじ]", "sanji", "3"], ["四時[よじ]", "yoji", "4"], ["五時[ごじ]", "goji", "5"], ["六時[ろくじ]", "rokuji", "6"],
        ["七時[しちじ]", "shichiji", "7"], ["八時[はちじ]", "hachiji", "8"], ["九時[くじ]", "kuji", "9"], ["十時[じゅうじ]", "juuji", "10"], ["十一時[じゅういちじ]", "juuichiji", "11"], ["十二時[じゅうにじ]", "juuniji", "12"]],
      notes: [
        "Clock times use the other set of numbers — いち, に, さん … — not 一[ひと]つ, 二[ふた]つ, which are only for counting things.",
        "Three hours are special: 四時[よじ] (not “yonji”), 七時[しちじ] and 九時[くじ] (not “kyuuji”).",
        "Half past: add 半[はん] — {三時半[さんじはん]} is half past three.",
        "To ask: {何時[なんじ]ですか} — what time is it?",
      ],
    },
    sentences: [
      ["nanji:V desu:V ka:V", "What time is it?"],
      ["sanji:V desu:V", "It's three o'clock."],
      ["shichiji:M ni:M okimasu:V", "I get up at seven."],
      ["kuji:M ni:M kaisha:L ni:L ikimasu:V", "I go to the office at nine."],
      ["rokuji:M ni:M ie:L ni:L kaerimasu:V", "I go home at six."],
      ["hachiji:M ni:M gohan:O o:O tabemasu:V", "I eat at eight."],
      ["nanji:M ni:M ikimasu:V ka:V", "What time are you going?"],
    ],
  },
  {
    id: "karamade", title: "Say from where, until when — から · まで", gist: "e.g. “I'm from Germany.”",
    formula: [["M", "X"], ["M", "から"], ["M", "Y"], ["M", "まで"]],
    note: "から = from, まで = until / as far as. They work for places and for times. {ドイツから来[き]ました} — “I came from Germany” — is how you say where you're from.",
    sentences: [
      ["doitsu:L kara:L kimashita:V", "I'm from Germany."],
      ["doko:L kara:L kimashita:V ka:V", "Where are you from?"],
      ["kuji:M kara:M hatarakimasu:V", "I work from nine."],
      ["kuji:M kara:M goji:M made:M hatarakimasu:V", "I work from nine to five."],
      ["eki:L made:L ikimasu:V", "I go as far as the station."],
      ["ashita:M kara:M nihongo:O o:O benkyou:V", "From tomorrow I'll study Japanese."],
    ],
  },
  {
    id: "mashou", title: "Suggest something — ましょう · ませんか", gist: "e.g. “Let's go.” “Shall we have a coffee?”",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ましょう"]],
    note: "Swap ます for ましょう to say “let's”: {行[い]きます} → {行[い]きましょう}. To invite someone politely, ask with ませんか — literally “won't you…?”: {コーヒーを飲[の]みませんか}.",
    sentences: [
      ["ikimashou:V", "Let's go."],
      ["issho:Q tabemashou:V", "Let's eat together."],
      ["koohii:O o:O nomimasen:V ka:V", "Shall we have a coffee?"],
      ["eiga:O o:O mimasen:V ka:V", "Shall we watch a movie?"],
      ["hai:Q, nomimashou:V", "Yes, let's have a drink."],
      ["ashita:M, toukyou:L ni:L ikimasen:V ka:V", "Shall we go to Tokyo tomorrow?"],
    ],
  },
];

function parseToken(spec) {
  const comma = spec.endsWith(",");
  const [id, role] = (comma ? spec.slice(0, -1) : spec).split(":");
  const w = LEXICON[id];
  if (!w) throw new Error(`Unknown word "${id}" in sentence data`);
  return { ...w, role, comma };
}

export const LESSONS = LESSON_DEFS.map((l, li) => ({
  ...l,
  index: li,
  sentences: l.sentences.map(([spec, en, id], si) => ({
    id: id ?? `${l.id}-${si}`,
    lesson: li,
    en,
    tokens: spec.split(/\s+/).map(parseToken),
  })),
}));

export const ALL_SENTENCES = LESSONS.flatMap((l) => l.sentences);

// Words a lesson uses for the first time — shown before its practice starts.
export function newWordsIn(lesson) {
  const seen = new Set(LESSONS.slice(0, lesson.index).flatMap((l) => l.sentences.flatMap((s) => s.tokens.map((t) => t.id))));
  const fresh = new Map();
  lesson.sentences.forEach((s) => s.tokens.forEach((t) => { if (!seen.has(t.id) && !t.particle && t.id !== "ka") fresh.set(t.id, t); }));
  return [...fresh.values()];
}

// Phrase particles introduced up to (and including) a lesson — used as answer options.
export function particlesKnownBy(lessonIndex) {
  const ids = new Set(LESSONS.slice(0, lessonIndex + 1).flatMap((l) => l.sentences.flatMap((s) => s.tokens.filter((t) => t.particle).map((t) => t.id))));
  return ["wa", "o", "ni", "de", "ga", "mo", "to", "kara", "made"].filter((id) => ids.has(id)).map((id) => LEXICON[id]);
}
