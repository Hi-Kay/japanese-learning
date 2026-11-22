import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import SentenceView from "./SentenceView.jsx";
import { Message, ToolChips, firstJapaneseLine } from "./TutorText.jsx";
import { LESSONS, ROLES } from "../data/sentences.js";
import { plainNote, surface } from "../lib/sentence.js";
import { runTutorTurn } from "../lib/tutor.js";
import { tutorAccess } from "../lib/tutorStore.js";
import { MIC_LANGS, MIC_LANG_STORE, canListen, listen, spokenContent } from "../lib/listen.js";
import { speak, stopSpeaking } from "../lib/speech.js";
import { storage } from "../lib/storage.js";

// "Ask the tutor" from anywhere in the app: a short chat about what is on screen.
// The tutor is told what the learner is looking at (the `topic`), so a question like
// "why was mine wrong?" needs no explaining. The chat is only kept while the sheet
// is open.
//
// topic = { context, suggestions, card, about?, back? }
//   context     – what the learner is looking at, as plain text for the tutor
//   suggestions – questions offered as one-tap starters
//   card        – what to show at the top of the sheet
//   about       – "Ask anything about this …" (default: "this")
//   back        – label of the close button

// What the tutor's tools need from the app (the learner's words and progress).
export const TutorAppContext = createContext(null);

const lines = (...l) => l.filter(Boolean).join("\n");
const intro = (where) => lines(
  `[Context, not shown to the learner: ${where} and tapped "Ask the tutor".`,
  `Answer their question about it. Keep it short (a few lines), simple and beginner-friendly.`,
  `Don't quiz them unless they ask.]`,
);

const KIND_NAMES = {
  listen: "Listen and pick the meaning",
  build: "Build the Japanese sentence from word tiles, given the English (two extra tiles don't belong in it)",
  particle: "Fill in the missing particle",
  say: "Say the Japanese sentence aloud from memory, given the English, then compare with the answer and rate yourself",
  dictation: "Listen and build the sentence from word tiles (two extra tiles don't belong in it)",
  dlisten: "Listen to a two-line dialogue (a question and its answer) and pick the meaning of the answer",
  reply: "Hear a question and say the answer aloud in Japanese (the English of the answer is given), then compare and rate yourself",
};

const tokenText = (t) => t.jp + (t.comma ? "、" : "");

// What the learner answered, as plain text.
function yourAnswer(item, result) {
  if (result.typed != null) return result.typed;
  if (item.type === "listen" || item.type === "dlisten") return result.picked;
  if (item.type === "particle") return item.options.find((p) => p.id === result.picked)?.jp ?? result.picked;
  const tiles = [...item.sentence.tokens, ...(item.extra ?? [])];
  return result.picked.map((i) => surface(tiles[i].jp)).join(" ");
}

function learnerAnswer(item, result) {
  if (result.typed != null) return `typed “${result.typed}” from memory`;
  if (item.type === "say" || item.type === "reply") return `said it aloud and judged it ${result.correct ? "right" : "not right yet"} (the app can't hear it)`;
  if (item.type === "listen" || item.type === "dlisten") return `picked the meaning “${yourAnswer(item, result)}”`;
  if (item.type === "particle") return `put ${yourAnswer(item, result)} in the gap where ${item.sentence.tokens[item.blank].jp} goes`;
  return `built ${yourAnswer(item, result)}`;
}

// `result` is null in Say it after the answer was shown but before the learner rated themself.
function exerciseContext(item, result) {
  const s = item.sentence;
  const lesson = LESSONS[s.lesson];
  const verdict = !result ? "" : result.correct ? (result.exact === false ? "right (a different but valid word order)" : "right") : "wrong";
  return [
    `[Context, not shown to the learner: they are doing a sentence exercise in the app and tapped "Ask the tutor".`,
    `Answer their question about this exercise. Keep it short (a few lines), simple and beginner-friendly, and explain with`,
    `the grammar of their lessons. Don't quiz them unless they ask.]`,
    `Lesson ${lesson.index + 1}: ${lesson.title}. Lesson note: ${plainNote(lesson.note)}`,
    `Exercise: ${KIND_NAMES[item.type]}.`,
    s.dialogue && `Dialogue (${s.dialogue.scene}). Question asked: ${s.dialogue.ask.tokens.map(tokenText).join("")}。 (${s.dialogue.ask.en}) The learner gives the answer below.`,
    `English: ${s.en}`,
    `Correct Japanese: ${s.tokens.map(tokenText).join("")}。`,
    `Word by word: ${s.tokens.map((t) => `${t.jp} = ${t.particle ? "particle" : t.en} (${ROLES[t.role].name.toLowerCase()})`).join(", ")}`,
    result ? `The learner ${learnerAnswer(item, result)} — ${verdict}.` : "The learner tried to say it aloud and has just seen the correct answer; they haven't rated themself yet.",
  ].filter(Boolean).join("\n");
}

function suggestions(item, result) {
  if (!result) return ["Explain this sentence word by word", "How do I pronounce this?", "How else can I say this?"];
  const list = [];
  if (!result.correct) list.push("Why was my answer wrong?");
  list.push("Explain this sentence word by word");
  if (item.type === "particle") list.push(`Why ${item.sentence.tokens[item.blank].jp} here?`);
  else if (result.correct) list.push("How else can I say this?");
  return list;
}

export function sentenceTopic(item, result, showRomaji) {
  return {
    context: exerciseContext(item, result),
    suggestions: suggestions(item, result),
    about: "this sentence",
    back: "Back to exercise",
    card: (
      <>
        <SentenceView tokens={item.sentence.tokens} showRomaji={showRomaji} size="sm" />
        <span className="text-xs text-stone-500">{item.sentence.en}</span>
        {result && !result.correct && ((item.type !== "say" && item.type !== "reply") || result.typed != null) && <span className="text-xs text-rose-600">Your answer: {yourAnswer(item, result)}</span>}
      </>
    ),
  };
}

export default function AskTutor({ item, result, app, showRomaji, onClose }) {
  return <AskSheet topic={sentenceTopic(item, result, showRomaji)} app={app} onClose={onClose} />;
}

// A plain card for a character or word: big Japanese, a small line underneath.
const card = (jp, sub) => (
  <>
    <span className="text-3xl text-stone-800">{jp}</span>
    {sub && <span className="text-xs text-stone-500">{sub}</span>}
  </>
);

export const kanaTopic = (script, ch, romaji) => ({
  context: lines(
    intro(`they are studying ${script} in the app`),
    `Character on screen: ${ch} (${script}, read "${romaji}").`,
  ),
  suggestions: ["How do I pronounce this?", "Which characters look similar, and how do I tell them apart?", "Show me simple words with this character"],
  about: "this character",
  card: card(ch, romaji),
});

export const kanjiTopic = (ch, meaning, reading) => ({
  context: lines(
    intro("they are studying kanji in the app"),
    `Kanji on screen: ${ch}. Meaning: ${meaning}. Readings (romaji): ${reading}.`,
  ),
  suggestions: ["How can I remember this kanji?", "When do I use which reading?", "Show me simple words with this kanji"],
  about: "this kanji",
  card: card(ch, meaning),
});

export const wordTopic = (it) => ({
  context: lines(
    intro("they are studying vocabulary in the app"),
    `Word on screen: ${it.jp} (reading: ${it.reading}). Meaning: ${it.meaning}.`,
    it.example && `Example shown with it: ${it.example.jp} — ${it.example.meaning}`,
  ),
  suggestions: ["Show me this word in simple sentences", "How can I remember this word?", "Is there a similar word I could mix it up with?"],
  about: "this word",
  card: card(it.jp, it.meaning),
});

// A group of kana marks (dakuten, yōon, small っ, long vowels), optionally with the
// item just practiced and the one it is easily confused with.
export const kanaGroupTopic = (group, it, contrast) => ({
  context: lines(
    intro(`they are studying kana sound changes in the app (${group.title}: ${group.subtitle})`),
    `Explanation shown in the app: ${group.note}`,
    `Items in this group: ${group.items.map((x) => `${x.kana} (${x.ro}${x.en ? `, ${x.en}` : ""})`).join(", ")}`,
    it && `They just practiced: ${it.kana} (${it.ro}${it.en ? `, ${it.en}` : ""}).`,
    contrast?.kana && `Easily confused with: ${contrast.kana} (${contrast.ro}${contrast.en ? `, ${contrast.en}` : ""}).`,
  ),
  suggestions: it
    ? [contrast?.kana ? `What is the difference between ${it.kana} and ${contrast.kana}?` : `How do I pronounce ${it.kana}?`, "How can I hear the difference?", "Show me simple words with this sound"]
    : ["Explain this rule in simple words", "How can I hear the difference?", "Show me simple words with these sounds"],
  about: it ? "this" : "this group",
  card: it ? card(it.kana, it.ro + (it.en ? ` · ${it.en}` : "")) : card(group.symbol, group.title),
});

// The button that opens the sheet. `label` makes it a pill with text; without it,
// a round icon button like the speaker and brush next to it.
export function AskButton({ topic, label }) {
  const app = useContext(TutorAppContext);
  const [open, setOpen] = useState(false);
  return (
    <>
      {label ? (
        <button onClick={() => setOpen(true)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-600 active:scale-95 transition">
          <Icon name="spark" size={13} className="text-rose-500" /> {label}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="p-2 rounded-full bg-white border border-stone-200 text-rose-500" title="Ask the tutor" aria-label="Ask the tutor"><Icon name="spark" /></button>
      )}
      {open && createPortal(<AskSheet topic={topic} app={app} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function AskSheet({ topic, app, onClose }) {
  const [access] = useState(tutorAccess);
  const [display, setDisplay] = useState([]);
  const [api, setApi] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveTools, setLiveTools] = useState([]);
  // Speaking works as in the Tutor tab: Japanese is checked and the correction read
  // aloud; English is just a question. The language choice is shared with the tab.
  const [listening, setListening] = useState(false);
  const [micLang, setMicLang] = useState(() => storage.get(MIC_LANG_STORE) || "ja-JP");
  const chooseMicLang = (id) => { storage.set(MIC_LANG_STORE, id); setMicLang(id); };
  const stopListening = useRef(null);
  useEffect(() => () => stopListening.current?.(), []); // stop the mic when the sheet closes
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [display.length, busy]);

  // `voice` is set when the text came from speech recognition: { alternatives } or { english }.
  const send = async (text, voice = null) => {
    text = text.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const shown = { role: "user", text, spoken: !!voice };
    const before = display;
    setDisplay([...before, shown]);
    // The context goes with the first question; follow-ups build on it.
    const said = spokenContent(text, voice);
    const content = api.length ? said : `${topic.context}\n\nQuestion: ${said}`;
    const tools = [];
    try {
      const reply = await runTutorTurn({
        ...access,
        messages: [...api, { role: "user", text: content }],
        app,
        onEvent: (e) => { if (e.type === "tool") { tools.push(e); setLiveTools([...tools]); } },
      });
      setApi(reply.messages);
      setDisplay([...before, shown, { role: "assistant", text: reply.text, tools }]);
      if (voice && !voice.english) speak(firstJapaneseLine(reply.text)); // the corrected sentence, to repeat
    } catch (err) {
      setDisplay([...before, shown, { role: "error", text: err.message }]);
      setInput(text);
    } finally {
      setBusy(false);
      setLiveTools([]);
    }
  };

  const toggleMic = () => {
    if (listening) { stopListening.current?.(); return; }
    stopSpeaking();
    setInput("");
    setListening(true);
    const english = micLang !== "ja-JP";
    stopListening.current = listen({
      lang: micLang,
      onInterim: setInput, // show what's being heard, live
      onDone: ({ text, alternatives }) => {
        setListening(false);
        if (!text) setInput("");
        else send(text, english ? { english: true } : { alternatives });
      },
      onError: (message) => {
        setListening(false);
        setInput("");
        setDisplay((d) => [...d, { role: "error", text: message }]);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 text-stone-800 flex flex-col">
      <div className="max-w-lg w-full mx-auto flex-1 min-h-0 flex flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between pb-3">
          <span className="flex items-center gap-1.5 font-semibold text-stone-800"><Icon name="spark" size={18} className="text-rose-500" /> Ask the tutor</span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-full bg-white border border-stone-200 text-sm text-stone-600">{topic.back ?? "Back"}</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pb-3">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-stone-200">
            {topic.card}
          </div>

          {!access ? (
            <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              The tutor needs an API key first. Open the <b>Tutor</b> tab and add your Claude or Mistral key — after that you can ask from here.
            </div>
          ) : (
            <>
              {display.length === 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-stone-500 px-1">Ask anything about {topic.about ?? "this"}, for example</div>
                  {topic.suggestions.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-left p-3 rounded-2xl bg-white border border-stone-200 text-sm text-stone-700 active:scale-[0.99] transition">{q}</button>
                  ))}
                </div>
              )}
              {display.map((m, i) => <Message key={i} msg={m} />)}
              {busy && (
                <div className="self-start flex flex-col gap-1.5">
                  <ToolChips tools={liveTools} />
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-stone-200 text-stone-400 text-sm animate-pulse">考え中… thinking</div>
                </div>
              )}
            </>
          )}
          <div ref={end} />
        </div>
        {access && canListen() && (
          <div className="flex items-center justify-end gap-1.5 pt-2 text-[11px] text-stone-400">
            <Icon name="mic" size={12} /> Speak in
            <div className="flex rounded-full border border-stone-200 bg-white p-0.5">
              {MIC_LANGS.map((l) => (
                <button key={l.id} onClick={() => chooseMicLang(l.id)} disabled={listening}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition ${micLang === l.id ? "bg-rose-500 text-white" : "text-stone-500"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {access && (
          <div className="flex gap-2 items-end pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder={listening ? (micLang === "ja-JP" ? "聞いています… speak Japanese" : "Listening… speak English") : "Type or speak…"}
              readOnly={listening}
              className="flex-1 resize-none p-3 rounded-2xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 max-h-32"
            />
            {canListen() && (
              <button
                onClick={toggleMic}
                disabled={busy}
                className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center disabled:opacity-40 transition ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-white border border-stone-200 text-rose-500"}`}
                title={listening ? "Stop listening" : micLang === "ja-JP" ? "Speak Japanese" : "Speak English"}
              >
                <Icon name="mic" size={20} />
              </button>
            )}
            <button onClick={() => send(input)} disabled={busy || listening || !input.trim()} className="h-12 w-12 shrink-0 rounded-2xl bg-rose-500 text-white flex items-center justify-center disabled:opacity-40" title="Send">
              <Icon name="arrow" size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
