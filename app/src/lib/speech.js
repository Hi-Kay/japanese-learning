import { storage } from "./storage.js";

// Japanese text-to-speech via the browser's built-in voices.

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
let voices = [];
const loadVoices = () => {
  if (synth) voices = synth.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
};
if (synth) {
  loadVoices();
  synth.addEventListener?.("voiceschanged", loadVoices);
}

// Higher-quality voices first: premium/enhanced system voices, network voices such as
// Chrome's "Google 日本語", Apple's natural voices, and last Apple's novelty voices
// (Eddy, Grandma, Rocko…), which are the most robotic.
const NATURAL = /kyoko|o-ren|otoya|hattori/i;
const NOVELTY = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;
const quality = (v) =>
  /premium/i.test(v.name) ? 5
  : /enhanced|拡張/i.test(v.name) || /google/i.test(v.name) ? 4
  : !v.localService ? 3
  : NATURAL.test(v.name) ? 2
  : NOVELTY.test(v.name) ? -1
  : v.default ? 1 : 0;

export function japaneseVoices() {
  loadVoices();
  return [...voices].filter((v) => !NOVELTY.test(v.name)).sort((a, b) => quality(b) - quality(a));
}

export function currentVoice() {
  const list = japaneseVoices();
  const saved = storage.get("voiceURI");
  return list.find((v) => v.voiceURI === saved) ?? list[0] ?? null;
}

export const setVoice = (uri) => storage.set("voiceURI", uri);

let delayed = null;
export function speak(text, rate = 0.85) {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const v = currentVoice();
  if (v) u.voice = v;
  u.rate = rate;
  clearTimeout(delayed);
  // Safari drops an utterance (or ignores its rate) when it's queued right after
  // cancel(), so only cancel when something is playing, then wait a moment.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    delayed = setTimeout(() => synth.speak(u), 150);
  } else {
    synth.speak(u);
  }
}
