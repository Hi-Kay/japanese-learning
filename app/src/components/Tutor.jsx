import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { costOf, runTutorTurn } from "../lib/tutor.js";
import { speak } from "../lib/srs.js";
import { canListen, listen } from "../lib/listen.js";
import { storage } from "../lib/storage.js";
import { MAX_NOTES, getMemory, setMemory, speakingStats } from "../lib/tutorStore.js";

const KEY_STORE = "tutorApiKey";
const CHAT_STORE = "tutorChat";
const MIC_LANG_STORE = "tutorMicLang";
const MIC_LANGS = [{ id: "ja-JP", label: "日本語" }, { id: "en-US", label: "English" }];
const EMPTY_CHAT = { display: [], api: [], usage: { input: 0, output: 0 } };

const DRILL_PROMPT = "Start a speaking drill: give me English sentences from my lessons to say in Japanese.";
const STARTERS = [
  "What should I practise today?",
  "Quiz me on the sentences I get wrong",
  "Teach me 3 phrases for ordering in a café",
  "Check my sentence: わたしはコーヒーを飲みます",
];

// ---------- Rendering the tutor's text ----------
// Supports **bold**, "- " list items and furigana written as 漢字[かんじ].
// Every Japanese phrase is a button: tap it to hear just that phrase.

const BOLD = /\*\*([^*]+)\*\*/g;
const JP_CHAR = "ぁ-ゖァ-ヺー㐀-䶿一-鿿々〜";
// A run of Japanese: kanji with their [reading], kana, and Japanese punctuation.
const JP_PHRASE = new RegExp(`(?:[㐀-䶿一-鿿々]+\\[[ぁ-ゖァ-ヺー]+\\]|[${JP_CHAR}、。！？「」・])+`, "g");
const RUBY = /([㐀-䶿一-鿿々]+)\[([ぁ-ゖァ-ヺー]+)\]/g;
const HAS_JP = new RegExp(`[${JP_CHAR}]`);

// What the voice should say: kanji replaced by the tutor's reading, so it's never misread.
const spokenForm = (src) => src.replace(RUBY, "$2");

function Furigana({ src }) {
  const out = [];
  let last = 0;
  for (const m of src.matchAll(RUBY)) {
    if (m.index > last) out.push(src.slice(last, m.index));
    out.push(<ruby key={m.index}>{m[1]}<rt className="furigana">{m[2]}</rt></ruby>);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

function Phrase({ src }) {
  if (!HAS_JP.test(src)) return src; // just punctuation
  return (
    <button
      type="button"
      onClick={() => speak(spokenForm(src))}
      title="Tap to hear"
      className="inline rounded-md px-0.5 -mx-0.5 underline decoration-dotted decoration-rose-300 underline-offset-[6px] hover:bg-rose-50 active:bg-rose-100 transition-colors"
    >
      <Furigana src={src} />
    </button>
  );
}

function Plain({ text }) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(JP_PHRASE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Phrase key={m.index} src={m[0]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Inline({ text }) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(BOLD)) {
    if (m.index > last) out.push(<Plain key={`p${last}`} text={text.slice(last, m.index)} />);
    out.push(<strong key={m.index} className="font-semibold text-stone-900"><Plain text={m[1]} /></strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Plain key={`p${last}`} text={text.slice(last)} />);
  return out;
}

function RichText({ text }) {
  return (
    <div className="flex flex-col gap-1.5 leading-loose">
      {text.split(/\n+/).map((line, i) => {
        const item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
        if (item) return <div key={i} className="flex gap-2"><span className="text-rose-300">•</span><span><Inline text={item[1]} /></span></div>;
        return <p key={i}><Inline text={line} /></p>;
      })}
    </div>
  );
}

// The Japanese phrases of a message, for the Listen button. Joined with "。" so the voice
// pauses between them (e.g. between a plain and a polite version), and English is skipped.
const japaneseOnly = (text) =>
  (text.replace(BOLD, "$1").match(JP_PHRASE) ?? [])
    .map((p) => spokenForm(p).replace(/^[、。！？「」・]+|[、。！？「」・]+$/g, ""))
    // Skip lone particles like に or で quoted in an English explanation.
    .filter((p) => (p.match(new RegExp(`[${JP_CHAR}]`, "g")) ?? []).length >= 2)
    .join("。");

// For spoken practice the tutor starts with the corrected sentence; read just that line aloud.
const firstJapaneseLine = (text) => {
  for (const line of text.split(/\n+/)) {
    const jp = japaneseOnly(line);
    if (jp) return jp;
  }
  return "";
};

// ---------- API key setup ----------

function KeySetup({ onSave, onCancel }) {
  const [key, setKey] = useState("");
  const valid = key.trim().startsWith("sk-ant-");
  return (
    <div className="flex flex-col gap-4 p-5 rounded-3xl bg-white border border-stone-200">
      <div className="flex flex-col gap-1">
        <div className="text-lg font-semibold text-stone-800">Set up your AI tutor</div>
        <p className="text-sm text-stone-500">
          The tutor uses Claude through your own Anthropic API key. You pay per use; a practice session typically costs well under one cent.
        </p>
      </div>
      <ol className="text-sm text-stone-600 flex flex-col gap-1 list-decimal pl-5">
        <li>Create a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-rose-500 underline">console.anthropic.com</a></li>
        <li>Set a monthly spending limit there</li>
        <li>Paste the key below</li>
      </ol>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="sk-ant-…"
        autoComplete="off"
        className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800"
      />
      <p className="text-[11px] text-stone-400 -mt-2">Stored only in this browser on this device, and sent only to Anthropic.</p>
      <div className="flex gap-2">
        <button onClick={() => onSave(key.trim())} disabled={!valid} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-medium disabled:opacity-40">Save key</button>
        {onCancel && <button onClick={onCancel} className="px-4 py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium">Cancel</button>}
      </div>
    </div>
  );
}

// ---------- Memory: what the tutor remembers about you ----------
// The notes are shown to the tutor at the start of every chat. Here you can read and delete them.

function MemoryPanel({ notes, onChange, onClose }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white border border-stone-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-stone-800">What the tutor remembers</span>
          <span className="text-[11px] text-stone-400">Read at the start of every chat. Stored only on this device.</span>
        </div>
        <button onClick={onClose} className="p-1 text-stone-400 shrink-0" title="Close"><Icon name="x" size={16} /></button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing yet. When the tutor notices something lasting (a mistake you keep making, a goal, what you like to practise), it writes a short note here.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-700">
              <span className="flex-1">{n}</span>
              <button onClick={() => onChange(notes.filter((_, j) => j !== i))} className="p-0.5 text-stone-400 shrink-0" title="Forget this"><Icon name="trash" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-[11px] text-stone-400">
        <span>{notes.length} of {MAX_NOTES} notes</span>
        {notes.length > 0 && <button onClick={() => onChange([])} className="underline">Forget everything</button>}
      </div>
    </div>
  );
}

// ---------- One message ----------

function ToolChips({ tools }) {
  if (!tools?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tools.map((t, i) => (
        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${t.failed ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-stone-50 border-stone-200 text-stone-500"}`}>
          {t.failed ? "⚠️" : "🔧"} {t.label}
        </span>
      ))}
    </div>
  );
}

function Message({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-rose-500 text-white whitespace-pre-wrap">
        {msg.spoken && <Icon name="mic" size={14} className="inline -mt-0.5 mr-1.5 opacity-80" />}
        {msg.text}
      </div>
    );
  }
  if (msg.role === "error") {
    return <div className="self-stretch px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{msg.text}</div>;
  }
  const jp = japaneseOnly(msg.text);
  return (
    <div className="self-start max-w-[92%] flex flex-col gap-1.5">
      <ToolChips tools={msg.tools} />
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-stone-200 text-stone-700">
        <RichText text={msg.text} />
        {jp && (
          <button onClick={() => speak(jp)} className="mt-2 text-stone-400 flex items-center gap-1 text-xs" title="Hear the Japanese">
            <Icon name="volume" size={14} /> Listen to all
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- The Tutor tab ----------

export default function Tutor({ cards, progress, addCards }) {
  const [apiKey, setApiKey] = useState(() => storage.get(KEY_STORE) || "");
  const [editingKey, setEditingKey] = useState(false);
  const [chat, setChat] = useState(() => storage.getJSON(CHAT_STORE, EMPTY_CHAT));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveTools, setLiveTools] = useState([]);
  const [listening, setListening] = useState(false);
  const [micLang, setMicLang] = useState(() => storage.get(MIC_LANG_STORE) || "ja-JP");
  const [memory, setMemoryState] = useState(getMemory);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [speakStats, setSpeakStats] = useState(speakingStats);
  const editMemory = (notes) => setMemoryState(setMemory(notes));
  const chooseMicLang = (id) => { storage.set(MIC_LANG_STORE, id); setMicLang(id); };
  const stopListening = useRef(null);
  useEffect(() => () => stopListening.current?.(), []); // stop the mic when leaving the tab

  // The agent loop runs across several renders, so it reads app data through refs (always current).
  const cardsRef = useRef(cards);
  const progressRef = useRef(progress);
  useEffect(() => { cardsRef.current = cards; progressRef.current = progress; }, [cards, progress]);

  useEffect(() => { storage.setJSON(CHAT_STORE, chat); }, [chat]);
  // Scroll to the very bottom of the page, so the newest message sits just above the input box.
  useEffect(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }); }, [chat.display.length, liveTools.length, busy]);

  const saveKey = (k) => { storage.set(KEY_STORE, k); setApiKey(k); setEditingKey(false); };
  const removeKey = () => { storage.set(KEY_STORE, ""); setApiKey(""); setEditingKey(false); };

  if (!apiKey || editingKey) {
    return (
      <div className="flex flex-col gap-3">
        <KeySetup onSave={saveKey} onCancel={apiKey ? () => setEditingKey(false) : null} />
        {apiKey && <button onClick={removeKey} className="text-sm text-stone-400 underline self-center">Remove key from this device</button>}
      </div>
    );
  }

  // `voice` is set when the text came from speech recognition: { alternatives }.
  // `fresh` starts from an empty chat (used by the Drill button).
  const send = async (text, voice = null, fresh = false) => {
    text = text.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setLiveTools([]);
    const before = fresh ? { ...EMPTY_CHAT } : chat;
    // Tell the model the text is a transcript, plus what else the recognizer thought it heard.
    const content = voice && !voice.english
      ? `[Spoken — speech-recognition transcript]\n${text}` +
        (voice.alternatives.length ? `\n[The recognizer also heard: ${voice.alternatives.join(" / ")}]` : "")
      : text;
    const userMsg = { role: "user", content };
    const shown = { role: "user", text: text === DRILL_PROMPT ? "Speaking drill, please! 🎤" : text, spoken: !!voice };
    setChat({ ...before, display: [...before.display, shown] });

    const tools = [];
    const usage = { ...before.usage };
    try {
      const result = await runTutorTurn({
        apiKey,
        messages: [...before.api, userMsg],
        app: { getCards: () => cardsRef.current, getProgress: () => progressRef.current, addCards },
        onEvent: (e) => {
          if (e.type === "tool") { tools.push(e); setLiveTools([...tools]); }
          if (e.type === "usage") { usage.input += e.input; usage.output += e.output; }
        },
      });
      setChat({
        display: [...before.display, shown, { role: "assistant", text: result.text, tools }],
        api: result.messages,
        usage,
      });
      if (voice && !voice.english) speak(firstJapaneseLine(result.text)); // say the corrected sentence so you can repeat it
    } catch (err) {
      // Keep the conversation valid: drop the failed turn, show the error, give the text back.
      setChat({ ...before, usage, display: [...before.display, shown, { role: "error", text: err.message }] });
      setInput(text);
    } finally {
      setMemoryState(getMemory());
      setSpeakStats(speakingStats());
      setBusy(false);
      setLiveTools([]);
    }
  };

  const toggleMic = () => {
    if (listening) { stopListening.current?.(); return; }
    setInput("");
    setListening(true);
    const japanese = micLang === "ja-JP";
    stopListening.current = listen({
      lang: micLang,
      onInterim: setInput, // show what's being heard, live
      onDone: ({ text, alternatives }) => {
        setListening(false);
        if (!text) setInput("");
        // Japanese is speaking practice (corrected + read aloud); English is just a question.
        else if (japanese) send(text, { alternatives });
        else send(text, { english: true });
      },
      onError: (message) => {
        setListening(false);
        setInput("");
        setChat((c) => ({ ...c, display: [...c.display, { role: "error", text: message }] }));
      },
    });
  };

  const newChat = () => setChat({ ...EMPTY_CHAT });
  // Drill: answers are spoken in Japanese, so switch the mic to Japanese and start a new chat.
  const startDrill = () => { chooseMicLang("ja-JP"); send(DRILL_PROMPT, null, true); };
  const cost = costOf(chat.usage);
  const longChat = chat.usage.input > 0 && chat.api.length > 30;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-stone-800">AI Tutor</span>
          <span className="text-[11px] text-stone-400">
            {chat.usage.input ? `${(chat.usage.input + chat.usage.output).toLocaleString()} tokens · ≈ $${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)} this chat` : "Ask anything, or write or speak Japanese to get it checked"}
          </span>
        </div>
        <div className="flex gap-1.5 shrink-0 whitespace-nowrap">
          {chat.display.length > 0 && <button onClick={startDrill} disabled={busy} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-500 flex items-center gap-1 disabled:opacity-40"><Icon name="mic" size={13} /> Drill</button>}
          {chat.display.length > 0 && <button onClick={newChat} disabled={busy} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-500 flex items-center gap-1 disabled:opacity-40"><Icon name="plus" size={13} /> New</button>}
          <button onClick={() => setEditingKey(true)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-500">Key</button>
        </div>
      </div>

      {memoryOpen ? (
        <MemoryPanel notes={memory} onChange={editMemory} onClose={() => setMemoryOpen(false)} />
      ) : (
        <button onClick={() => setMemoryOpen(true)} className="self-start flex items-center gap-1.5 text-xs text-stone-500 px-3 py-1.5 rounded-full bg-white border border-stone-200">
          <Icon name="notes" size={13} />
          {memory.length ? `Tutor remembers ${memory.length} ${memory.length === 1 ? "thing" : "things"} about you` : "Tutor memory: empty"}
        </button>
      )}

      {chat.display.length === 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={startDrill} className="w-full rounded-3xl bg-white border-2 border-rose-200 p-5 flex flex-col items-center gap-2 text-center shadow-sm active:scale-[0.99] transition">
            <span className="text-[11px] font-semibold tracking-widest text-rose-400">SPEAKING DRILL</span>
            <span className="text-xl font-semibold text-stone-800 -mt-1">Say it in Japanese</span>
            <span className="text-sm text-stone-500">You get an English sentence from your lessons. Tap 🎤 and say it in Japanese — the tutor checks it and says the right version.</span>
            {speakStats.spoken > 0 && (
              <span className="text-xs text-stone-500">
                {speakStats.spoken} {speakStats.spoken === 1 ? "sentence" : "sentences"} spoken · <span className={speakStats.toReview ? "text-rose-500 font-medium" : ""}>{speakStats.toReview} to review</span> · {speakStats.mastered} mastered
              </span>
            )}
            <span className="w-full py-3 mt-1 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="mic" size={18} /> Start drill</span>
          </button>
          <div className="text-xs font-medium text-stone-500 px-1 mt-2">Or try one of these</div>
          {STARTERS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-2xl bg-white border border-stone-200 text-sm text-stone-700 active:scale-[0.99] transition">{s}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {chat.display.map((m, i) => <Message key={i} msg={m} />)}
        {busy && (
          <div className="self-start flex flex-col gap-1.5">
            <ToolChips tools={liveTools} />
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-stone-200 text-stone-400 text-sm animate-pulse">考え中… thinking</div>
          </div>
        )}
        {longChat && !busy && (
          <div className="text-[11px] text-stone-400 text-center">Long chats resend more text each time and cost more — start a new chat when you change topic.</div>
        )}
      </div>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] bg-stone-50 pt-1 pb-1 shadow-[0_2rem_0_0_#fafaf9]">
        {canListen() && (
          <div className="flex items-center justify-end gap-1.5 mb-1.5 text-[11px] text-stone-400">
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
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends — but not while a Japanese keyboard is still converting kana to kanji.
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
      </div>
    </div>
  );
}
