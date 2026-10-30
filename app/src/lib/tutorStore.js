// What the AI tutor keeps between chats, in the browser's localStorage:
//
//   "speaking"     drill results: one spaced-repetition card per sentence, kept separate
//                  from lesson progress (saying a sentence from English is a different skill
//                  from recognising it)
//   "tutorMemory"  short notes the tutor writes about the learner and reads at the start of
//                  every chat — the only way a model "remembers" anything between chats

import { storage } from "./storage.js";
import { BOX_INTERVALS, todayKey } from "./srs.js";
import { DEFAULT_PROVIDER } from "./providers.js";

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

// ---------- API keys ----------

export const KEYS_STORE = "tutorApiKeys";      // { anthropic, mistral } — one key per provider
const LEGACY_KEY_STORE = "tutorApiKey"; // before the app supported Mistral: one Anthropic key
export const PROVIDER_STORE = "tutorProvider";
const LEGACY_CHAT_STORE = "tutorChat";

// Keys used to live in a single string, from when Claude was the only option.
// Move that one into the per-provider store the first time, then forget it.
export function loadKeys() {
  const saved = storage.getJSON(KEYS_STORE, null);
  if (saved) return saved;
  const legacy = storage.get(LEGACY_KEY_STORE) || "";
  const keys = legacy ? { anthropic: legacy } : {};
  if (legacy) {
    storage.setJSON(KEYS_STORE, keys);
    storage.set(LEGACY_KEY_STORE, "");
  }
  // The old chat history used Anthropic's own message shape, which this version
  // no longer understands, so it is dropped rather than migrated.
  storage.set(LEGACY_CHAT_STORE, "");
  return keys;
}

export const currentProvider = () => storage.get(PROVIDER_STORE) || DEFAULT_PROVIDER;

// The provider and key to use outside the Tutor tab: the chosen provider if it has a
// key, otherwise any provider that has one. Null when no key is set up.
export function tutorAccess() {
  const keys = loadKeys();
  const chosen = currentProvider();
  const provider = keys[chosen] ? chosen : Object.keys(keys).find((p) => keys[p]);
  return provider ? { provider, apiKey: keys[provider] } : null;
}
