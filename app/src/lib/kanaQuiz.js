import { HIRAGANA, KATAKANA } from "../data/kana.js";
import { KANA_EXTRA } from "../data/kanaExtra.js";
import { shuffle } from "./srs.js";

// Romaji for any single kana (basic or marked), used for distractor answers.
const ROMAJI = Object.fromEntries([
  ...HIRAGANA, ...KATAKANA,
  ...Object.values(KANA_EXTRA).flatMap((gs) => gs.filter((g) => g.kind === "chars").flatMap((g) => g.items.map((it) => [it.kana, it.ro]))),
]);

const sameRow = (a, b) => a.ro.slice(0, -1) === b.ro.slice(0, -1);

// Build one exercise. Distractors are the look-alikes and sound-alikes a learner
// actually confuses: the unmarked kana, the other mark, the big-や reading, the word
// without its small っ or long vowel.
export function makeExercise(group, it, type) {
  const others = shuffle(group.items.filter((o) => o !== it));
  const ex = { key: `${it.kana}-${type}-${Math.random().toString(36).slice(2, 7)}`, it, type };
  if (group.kind === "words") {
    ex.options = type === "hear"
      ? shuffle([{ label: it.kana, sub: it.ro, correct: true }, { label: it.pair.kana, sub: it.pair.ro }])
      : shuffle([{ label: it.ro, correct: true }, { label: it.pair.ro }, ...others.filter((o) => o.ro !== it.ro && o.ro !== it.pair.ro).slice(0, 1).map((o) => ({ label: o.ro }))]);
    return ex;
  }
  const neighbours = [...others.filter((o) => sameRow(o, it)), ...others];
  const cands = type === "hear"
    ? [it.base, it.alt, ...neighbours.filter((o) => !o.noHear).map((o) => o.kana)].filter(Boolean).map((k) => ({ label: k, sub: ROMAJI[k] ?? "" }))
    : [it.bigRo ?? ROMAJI[it.base], it.alt && ROMAJI[it.alt], ...neighbours.map((o) => o.ro)].filter(Boolean).map((r) => ({ label: r }));
  const correct = type === "hear" ? { label: it.kana, sub: it.ro, correct: true } : { label: it.ro, correct: true };
  const seen = new Set([correct.label]);
  if (type === "read") seen.add(it.ro); // ぢ/じ both read "ji" — never offer the same reading twice
  const picks = cands.filter((c) => !seen.has(c.label) && seen.add(c.label)).slice(0, 3);
  ex.options = shuffle([correct, ...picks]);
  return ex;
}

// The unmarked form a character is contrasted with in feedback (か for が, きや for きゃ).
export const contrastOf = (group, it) => group.kind === "words"
  ? { kana: it.pair.kana, ro: it.pair.ro, en: it.pair.en ?? "no common word" }
  : { kana: it.base, ro: it.bigRo ?? ROMAJI[it.base] ?? "" };

