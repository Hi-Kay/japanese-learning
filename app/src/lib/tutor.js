// The Tutor agent: the same loop as agent/agent.mjs, running in the browser.
//
//   1. send the conversation + the list of tools to the model
//   2. if the model asks for a tool, run it here and send back the result
//   3. repeat until the model gives a final answer (or MAX_STEPS is reached)
//
// The tools work on the app's own data: the built-in dictionary, My Words,
// the spaced-repetition progress of every lesson, speaking-drill results and
// the tutor's own notes about the learner (its memory between chats).
//
// Nothing below is specific to one AI provider. The loop runs on Claude or on
// Mistral, whichever key the learner has; providers.js holds everything that
// differs between the two, including the shape of the conversation on the wire.

import { lookupWord } from "../data/dictionary.js";
import { LESSONS } from "../data/sentences.js";
import { providerOf } from "./providers.js";
import { MASTER_BOX } from "./srs.js";
import { MAX_NOTES, getMemory, getSpeaking, recordSpeaking, setMemory } from "./tutorStore.js";

const MAX_STEPS = 10; // safety cap so a confused agent can't loop forever

// ---------- 1. TOOLS: what the agent may do ----------

export const TOOLS = [
  {
    name: "lookup_word",
    description:
      "Look up a Japanese or English word in the app's dictionary (and the online Jisho dictionary if it isn't there). " +
      "Returns Japanese, reading and meaning. Use it to check readings and meanings instead of guessing.",
    input_schema: {
      type: "object",
      properties: { word: { type: "string", description: "Word in Japanese (kanji or kana), romaji or English" } },
      required: ["word"],
    },
  },
  {
    name: "save_to_my_words",
    description:
      "Save one or more items to the learner's 'My Words' flashcards in the app, where they review them with spaced repetition. " +
      "Items can be words, phrases or whole sentences. When saving several items, save them all in ONE call.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              japanese: { type: "string", description: "Plain Japanese as normally written, without furigana brackets" },
              reading: { type: "string", description: "Full reading in hiragana" },
              meaning: { type: "string", description: "Short English meaning" },
            },
            required: ["japanese", "reading", "meaning"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_my_words",
    description: "List the learner's saved 'My Words' flashcards, with how well each one is known.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_drill_sentences",
    description:
      "Get sentences for a 'Say it in Japanese' speaking drill, taken from the app's lessons the learner has already practised " +
      "(sentences they got wrong when speaking, or that are due, come first). Each has an id, the English prompt, the expected " +
      "Japanese answer, and how earlier spoken attempts went. The Japanese is the answer key: never show it before the learner has answered.",
    input_schema: {
      type: "object",
      properties: { count: { type: "integer", description: "How many sentences (default 8)" } },
    },
  },
  {
    name: "record_drill_result",
    description:
      "Save the result of one drill answer, right after you've checked it. Wrong answers come back sooner in later drills; " +
      "right ones are spaced out further. Call it once per answered drill sentence.",
    input_schema: {
      type: "object",
      properties: {
        sentence_id: { type: "string", description: "The id from get_drill_sentences" },
        correct: { type: "boolean", description: "true if the answer was correct (other natural versions count as correct)" },
        said: { type: "string", description: "What the learner actually said or wrote" },
      },
      required: ["sentence_id", "correct"],
    },
  },
  {
    name: "save_learner_notes",
    description:
      `Replace your notes about the learner — your memory between chats, shown to you at the start of every chat. ` +
      `Send the COMPLETE updated list (keep, edit, merge or drop earlier notes), at most ${MAX_NOTES} short notes. ` +
      "Note lasting things only: mistakes they make repeatedly, their goals and interests, their level, how they like to be taught. " +
      "Not one-off slips. The learner can see and delete every note.",
    input_schema: {
      type: "object",
      properties: {
        notes: { type: "array", items: { type: "string" }, description: "Short notes, one fact each, e.g. \"Mixes up これ (this thing) and ここ (here)\"" },
      },
      required: ["notes"],
    },
  },
  {
    name: "get_my_progress",
    description:
      "Get the learner's progress in the app: which sentence lessons are done, which sentences and words they keep getting wrong, " +
      "and how many kana and kanji they know. Use it to personalise practice.",
    input_schema: { type: "object", properties: {} },
  },
];

// ---------- 2. RUNNING A TOOL ----------
// `app` gives the tools access to app state: { getCards, addCards, getProgress }.

const stripFurigana = (s) => s.replace(/\[[^\]]*\]/g, "");
const levelOf = (st) => (!st ? "new" : st.box >= MASTER_BOX ? "known" : st.box <= 1 ? "struggling" : "learning");

async function lookup(word) {
  const local = lookupWord(word, 5).map(([jp, kana, romaji, english]) => ({ japanese: jp, reading: kana, romaji, meaning: english }));
  if (local.length) return JSON.stringify(local);
  try {
    const res = await fetch("https://jisho.org/api/v1/search/words?keyword=" + encodeURIComponent(word));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const results = data.data.slice(0, 3).map((e) => ({
      japanese: e.japanese[0].word ?? e.japanese[0].reading,
      reading: e.japanese[0].reading,
      meaning: (e.senses[0]?.english_definitions ?? []).join(", "),
      jlpt: e.jlpt ?? [],
    }));
    return results.length ? JSON.stringify(results) : "No results in either dictionary.";
  } catch {
    // Browsers may block Jisho (it isn't made for web apps), so this is expected sometimes.
    return "Not in the app's dictionary, and the online dictionary is unreachable. Answer from your own knowledge and tell the learner it's unverified.";
  }
}

function speakingSummary() {
  const sp = getSpeaking();
  const wrong = Object.entries(sp).filter(([, v]) => v.last === "wrong").slice(0, 10).map(([id, v]) => {
    const s = ALL_SENTENCES.find((x) => x.id === id);
    return s && `${s.en} → said "${v.said || "?"}", correct: ${plainSentence(s)}`;
  }).filter(Boolean);
  return { sentences_spoken: Object.keys(sp).length, mastered: Object.values(sp).filter((v) => v.box >= 4).length, wrong_last_time: wrong };
}

function progressSummary(progress, cards) {
  const now = Date.now();
  const lessons = LESSONS.map((l) => {
    const sts = l.sentences.map((s) => progress[`s:${s.id}`]);
    return {
      lesson: `${l.index + 1}. ${l.title}`,
      practiced: `${sts.filter(Boolean).length}/${sts.length}`,
      known: sts.filter((st) => levelOf(st) === "known").length,
    };
  });
  const struggling = (prefix) =>
    Object.entries(progress).filter(([k, st]) => k.startsWith(prefix) && st.n >= 2 && st.box <= 1);
  const allSentences = LESSONS.flatMap((l) => l.sentences);
  const weakSentences = struggling("s:").slice(0, 10).map(([k]) => {
    const s = allSentences.find((x) => `s:${x.id}` === k);
    return s && `${s.tokens.map((t) => t.jp + (t.comma ? "、" : "")).join("")}。 (${s.en})`;
  }).filter(Boolean);
  const weakWords = [...struggling("w:"), ...struggling("v:")].slice(0, 15).map(([k]) => k.slice(2).replace("|rec", ""));
  // Kana/kanji progress keys look like "あ|read" — one per character and direction.
  const chars = new Map();
  for (const [k, st] of Object.entries(progress)) {
    const m = k.match(/^(.+)\|(?!rec$)/);
    if (m && !k.startsWith("s:")) chars.set(m[1], Math.max(chars.get(m[1]) ?? 0, st.box));
  }
  const knownChars = [...chars].filter(([, box]) => box >= MASTER_BOX).map(([c]) => c);
  const kanji = knownChars.filter((c) => /[㐀-䶿一-鿿々]/.test(c));
  return JSON.stringify({
    sentence_lessons: lessons,
    sentences_due_for_review: allSentences.filter((s) => progress[`s:${s.id}`]?.due <= now).length,
    struggling_sentences: weakSentences,
    struggling_words: weakWords,
    known_kana_count: knownChars.length - kanji.length,
    known_kanji: kanji.join(""),
    my_words_count: cards.length,
    speaking_drill: speakingSummary(),
  });
}

const plainSentence = (s) => stripFurigana(s.tokens.map((t) => t.jp + (t.comma ? "、" : "")).join("")) + "。";

const ALL_SENTENCES = LESSONS.flatMap((l) => l.sentences);

// Sentences from lessons the learner has started or spoken from (or lesson 1 if none).
// Order: spoken wrong last time → speaking review due → struggling in lessons → never spoken → the rest.
function drillSentences(progress, speaking, count = 8) {
  const now = Date.now();
  const started = LESSONS.filter((l) => l.sentences.some((s) => progress[`s:${s.id}`] || speaking[s.id]));
  const pool = (started.length ? started : LESSONS.slice(0, 1)).flatMap((l) => l.sentences);
  const rank = (s) => {
    const sp = speaking[s.id];
    const st = progress[`s:${s.id}`];
    if (sp?.last === "wrong") return 0;
    if (sp && sp.due <= now) return 1;
    if (!sp && st && st.box <= 1) return 2;
    if (!sp) return 3;
    return 4;
  };
  const shuffled = pool.map((s) => ({ s, r: rank(s) + Math.random() * 0.9 })).sort((a, b) => a.r - b.r);
  return shuffled.slice(0, Math.min(Math.max(count, 1), 15)).map(({ s }) => {
    const sp = speaking[s.id];
    return {
      id: s.id,
      english: s.en,
      japanese: plainSentence(s),
      lesson: `${s.lesson + 1}. ${LESSONS[s.lesson].title}`,
      spoken_before: sp ? (sp.last === "wrong" ? `wrong last time (said: ${sp.said || "?"})` : `right last time, box ${sp.box} of 5`) : "never",
    };
  });
}

// Matches BOX_INTERVALS in srs.js.
const INTERVAL_NAMES = ["now", "1 minute", "10 minutes", "1 day", "3 days", "10 days"];
function recordDrill({ sentence_id, correct, said = "" }) {
  if (!ALL_SENTENCES.some((s) => s.id === sentence_id)) throw new Error(`Unknown sentence_id "${sentence_id}". Use an id from get_drill_sentences.`);
  const r = recordSpeaking(sentence_id, !!correct, said);
  return `Saved (${correct ? "right" : "wrong"}). Box ${r.box} of 5; it comes back in a drill in ${INTERVAL_NAMES[r.box]}.`;
}

async function runTool(name, input, app) {
  if (name === "get_drill_sentences") return JSON.stringify(drillSentences(app.getProgress(), getSpeaking(), input.count ?? 8));
  if (name === "record_drill_result") return recordDrill(input);
  if (name === "save_learner_notes") {
    const saved = setMemory(input.notes ?? []);
    return `Saved ${saved.length} note(s). You'll see them at the start of every chat.`;
  }
  if (name === "lookup_word") return lookup(input.word);
  if (name === "save_to_my_words") {
    const items = (input.items ?? []).map((it) => ({
      word: stripFurigana(it.japanese).trim(),
      reading: it.reading.trim(),
      meaning: it.meaning.trim(),
    }));
    const { added, skipped } = app.addCards(items);
    return `Saved ${added.length} item(s) to My Words.` + (skipped.length ? ` Already saved before: ${skipped.join("、")}.` : "");
  }
  if (name === "get_my_words") {
    const progress = app.getProgress();
    const cards = app.getCards();
    if (!cards.length) return "My Words is empty.";
    return JSON.stringify(cards.map((c) => ({ japanese: c.word, reading: c.reading, meaning: c.meaning, level: levelOf(progress[`w:${c.word}|rec`]) })));
  }
  if (name === "get_my_progress") return progressSummary(app.getProgress(), app.getCards());
  return `Unknown tool: ${name}`;
}

// Short label for the UI, so the learner sees what the agent did.
export function describeTool(name, input) {
  if (name === "lookup_word") return `Looked up ${input.word}`;
  if (name === "save_to_my_words") return `Saved ${input.items?.length ?? 0} to My Words`;
  if (name === "get_my_words") return "Read your saved words";
  if (name === "get_my_progress") return "Checked your progress";
  if (name === "get_drill_sentences") return "Picked drill sentences";
  if (name === "record_drill_result") return input.correct ? "Saved result ✓" : "Saved result ✗";
  if (name === "save_learner_notes") return "Updated memory";
  return name;
}

// ---------- 3. THE MODEL CALL ----------

const BASE_SYSTEM = `You are a friendly, encouraging Japanese tutor inside a beginner's learning app.

How to write:
- Write every kanji word with its reading in brackets right after it, like 図書館[としょかん] or 飲[の]みます. The app shows the reading above the kanji. Never put brackets after kana.
- Keep answers short and simple. Plain text with **bold** for emphasis; short lists are fine. No tables, no headings.
- Don't write romaji unless the learner asks.
- The learner can tap any Japanese phrase to hear it. Keep each Japanese sentence or phrase as one unbroken piece (no English or romaji inside it), and when you offer several ways to say something, put each on its own line.

How to teach:
- When the learner writes Japanese, correct mistakes and briefly explain why.
- Use lookup_word to check readings or meanings you aren't sure of.
- When a useful new word or sentence comes up, offer to save it; use save_to_my_words if they agree. Never say something was saved unless the tool confirmed it.
- When the learner asks what to practise, or wants a quiz, use get_my_progress and get_my_words and focus on what they struggle with.
- Messages marked "[Spoken — speech-recognition transcript]" were said aloud, not typed. For these:
  - Start your reply with the correct Japanese sentence on its own line (the app reads that line aloud so the learner can repeat it), then explain briefly.
  - Correct grammar and word choice as usual. Ignore missing or odd punctuation; the recognizer adds it.
  - The recognizer guesses the most likely sentence, so small pronunciation slips may be hidden. If the transcript is strange, or the "also heard" alternatives differ in meaning, say which word was probably unclear and how it should sound.
  - Ask the learner to say the corrected sentence again, or ask a simple follow-up question to keep the conversation going.
- "Say it in Japanese" speaking drill (when the learner asks for a drill):
  - Call get_drill_sentences once, then give ONE English sentence at a time, e.g. "Say in Japanese: **I'll go to the station tomorrow.**" Never show the Japanese answer before they reply, and put no Japanese at all in the prompt.
  - When they answer, call record_drill_result for that sentence, then begin your reply with the correct Japanese sentence on its own line (it is read aloud), then one short line: ✓ if right, or what to fix and why. Accept any correct version: other natural word orders, leaving out 私は, です/だ variations, punctuation differences.
  - Then give the next English sentence. After the last one, give a short score and the one thing to work on. If they say stop, stop.
- Your memory: below are your notes about this learner from earlier chats. Use them to personalise your teaching.
  - Keep them up to date with save_learner_notes when you notice something lasting (a mistake they keep making, a goal, an interest, their level, how they like to learn), e.g. at the end of a drill. Not for one-off slips.
  - When you add or change a note, say so in a few words (e.g. "I'll remember that you mix up これ and ここ."). If the learner asks you to forget something, remove it.
- When quizzing, ask ONE question at a time and never reveal the answer in the question. Wait for the reply, then say whether it was right.

The app's sentence lessons, in order: ${LESSONS.map((l) => `${l.index + 1}. ${l.title}`).join(", ")}.
Prefer grammar and words from lessons the learner has already practised.`;

// The notes are read fresh for every request, so a note saved mid-chat is used right away.
function systemPrompt() {
  const notes = getMemory();
  return `${BASE_SYSTEM}

Your notes about this learner (from earlier chats):
${notes.length ? notes.map((n) => `- ${n}`).join("\n") : "(none yet)"}`;
}

// ---------- 4. THE AGENT LOOP ----------
// Takes the conversation so far (ending with the new user message) and returns
// the updated conversation plus the final answer. Calls onEvent for each tool
// use and each API call, so the UI can show progress live.
//
// The conversation is in the neutral format described in providers.js, so the
// same loop serves both providers and a saved chat can switch between them.

export async function runTutorTurn({ provider, apiKey, messages, app, onEvent }) {
  const ai = providerOf(provider);
  const convo = [...messages];
  for (let step = 1; step <= MAX_STEPS; step++) {
    const reply = await ai.send({ key: apiKey, system: systemPrompt(), tools: TOOLS, convo });
    onEvent?.({ type: "usage", provider: ai.id, input: reply.usage.input, output: reply.usage.output });
    convo.push({ role: "assistant", text: reply.text, calls: reply.calls });

    // No tool calls means this is the final answer — true of either provider,
    // so the loop never has to look at stop_reason or finish_reason itself.
    if (!reply.calls.length) return { messages: convo, text: reply.text };

    const results = [];
    for (const call of reply.calls) {
      let output;
      let failed = false;
      if (call.badArguments) {
        // The model asked for a tool but its arguments were not valid JSON.
        output = `Tool failed: the arguments were not valid JSON: ${call.badArguments}`;
        failed = true;
      } else {
        try {
          output = await runTool(call.name, call.input, app);
        } catch (err) {
          output = `Tool failed: ${err.message}`; // the model sees the error and can adapt
          failed = true;
        }
      }
      const label = call.input ? describeTool(call.name, call.input) : call.name;
      onEvent?.({ type: "tool", name: call.name, input: call.input, label, failed });
      results.push({ id: call.id, name: call.name, output });
    }
    convo.push({ role: "tool", results });
  }
  return { messages: convo, text: "(I stopped because this took too many steps. Try asking in a simpler way.)" };
}
