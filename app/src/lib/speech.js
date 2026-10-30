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

// iPhone Safari's speech engine sometimes gets stuck: it stays "paused", or reports that
// it is still speaking although nothing is playing. Then every new utterance just waits
// in the queue and you hear nothing. Unstick it before speaking.
function unstick() {
  if (synth.paused) synth.resume();
}

function makeUtterance(text, rate, { useVoice = true } = {}) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const v = useVoice ? currentVoice() : null;
  if (v) u.voice = v;
  u.rate = rate;
  return u;
}

let lastStart = 0; // when an utterance last actually started playing
let lastStop = 0;  // when stopSpeaking() last cancelled something

export function speak(text, rate = 0.85) {
  if (!synth) return;
  unstick();
  const u = makeUtterance(text, rate);
  u.onstart = () => { lastStart = Date.now(); };
  clearTimeout(delayed);
  const busy = synth.speaking || synth.pending;
  const justStopped = Date.now() - lastStop < 150;
  // "Busy" for a long time without anything having started recently means the engine is stuck.
  const stuck = busy && Date.now() - lastStart > 20000;
  // Safari drops an utterance (or ignores its rate) when it's queued right after
  // cancel(), so only cancel when something is playing, then wait a moment.
  if (busy) {
    synth.cancel();
    if (stuck) synth.speak(u); // speak right away, inside the tap, so iOS allows it
    else delayed = setTimeout(() => synth.speak(u), 150);
  } else if (justStopped) {
    delayed = setTimeout(() => synth.speak(u), 150); // same Safari bug, after stopSpeaking()
  } else {
    synth.speak(u);
  }
}

// Silence whatever is playing, e.g. the last sentence when moving on to the next exercise.
export function stopSpeaking() {
  if (!synth) return;
  clearTimeout(delayed);
  if (synth.speaking || synth.pending) {
    synth.cancel();
    lastStop = Date.now();
  }
}

// ---------- Sound test (shown in the Voice panel) ----------
// Plays a sentence and reports what the browser does, because on a phone you can't
// open the developer console. Returns a promise of a list of log lines.
export function soundTest({ useVoice }) {
  const log = [];
  if (!synth) return Promise.resolve(["This browser has no speech synthesis at all."]);
  const flags = () => `speaking=${synth.speaking}, pending=${synth.pending}, paused=${synth.paused}`;
  log.push(`Before: ${flags()}`);
  synth.cancel();
  if (synth.paused) synth.resume();
  const v = useVoice ? currentVoice() : null;
  log.push(useVoice ? `Voice: ${v ? `${v.name} (${v.lang}${v.localService ? ", on device" : ", online"})` : "none found, using default"}` : "Voice: the system's default for Japanese");
  const u = makeUtterance("これはテストです。", 1, { useVoice });
  return new Promise((resolve) => {
    let started = false;
    const finish = (line) => { log.push(line); clearTimeout(timer); resolve(log); };
    u.onstart = () => { started = true; lastStart = Date.now(); log.push("✓ Started playing"); };
    u.onend = () => finish(started ? "✓ Finished — did you hear it? If not, it's the phone's volume or audio route." : "Ended without starting");
    u.onerror = (e) => finish(`✗ Error: ${e.error}`);
    const timer = setTimeout(() => finish(started ? "Still playing after 6 s" : `✗ Nothing happened after 6 s (${flags()})`), 6000);
    synth.speak(u); // called directly inside the tap, as iOS requires
  });
}
