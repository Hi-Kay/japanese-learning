import Icon from "./Icon.jsx";
import { speak } from "../lib/srs.js";

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

export function RichText({ text }) {
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
export const japaneseOnly = (text) =>
  (text.replace(BOLD, "$1").match(JP_PHRASE) ?? [])
    .map((p) => spokenForm(p).replace(/^[、。！？「」・]+|[、。！？「」・]+$/g, ""))
    // Skip lone particles like に or で quoted in an English explanation.
    .filter((p) => (p.match(new RegExp(`[${JP_CHAR}]`, "g")) ?? []).length >= 2)
    .join("。");

// ---------- One message ----------

export function ToolChips({ tools }) {
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

export function Message({ msg }) {
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

