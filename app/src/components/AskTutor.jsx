import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import SentenceView from "./SentenceView.jsx";
import { Message, ToolChips } from "./TutorText.jsx";
import { LESSONS, ROLES } from "../data/sentences.js";
import { surface } from "../lib/sentence.js";
import { runTutorTurn } from "../lib/tutor.js";
import { tutorAccess } from "../lib/tutorStore.js";

// "Ask the tutor" from inside an exercise: a short chat about the sentence on screen.
// The tutor gets the exercise, the right answer and what the learner picked, so a
// question like "why was mine wrong?" needs no explaining. The chat is only kept
// while the sheet is open.

const KIND_NAMES = {
  listen: "Listen and pick the meaning",
  build: "Build the Japanese sentence from word tiles, given the English (two extra tiles don't belong in it)",
  particle: "Fill in the missing particle",
  dictation: "Listen and build the sentence from word tiles (two extra tiles don't belong in it)",
};

const tokenText = (t) => t.jp + (t.comma ? "、" : "");

// What the learner answered, as plain text.
function yourAnswer(item, result) {
  if (item.type === "listen") return result.picked;
  if (item.type === "particle") return item.options.find((p) => p.id === result.picked)?.jp ?? result.picked;
  const tiles = [...item.sentence.tokens, ...(item.extra ?? [])];
  return result.picked.map((i) => surface(tiles[i].jp)).join(" ");
}

function learnerAnswer(item, result) {
  if (item.type === "listen") return `picked the meaning “${yourAnswer(item, result)}”`;
  if (item.type === "particle") return `put ${yourAnswer(item, result)} in the gap where ${item.sentence.tokens[item.blank].jp} goes`;
  return `built ${yourAnswer(item, result)}`;
}

function exerciseContext(item, result) {
  const s = item.sentence;
  const lesson = LESSONS[s.lesson];
  const verdict = result.correct ? (result.exact === false ? "right (a different but valid word order)" : "right") : "wrong";
  return [
    `[Context, not shown to the learner: they are doing a sentence exercise in the app and tapped "Ask the tutor".`,
    `Answer their question about this exercise. Keep it short (a few lines), simple and beginner-friendly, and explain with`,
    `the grammar of their lessons. Don't quiz them unless they ask.]`,
    `Lesson ${lesson.index + 1}: ${lesson.title}. Lesson note: ${lesson.note}`,
    `Exercise: ${KIND_NAMES[item.type]}.`,
    `English: ${s.en}`,
    `Correct Japanese: ${s.tokens.map(tokenText).join("")}。`,
    `Word by word: ${s.tokens.map((t) => `${t.jp} = ${t.particle ? "particle" : t.en} (${ROLES[t.role].name.toLowerCase()})`).join(", ")}`,
    `The learner ${learnerAnswer(item, result)} — ${verdict}.`,
  ].join("\n");
}

function suggestions(item, result) {
  const list = [];
  if (!result.correct) list.push("Why was my answer wrong?");
  list.push("Explain this sentence word by word");
  if (item.type === "particle") list.push(`Why ${item.sentence.tokens[item.blank].jp} here?`);
  else if (result.correct) list.push("How else can I say this?");
  return list;
}

export default function AskTutor({ item, result, app, showRomaji, onClose }) {
  const [access] = useState(tutorAccess);
  const [display, setDisplay] = useState([]);
  const [api, setApi] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveTools, setLiveTools] = useState([]);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [display.length, busy]);

  const send = async (text) => {
    text = text.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const shown = { role: "user", text };
    const before = display;
    setDisplay([...before, shown]);
    // The exercise goes with the first question; follow-ups build on it.
    const content = api.length ? text : `${exerciseContext(item, result)}\n\nQuestion: ${text}`;
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
    } catch (err) {
      setDisplay([...before, shown, { role: "error", text: err.message }]);
      setInput(text);
    } finally {
      setBusy(false);
      setLiveTools([]);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 flex flex-col">
      <div className="max-w-lg w-full mx-auto flex-1 min-h-0 flex flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between pb-3">
          <span className="flex items-center gap-1.5 font-semibold text-stone-800"><Icon name="spark" size={18} className="text-rose-500" /> Ask the tutor</span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-full bg-white border border-stone-200 text-sm text-stone-600">Back to exercise</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pb-3">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-stone-200">
            <SentenceView tokens={item.sentence.tokens} showRomaji={showRomaji} size="sm" />
            <span className="text-xs text-stone-500">{item.sentence.en}</span>
            {!result.correct && <span className="text-xs text-rose-600">Your answer: {yourAnswer(item, result)}</span>}
          </div>

          {!access ? (
            <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              The tutor needs an API key first. Finish this session, then open the <b>Tutor</b> tab and add your Claude or Mistral key — after that you can ask from here.
            </div>
          ) : (
            <>
              {display.length === 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-stone-500 px-1">Ask anything about this sentence, for example</div>
                  {suggestions(item, result).map((q) => (
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
        {access && (
          <div className="flex gap-2 items-end pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder="Why is it …?"
              className="flex-1 resize-none p-3 rounded-2xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 max-h-32"
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()} className="h-12 w-12 shrink-0 rounded-2xl bg-rose-500 text-white flex items-center justify-center disabled:opacity-40" title="Send">
              <Icon name="arrow" size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
