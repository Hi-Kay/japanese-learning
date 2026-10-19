// What the AI tutor keeps between chats, in the browser's localStorage:
//
//   "speaking"     drill results: one spaced-repetition card per sentence, kept separate
//                  from lesson progress (saying a sentence from English is a different skill
//                  from recognising it)
//   "tutorMemory"  short notes the tutor writes about the learner and reads at the start of
//                  every chat — the only way a model "remembers" anything between chats

import { storage } from "./storage.js";
import { BOX_INTERVALS, todayKey } from "./srs.js";

// ---------- Speaking progress ----------

export const getSpeaking = () => storage.getJSON("speaking", {});

// Same boxes as the rest of the app: wrong → box 1, right → one box up. Moving up only
// counts once per day: repeating a sentence minutes later doesn't prove you remember it.
export function recordSpeaking(sentenceId, correct, said = "") {
  const all = getSpeaking();
  const cur = all[sentenceId] ?? { box: 0, n: 0, due: 0 };
  const today = todayKey();
  let { box, upDay } = cur;
  if (!correct) box = 1;
  else if (box === 0) box = 1;
  else if (upDay !== today) { box = Math.min(5, box + 1); upDay = today; }
  const next = {
    box,
    n: cur.n + 1,
    due: Date.now() + BOX_INTERVALS[box],
    upDay,
    last: correct ? "right" : "wrong",
    ...(correct ? {} : { said: said.slice(0, 80) }),
  };
  storage.setJSON("speaking", { ...all, [sentenceId]: next });
  return next;
}

export function speakingStats() {
  const all = Object.values(getSpeaking());
  const now = Date.now();
  return {
    spoken: all.length,
    toReview: all.filter((s) => s.due <= now || s.last === "wrong").length,
    mastered: all.filter((s) => s.box >= 4).length,
  };
}

// ---------- Learner memory ----------

export const MAX_NOTES = 15;
const MAX_NOTE_LENGTH = 150;

export const getMemory = () => storage.getJSON("tutorMemory", []);

export function setMemory(notes) {
  const clean = notes
    .map((n) => String(n).trim().slice(0, MAX_NOTE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_NOTES);
  storage.setJSON("tutorMemory", clean);
  return clean;
}
