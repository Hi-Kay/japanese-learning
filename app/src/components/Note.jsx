import Icon from "./Icon.jsx";
import Ruby from "./Ruby.jsx";
import { noteParts, surface } from "../lib/sentence.js";
import { speak } from "../lib/srs.js";

// An explanation text whose Japanese examples can be tapped to hear them.
export default function Note({ text }) {
  return noteParts(text).map((p, i) =>
    p.example ? (
      <button key={i} onClick={() => speak(surface(p.text))} title="Hear it"
        className="inline-flex items-baseline gap-1 px-1.5 mx-0.5 rounded-lg bg-rose-50 text-stone-800 active:scale-95 transition">
        <span><Ruby jp={p.text} /></span><Icon name="volume" size={12} className="self-center text-rose-400 shrink-0" />
      </button>
    ) : (
      <Ruby key={i} jp={p.text} />
    ),
  );
}
