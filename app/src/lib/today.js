import { storage } from "./storage.js";
import { BOX_INTERVALS, todayKey } from "./srs.js";
import { HIRAGANA, KATAKANA, KANA_ROWS } from "../data/kana.js";
import { KANA_EXTRA } from "../data/kanaExtra.js";
import { LEARNED, progressStatus } from "./progressStatus.js";

// What the learner did today, for the "Today" plan: { date, lesson, reviewed }.
export function readToday() {
  const t = storage.getJSON("today", null);
  return t?.date === todayKey() ? t : { date: todayKey() };
}

export function markToday(patch) {
  const next = { ...readToday(), ...patch };
  storage.setJSON("today", next);
  return next;
}

// Newer entries store when they were answered; for older ones it can be recovered,
// because they were saved as due = answer time + interval.
const answeredAt = (st) => st.seen ?? st.due - BOX_INTERVALS[st.box];
const KANA_CHARS = new Set([...HIRAGANA, ...KATAKANA].map(([ch]) => ch));
const isKanaKey = (key) => key.startsWith("x:") || KANA_CHARS.has(key.split("|")[0]);

export function kanaPracticedToday(progress) {
  const start = new Date().setHours(0, 0, 0, 0);
  return Object.entries(progress).some(([key, st]) => isKanaKey(key) && answeredAt(st) >= start);
}

// The next kana step, in textbook order: hiragana rows → hiragana marks & sound
// changes → katakana rows → katakana marks. Null once everything is learned.
export function nextKanaStep(progress) {
  const learned = (ch) => (progress[`${ch}|rec`]?.box ?? 0) >= LEARNED;
  for (const [set, chars] of [["hiragana", HIRAGANA], ["katakana", KATAKANA]]) {
    const row = KANA_ROWS.findIndex((r) => !chars.slice(r.start, r.start + r.len).every(([ch]) => learned(ch)));
    if (row >= 0) {
      const r = KANA_ROWS[row];
      return { set, row, title: `${set === "hiragana" ? "Hiragana" : "Katakana"} · ${r.label} row`, sample: chars.slice(r.start, r.start + r.len).map(([ch]) => ch).join(" ") };
    }
    const group = KANA_EXTRA[set].find((g) => !["learned", "mastered"].includes(progressStatus(g.items, (it) => `x:${it.kana}|rec`, progress).state));
    if (group) return { set, group: group.id, title: `${set === "hiragana" ? "Hiragana" : "Katakana"} · ${group.title}`, sample: group.items.slice(0, 4).map((it) => it.kana).join(" ") };
  }
  return null;
}
