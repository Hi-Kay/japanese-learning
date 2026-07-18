import { useState } from "react";
import Icon from "./Icon.jsx";
import { lookupWord } from "../data/dictionary.js";

export default function AddWordForm({ onAddCard, onClose }) {
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const canSave = word.trim() && meaning.trim();

  // Look up either direction: typing in the Japanese field or the Meaning field
  // offers dictionary matches that fill in the rest.
  const suggest = (q) => setSuggestions(lookupWord(q));
  const pick = ([jp, kana, romaji, english]) => {
    setWord(jp);
    setReading(kana === jp ? romaji : `${kana} · ${romaji}`);
    setMeaning(english.replaceAll("/", " / "));
    setSuggestions([]);
  };
  const save = () => {
    if (!canSave) return;
    onAddCard({ word: word.trim(), reading: reading.trim(), meaning: meaning.trim() });
    setWord(""); setReading(""); setMeaning(""); setSuggestions([]);
  };
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-stone-200">
      <div className="text-sm font-medium text-stone-700">Add your own word</div>
      <div className="text-[11px] text-stone-400 -mt-1">Type Japanese or English — matching words from the built-in dictionary fill in the rest.</div>
      <input value={word} onChange={(e) => { setWord(e.target.value); suggest(e.target.value); }} placeholder="Japanese — e.g. 犬 or いぬ" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      <input value={reading} onChange={(e) => setReading(e.target.value)} placeholder="Reading (optional) — e.g. いぬ · inu" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      <input value={meaning} onChange={(e) => { setMeaning(e.target.value); suggest(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") save(); }} placeholder="Meaning — e.g. dog" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => pick(s)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-left active:scale-[0.99]">
              <span className="text-lg text-stone-800">{s[0]}</span>
              <span className="text-xs text-rose-500">{s[1] !== s[0] ? `${s[1]} · ` : ""}{s[2]}</span>
              <span className="text-xs text-stone-500 truncate flex-1">{s[3]}</span>
              <Icon name="plus" size={14} className="text-rose-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <button onClick={save} disabled={!canSave} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"><Icon name="plus" size={15} /> Add word</button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium">Close</button>
      </div>
    </div>
  );
}
