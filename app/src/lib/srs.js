// Wait before the next review, by level: a mistake comes back after a minute; once
// something is learned (level 2) reviews follow a daily rhythm — tomorrow, in 3 days,
// in 10 days, in a month.
export const BOX_INTERVALS = [0, 60e3, 86400e3, 259200e3, 864000e3, 2592000e3];

// When an item at this level is next due. Daily reviews are due from the start of
// that day, not to the minute: everything due "tomorrow" is ready in the morning and
// one review clears it, instead of items trickling in at the hour you last saw them.
const DAY = 86400e3;
export function nextDue(box, now = Date.now()) {
  const wait = BOX_INTERVALS[box];
  if (wait < DAY) return now + wait;
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.round(wait / DAY)).getTime();
}
export const MASTER_BOX = 3;
export const SESSION_SIZE = 20;

export const kvgUrl = (char) =>
  `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${char.codePointAt(0).toString(16).padStart(5, "0")}.svg`;

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export { speak, stopSpeaking } from "./speech.js";

// Local-day string (YYYY-MM-DD) used for streak tracking, independent of timezone shifts mid-session.
export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const daysBetween = (aKey, bKey) => {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((b - a) / 86400000);
};
