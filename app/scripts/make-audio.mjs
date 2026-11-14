// One-time recording of everything the app says, with Azure's neural Japanese voice.
//
//   node scripts/make-audio.mjs --list     what would be recorded (no key needed)
//   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=… node scripts/make-audio.mjs
//
// Writes public/audio/<id>.mp3 and src/data/audio.json ({ "text the app speaks": id }).
// Files that already exist are kept, so adding a sentence only records the new one;
// delete a file to record it again. Files no longer needed are removed.
// The app plays a recording when there is one and falls back to the phone's voice
// otherwise (see lib/speech.js), so nothing breaks while recordings are missing.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LESSONS, newWordsIn } from "../src/data/sentences.js";
import { parseFurigana, slowSpeechText, speechText, surface } from "../src/lib/sentence.js";
import { HIRAGANA, KATAKANA } from "../src/data/kana.js";
import { KANA_EXTRA } from "../src/data/kanaExtra.js";
import { ALL_VOCAB } from "../src/data/vocab.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/audio");
const MANIFEST = join(ROOT, "src/data/audio.json");
const VOICE = "ja-JP-NanamiNeural";
// A little slower than the voice's natural pace; the "slow" button gets its own, slower take.
const RATE = "-10%";
const SLOW_RATE = "-30%";

// key = what the app passes to speak(); a leading "slow:" marks the slow take.
const items = new Map();
const add = (text, slow = false) => {
  if (!text) return;
  const key = (slow ? "slow:" : "") + text;
  if (!items.has(key)) items.set(key, { text, slow });
};
const readingOf = (jp) => parseFurigana(jp).map((x) => x.rt ?? x.text).join("");

for (const l of LESSONS) {
  for (const s of l.sentences) {
    add(speechText(s.tokens));
    add(slowSpeechText(s.tokens), true);
  }
  for (const w of newWordsIn(l)) add(surface(w.jp));
  for (const [jp] of l.box?.items ?? []) add(readingOf(jp));
}
for (const [ch] of [...HIRAGANA, ...KATAKANA]) add(ch);
for (const set of Object.values(KANA_EXTRA)) {
  for (const g of set) for (const it of g.items) { add(it.kana); add(it.pair?.kana); }
}
for (const it of ALL_VOCAB) { add(it.jp); add(it.example?.jp); }

const idOf = (key) => createHash("sha1").update(key).digest("hex").slice(0, 12);
const manifest = Object.fromEntries([...items.keys()].sort().map((k) => [k, idOf(k)]));
const chars = [...items.values()].reduce((n, it) => n + it.text.length, 0);
console.log(`${items.size} recordings, ${chars} characters of Japanese`);

if (process.argv.includes("--list")) {
  for (const k of Object.keys(manifest)) console.log(k);
  process.exit(0);
}

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ssml = ({ text, slow }) =>
  `<speak version="1.0" xml:lang="ja-JP"><voice name="${VOICE}"><prosody rate="${slow ? SLOW_RATE : RATE}">${esc(text)}</prosody></voice></speak>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The voice endpoint wants a short-lived token (valid 10 minutes), fetched with the key.
let token = { value: "", at: 0 };
async function bearer() {
  if (Date.now() - token.at > 8 * 60e3) {
    const res = await fetch(`https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST", headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Length": "0" },
    });
    if (!res.ok) throw new Error(`token ${res.status} ${await res.text()}`);
    token = { value: await res.text(), at: Date.now() };
  }
  return token.value;
}

async function record(item) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await bearer()}`,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "audio-recorder",
      },
      body: ssml(item),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${await res.text()}`);
    await sleep(15000); // the free tier allows 20 requests a minute
  }
  throw new Error("still rate-limited after several tries");
}

// The voice leaves over a second of silence after each recording — most of the file.
// Cut it down to a quarter of a second: decode with macOS's afconvert to find where the
// sound ends, then drop the MP3 frames after that (frames are independent at the end).
function trimSilence(mp3) {
  const dir = tmpdir();
  const src = join(dir, "make-audio.mp3");
  const wav = join(dir, "make-audio.wav");
  writeFileSync(src, mp3);
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16", src, wav]);
  const w = readFileSync(wav);
  const rate = w.readUInt32LE(24);
  const data = w.indexOf("data") + 8;
  let last = -1;
  for (let i = w.length - 2; i >= data; i -= 2) if (Math.abs(w.readInt16LE(i)) > 600) { last = (i - data) / 2; break; }
  if (last < 0) return mp3;
  const keepSeconds = last / rate + 0.25;
  // Walk the frames (MPEG-2 layer III here: 576 samples each) up to that point.
  const BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const RATES = [22050, 24000, 16000];
  let pos = 0;
  let seconds = 0;
  while (pos + 4 <= mp3.length && seconds < keepSeconds) {
    if (mp3[pos] !== 0xff || (mp3[pos + 1] & 0xfe) !== 0xf2) return mp3; // not what we expect: leave it
    const kbps = BITRATES[mp3[pos + 2] >> 4];
    const hz = RATES[(mp3[pos + 2] >> 2) & 3];
    if (!kbps || !hz) return mp3;
    pos += Math.floor((72000 * kbps) / hz) + ((mp3[pos + 2] >> 1) & 1);
    seconds += 576 / hz;
  }
  return mp3.subarray(0, Math.min(pos, mp3.length));
}

mkdirSync(OUT, { recursive: true });

// node scripts/make-audio.mjs --trim : trim the files already there (no key needed).
if (process.argv.includes("--trim")) {
  let saved = 0;
  for (const f of readdirSync(OUT).filter((x) => x.endsWith(".mp3"))) {
    const before = readFileSync(join(OUT, f));
    const after = trimSilence(before);
    if (after.length < before.length) { writeFileSync(join(OUT, f), after); saved += before.length - after.length; }
  }
  console.log(`Trimmed ${Math.round(saved / 1024)} KB of silence.`);
  process.exit(0);
}

const wanted = new Set(Object.values(manifest).map((id) => `${id}.mp3`));
for (const f of readdirSync(OUT)) if (f.endsWith(".mp3") && !wanted.has(f)) unlinkSync(join(OUT, f));

if (!KEY || !REGION) {
  console.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (or use --list / --trim).");
  process.exit(1);
}

let made = 0;
for (const [key, id] of Object.entries(manifest)) {
  const file = join(OUT, `${id}.mp3`);
  if (existsSync(file)) continue;
  const audio = await record(items.get(key));
  if (audio.length < 500) throw new Error(`empty audio for ${key}`);
  writeFileSync(file, trimSilence(audio));
  made++;
  if (made % 20 === 0) console.log(`${made} recorded…`);
  await sleep(3200);
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0) + "\n");
console.log(`Done: ${made} new, ${wanted.size} in total.`);
