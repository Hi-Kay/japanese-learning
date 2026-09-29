// Hepburn romaji → hiragana, for showing the app's romaji readings as kana.

const TABLE = {
  kya: "きゃ", kyu: "きゅ", kyo: "きょ", gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", shi: "し", ja: "じゃ", ju: "じゅ", jo: "じょ", ji: "じ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", chi: "ち", tsu: "つ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ", hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ", pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ", rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ", ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", su: "す", se: "せ", so: "そ", za: "ざ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", te: "て", to: "と", da: "だ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", he: "へ", ho: "ほ", ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も", ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ", wa: "わ", wo: "を",
  a: "あ", i: "い", u: "う", e: "え", o: "お",
};
const VOWELS = "aeiou";

// Converts one romaji word; returns null if any part can't be converted.
export function toHiragana(word) {
  const s = word.toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    // Doubled consonant (except n) → small っ
    if (c === s[i + 1] && !VOWELS.includes(c) && c !== "n") { out += "っ"; i++; continue; }
    if (c === "t" && s.startsWith("tch", i)) { out += "っ"; i++; continue; }
    // n not followed by a vowel or y → ん
    const next = s[i + 1];
    if (c === "n" && !(next && (VOWELS.includes(next) || next === "y"))) { out += "ん"; i++; continue; }
    // Apostrophe separates ん from a following vowel/y: "kin'youbi" → きんようび
    if (c === "'") { i++; continue; }
    let matched = false;
    for (const len of [3, 2, 1]) {
      const kana = TABLE[s.slice(i, i + len)];
      if (kana) { out += kana; i += len; matched = true; break; }
    }
    if (!matched) return null;
  }
  return out;
}

// A single reading word, which may carry okurigana in parentheses: "hito(tsu)" → "ひと(つ)".
// Converted as one word so doubled consonants across the parenthesis work ("mit(tsu)" → "みっ(つ)").
function convertWord(w) {
  const m = w.match(/^([a-z']*)\(([a-z']+)\)$/i);
  if (!m) return toHiragana(w);
  const full = toHiragana(m[1] + m[2]);
  const okuri = toHiragana(m[2]);
  if (!full || !okuri) return null;
  return `${full.slice(0, full.length - okuri.length)}(${okuri})`;
}

// Kanji reading lists like "ichi / hito(tsu)" or "kyuu, ku / kokono(tsu)".
export function readingToKana(reading) {
  const parts = reading.split(/(\s*\/\s*|\s*,\s*)/);
  const out = parts.map((p, idx) => {
    if (idx % 2 === 1) return p.includes("/") ? " / " : "、";
    return convertWord(p.trim());
  });
  return out.some((p) => p === null) ? null : out.join("");
}

// Word/phrase readings like "onegai shimasu" or "kore wa nan desu ka".
// Standalone particles are written with their conventional kana (wa→は, o→を, e→へ).
const PARTICLES = { wa: "は", o: "を", e: "へ" };
export function phraseToKana(reading) {
  if (reading.includes("/")) return readingToKana(reading);
  const words = reading.trim().split(/\s+/);
  const out = words.map((w, i) => (i > 0 && PARTICLES[w.toLowerCase()]) || toHiragana(w));
  return out.some((p) => p === null) ? null : out.join("");
}

export const hasKanji = (s) => /[㐀-䶿一-鿿々]/.test(s);
