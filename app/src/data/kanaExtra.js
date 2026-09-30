// The kana "sound changes" beyond the 46 basic characters: dakuten (゛), handakuten (゜),
// yōon (small ゃゅょ), sokuon (small っ) and chōon (long vowels).
//
// Character groups:  item = { kana, ro, base, alt?, noHear? }
//   base  – the plain kana it's built from (か for が, きや for きゃ) — the classic mix-up
//   alt   – the other marked version (ば for ぱ and vice versa)
//   noHear – sounds identical to another kana (ぢ = じ, づ = ず), so no listening question
// Word groups:  item = { kana, ro, en, pair: { kana, ro, en? } }
//   pair – the same word without the small っ / long vowel. Often a real word with a
//          different meaning (きって stamp / きて come), which is the point of the lesson.

const toKatakana = (s) => [...s].map((c) => {
  const code = c.charCodeAt(0);
  return code >= 0x3041 && code <= 0x3096 ? String.fromCharCode(code + 0x60) : c;
}).join("");

const DAKUTEN = [
  ["が", "ga", "か"], ["ぎ", "gi", "き"], ["ぐ", "gu", "く"], ["げ", "ge", "け"], ["ご", "go", "こ"],
  ["ざ", "za", "さ"], ["じ", "ji", "し"], ["ず", "zu", "す"], ["ぜ", "ze", "せ"], ["ぞ", "zo", "そ"],
  ["だ", "da", "た"], ["ぢ", "ji", "ち", true], ["づ", "zu", "つ", true], ["で", "de", "て"], ["ど", "do", "と"],
  ["ば", "ba", "は", false, "ぱ"], ["び", "bi", "ひ", false, "ぴ"], ["ぶ", "bu", "ふ", false, "ぷ"], ["べ", "be", "へ", false, "ぺ"], ["ぼ", "bo", "ほ", false, "ぽ"],
];
const HANDAKUTEN = [
  ["ぱ", "pa", "は", false, "ば"], ["ぴ", "pi", "ひ", false, "び"], ["ぷ", "pu", "ふ", false, "ぶ"], ["ぺ", "pe", "へ", false, "べ"], ["ぽ", "po", "ほ", false, "ぼ"],
];
// [i-sound kana, its romaji, consonant used in the merged syllable]
// The last field is the romaji of the classic misreading with a full-size や: きや → kiya.
const YOUON = [
  ["き", "ki", "ky"], ["し", "shi", "sh"], ["ち", "chi", "ch"], ["に", "ni", "ny"], ["ひ", "hi", "hy"], ["み", "mi", "my"],
  ["り", "ri", "ry"], ["ぎ", "gi", "gy"], ["じ", "ji", "j"], ["び", "bi", "by"], ["ぴ", "pi", "py"],
].flatMap(([i, iro, c]) => [["ゃ", "や", "a"], ["ゅ", "ゆ", "u"], ["ょ", "よ", "o"]].map(([small, big, v]) => [i + small, c + v, i + big, false, null, `${iro}y${v}`]));

const charItems = (rows, script) => rows.map(([kana, ro, base, noHear, alt, bigRo]) => {
  const conv = script === "katakana" ? toKatakana : (s) => s;
  return { kana: conv(kana), ro, base: conv(base), alt: alt && conv(alt), noHear: !!noHear, bigRo };
});

// [word, romaji, meaning, pairWord, pairRomaji, pairMeaning (null = no common word)]
const SOKUON_HIRA = [
  ["きって", "kitte", "stamp", "きて", "kite", "come (and…)"],
  ["おっと", "otto", "husband", "おと", "oto", "sound"],
  ["さっか", "sakka", "writer", "さか", "saka", "slope"],
  ["かっこ", "kakko", "brackets / cool", "かこ", "kako", "the past"],
  ["がっこう", "gakkou", "school", "がこう", "gakou", null],
  ["ざっし", "zasshi", "magazine", "ざし", "zashi", null],
  ["きっぷ", "kippu", "ticket", "きぷ", "kipu", null],
  ["ちょっと", "chotto", "a little", "ちょと", "choto", null],
];
const CHOUON_HIRA = [
  ["おばあさん", "obaasan", "grandmother", "おばさん", "obasan", "aunt"],
  ["おじいさん", "ojiisan", "grandfather", "おじさん", "ojisan", "uncle"],
  ["ゆうき", "yuuki", "courage", "ゆき", "yuki", "snow"],
  ["とおり", "toori", "street", "とり", "tori", "bird"],
  ["ええ", "ee", "yes", "え", "e", "picture"],
  ["こうこう", "koukou", "high school", "ここ", "koko", "here"],
];
const SOKUON_KATA = [
  ["ベッド", "beddo", "bed", "ベド", "bedo", null],
  ["カップ", "kappu", "cup", "カプ", "kapu", null],
  ["ネット", "netto", "internet", "ネト", "neto", null],
  ["サッカー", "sakkaa", "soccer", "サカー", "sakaa", null],
  ["チケット", "chiketto", "ticket", "チケト", "chiketo", null],
  ["ロボット", "robotto", "robot", "ロボト", "roboto", null],
];
const CHOUON_KATA = [
  ["ビール", "biiru", "beer", "ビル", "biru", "building"],
  ["コーヒー", "koohii", "coffee", "コヒ", "kohi", null],
  ["ケーキ", "keeki", "cake", "ケキ", "keki", null],
  ["ノート", "nooto", "notebook", "ノト", "noto", null],
  ["スーパー", "suupaa", "supermarket", "スパ", "supa", "spa"],
  ["メニュー", "menyuu", "menu", "メニュ", "menyu", null],
];

// Both words of a real pair are worth learning, so each becomes an item.
const wordItems = (rows) => rows.flatMap(([kana, ro, en, pk, pr, pen]) => {
  const a = { kana, ro, en, pair: { kana: pk, ro: pr, en: pen } };
  return pen ? [a, { kana: pk, ro: pr, en: pen, pair: { kana, ro, en } }] : [a];
});

const groups = (script) => {
  const k = script === "katakana";
  const mark = (h) => (k ? toKatakana(h) : h);
  return [
    {
      id: "dakuten", kind: "chars", symbol: mark("が"), title: "Dakuten", subtitle: "two small strokes",
      note: `The two strokes make the sound “voiced”: k→g, s→z, t→d, h→b. ${mark("か")} ka → ${mark("が")} ga, ${mark("は")} ha → ${mark("ば")} ba. (${mark("ぢ")} and ${mark("づ")} sound like ${mark("じ")} and ${mark("ず")} and are rare.)`,
      items: charItems(DAKUTEN, script),
    },
    {
      id: "handakuten", kind: "chars", symbol: mark("ぱ"), title: "Handakuten", subtitle: "small circle",
      note: `The small circle only goes on the h-row and turns h into p: ${mark("は")} ha → ${mark("ぱ")} pa. Don't mix it up with the two strokes: ${mark("ば")} ba.`,
      items: charItems(HANDAKUTEN, script),
    },
    {
      id: "youon", kind: "chars", symbol: mark("きゃ"), title: "Yōon", subtitle: "small ya · yu · yo",
      note: `A small ${mark("ゃ")}, ${mark("ゅ")} or ${mark("ょ")} after an i-sound merges with it into one syllable: ${mark("き")}+${mark("ゃ")} = ${mark("きゃ")} kya. With a full-size ${mark("や")} it's two syllables: ${mark("きや")} ki-ya.`,
      items: charItems(YOUON, script),
    },
    {
      id: "sokuon", kind: "words", symbol: mark("っ"), title: "Sokuon", subtitle: "small tsu",
      note: `A small ${mark("っ")} is a short silent beat that doubles the next consonant: ${k ? "ベッド beddo" : "きて kite → きって kitte"}. You hear it as a tiny pause before the consonant.`,
      items: wordItems(k ? SOKUON_KATA : SOKUON_HIRA),
    },
    {
      id: "chouon", kind: "words", symbol: k ? "ー" : "ああ", title: "Chōon", subtitle: "long vowels",
      note: k
        ? "In katakana a long vowel is written with a dash ー: ビル biru (building) → ビール biiru (beer). Holding the vowel twice as long changes the word."
        : "A long vowel is held twice as long, and it changes the word: おばさん (aunt) → おばあさん (grandmother). It's written by adding a vowel — note that えい usually sounds “ee” and おう “oo”: せんせい, ありがとう.",
      items: wordItems(k ? CHOUON_KATA : CHOUON_HIRA),
    },
  ];
};

export const KANA_EXTRA = { hiragana: groups("hiragana"), katakana: groups("katakana") };
