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
  ["hitotsu", "一[ひと]つ", "hitotsu", "one (thing)"], ["futatsu", "二[ふた]つ", "futatsu", "two (things)"],
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
];

const PHRASE_PARTICLES = new Set(["wa", "ga", "o", "ni", "de"]);

export const LEXICON = Object.fromEntries(
  WORDS.map(([id, jp, ro, en]) => [id, { id, jp, ro, en, particle: PHRASE_PARTICLES.has(id) }]),
);

// Each lesson: one pattern. `formula` blocks render as the colored pattern
// header; `note` is the whole explanation — kept to a few lines on purpose.
const LESSON_DEFS = [
  {
    id: "desu", title: "X is Y", gist: "Say what something is",
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
    id: "questions", title: "Questions & “not”", gist: "Ask, and say no",
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
    id: "kudasai", title: "X を ください", gist: "Ask for things",
    formula: [["O", "X"], ["O", "を"], ["V", "ください"]],
    note: "を (read “o”) marks the thing. ください = “please give me”. This one pattern gets you through cafés, shops and restaurants.",
    sentences: [
      ["mizu:O o:O kudasai:V", "Water, please."],
      ["koohii:O o:O kudasai:V", "Coffee, please."],
      ["kore:O o:O kudasai:V", "This one, please."],
      ["menyuu:O o:O kudasai:V", "The menu, please."],
      ["biiru:O o:O futatsu:Q kudasai:V", "Two beers, please."],
      ["ocha:O o:O hitotsu:Q kudasai:V", "One tea, please."],
    ],
  },
  {
    id: "verbs", title: "X を do", gist: "Say what you do",
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
    id: "full", title: "Who does what", gist: "Topic + object + verb",
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
    id: "masen", title: "Don't — ません", gist: "Say what you don't do",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ません"]],
    note: "For “don't”, change ます to ません. Everything else stays the same. Great for food: 肉を食べません — I don't eat meat.",
    sentences: [
      ["watashi:T wa:T osake:O o:O nomimasen:V", "I don't drink alcohol."],
      ["niku:O o:O tabemasen:V", "I don't eat meat."],
      ["terebi:O o:O mimasen:V", "I don't watch TV."],
      ["tanaka:T wa:T koohii:O o:O nomimasen:V", "Tanaka-san doesn't drink coffee."],
      ["koohii:O o:O nomimasu:V ka:V", "Do you drink coffee?"],
      ["iie:Q, nomimasen:V", "No, I don't."],
    ],
  },
  {
    id: "ni", title: "Going — に", gist: "Say where you go",
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
    id: "de", title: "Where it happens — で", gist: "Say where you do things",
    formula: [["L", "place"], ["L", "で"], ["O", "X"], ["O", "を"], ["V", "verb"]],
    note: "で marks where an action happens: “at / in”. Compare 駅に行きます (go TO the station) with 駅で飲みます (drink AT the station).",
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
    id: "arimasu", title: "There is — あります", gist: "Say what there is / what you have",
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
    id: "suki", title: "Likes — が好きです", gist: "Say what you like",
    formula: [["T", "X"], ["T", "は"], ["S", "Y"], ["S", "が"], ["V", "好きです"]],
    note: "What you like takes が, not を. 好きです literally means “is liked”. Not liked: 好きじゃないです.",
    sentences: [
      ["watashi:T wa:T sushi:S ga:S suki:V desu:V", "I like sushi."],
      ["nihon:S ga:S suki:V desu:V", "I like Japan."],
      ["neko:S ga:S suki:V desu:V", "I like cats."],
      ["koohii:S ga:S suki:V desu:V ka:V", "Do you like coffee?"],
      ["niku:S ga:S suki:V janai:V", "I don't like meat."],
    ],
  },
  {
    id: "tai", title: "Want to — たいです", gist: "Say what you want to do",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-たい"], ["V", "です"]],
    note: "Swap ます for たいです to say “want to”: 行きます → 行きたいです.",
    sentences: [
      ["nihon:L ni:L ikitai:V desu:V", "I want to go to Japan."],
      ["sushi:O o:O tabetai:V desu:V", "I want to eat sushi."],
      ["nihongo:O o:O hanashitai:V desu:V", "I want to speak Japanese."],
      ["mizu:O o:O nomitai:V desu:V", "I want to drink water."],
      ["nani:O o:O nomitai:V desu:V ka:V", "What do you want to drink?"],
    ],
  },
  {
    id: "mashita", title: "The past — ました", gist: "Say what you did",
    formula: [["O", "X"], ["O", "を"], ["V", "verb-ました"]],
    note: "Swap ます for ました for the past: 行きます → 行きました. Add か to ask: 飲みましたか — did you drink?",
    sentences: [
      ["kinou:M, sushi:O o:O tabemashita:V", "Yesterday I ate sushi."],
      ["toukyou:L ni:L ikimashita:V", "I went to Tokyo."],
      ["kinou:M, eiga:O o:O mimashita:V", "Yesterday I watched a movie."],
      ["nihongo:O o:O benkyoushita:V", "I studied Japanese."],
      ["koohii:O o:O nomimashita:V ka:V", "Did you drink coffee?"],
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
  sentences: l.sentences.map(([spec, en], si) => ({
    id: `${l.id}-${si}`,
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
  return ["wa", "o", "ni", "de", "ga"].filter((id) => ids.has(id)).map((id) => LEXICON[id]);
}
