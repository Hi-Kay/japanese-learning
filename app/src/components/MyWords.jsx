import { useState } from "react";
import Icon from "./Icon.jsx";
import WritePanel from "./WritePanel.jsx";
import { MASTER_BOX, shuffle, speak } from "../lib/srs.js";

const keyOf = (word) => `w:${word}|rec`;

function AddWordForm({ onAddCard, onClose }) {
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const canSave = word.trim() && meaning.trim();
  const save = () => {
    if (!canSave) return;
    onAddCard({ word: word.trim(), reading: reading.trim(), meaning: meaning.trim() });
    setWord(""); setReading(""); setMeaning("");
  };
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-stone-200">
      <div className="text-sm font-medium text-stone-700">Add your own word</div>
      <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Japanese — e.g. 猫 or ねこ" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      <input value={reading} onChange={(e) => setReading(e.target.value)} placeholder="Reading (optional) — e.g. neko" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      <input value={meaning} onChange={(e) => setMeaning(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} placeholder="Meaning — e.g. cat" className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800" />
      <div className="flex gap-2 mt-1">
        <button onClick={save} disabled={!canSave} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"><Icon name="plus" size={15} /> Add word</button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium">Close</button>
      </div>
    </div>
  );
}

export default function MyWords({ cards, setCards, loading, onAddCard, progress, recordResult }) {
  const [mode, setMode] = useState("list");
  const [adding, setAdding] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showStroke, setShowStroke] = useState(false);
  const [studyDeck, setStudyDeck] = useState([]);
  const [sess, setSess] = useState({ right: 0, total: 0 });

  const startStudy = () => {
    // due words first, then the rest — mirrors the main Review behavior
    const now = Date.now();
    const due = cards.filter((c) => { const st = progress[keyOf(c.word)]; return !st || st.due <= now; });
    const rest = cards.filter((c) => !due.includes(c));
    setStudyDeck([...shuffle(due), ...shuffle(rest)]);
    setIdx(0); setFlipped(false); setShowStroke(false); setSess({ right: 0, total: 0 }); setMode("study");
  };
  const remove = (id) => setCards(cards.filter((c) => c.id !== id));
  const dotsOf = (word) => Math.min(progress[keyOf(word)]?.box || 0, MASTER_BOX);

  if (loading) return <div className="text-center text-stone-400 py-10">Loading your words…</div>;

  if (mode === "study" && studyDeck.length) {
    const card = studyDeck[idx];
    const single = [...card.word].length === 1;
    const advance = () => {
      setShowStroke(false);
      if (idx + 1 >= studyDeck.length) { setMode("list"); return; }
      setIdx(idx + 1); setFlipped(false);
    };
    const grade = (got) => {
      recordResult(keyOf(card.word), got);
      setSess((s) => ({ right: s.right + (got ? 1 : 0), total: s.total + 1 }));
      advance();
    };
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="text-sm text-stone-400">{idx + 1} of {studyDeck.length}</div>
        {showStroke ? (
          <WritePanel char={[...card.word][0]} onClose={() => setShowStroke(false)} />
        ) : (
          <>
            <button onClick={() => setFlipped(!flipped)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition px-4">
              {!flipped ? (<div className="text-5xl font-medium text-stone-800 text-center break-all">{card.word}</div>) : (
                <div className="text-center"><div className="text-2xl text-rose-500">{card.reading}</div><div className="text-lg text-stone-700 mt-2">{card.meaning}</div></div>
              )}
              <div className="text-xs text-stone-300 mt-2">tap to flip</div>
            </button>
            <div className="flex gap-3 items-center">
              <button onClick={() => speak(card.word)} className="p-3 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
              {single && (<button onClick={() => setShowStroke(true)} className="p-3 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order"><Icon name="brush" /></button>)}
            </div>
            {flipped ? (
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <button onClick={() => grade(false)} className="py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium flex items-center justify-center gap-2"><Icon name="x" /> Missed</button>
                <button onClick={() => grade(true)} className="py-3 rounded-2xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="check" /> Got it</button>
              </div>
            ) : (
              <button onClick={advance} className="px-8 py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium">Skip</button>
            )}
            <div className="text-sm text-stone-400">{sess.right}/{sess.total} this round</div>
            <button onClick={() => setMode("list")} className="text-sm text-stone-400">End session</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm text-stone-400 -mb-1">Words you've saved</div>
      {adding ? (
        <AddWordForm onAddCard={onAddCard} onClose={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="py-3 rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 font-medium flex items-center justify-center gap-2 hover:border-rose-300 hover:text-rose-500 transition"><Icon name="plus" size={18} /> Add your own word</button>
      )}
      {cards.length > 0 && (
        <button onClick={startStudy} className="py-3 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="book" /> Study {cards.length} word{cards.length > 1 ? "s" : ""}</button>
      )}
      {!cards.length && !adding && (
        <div className="text-center text-stone-400 py-10 flex flex-col items-center gap-3">
          <Icon name="layers" size={40} className="text-stone-300" />
          <div>No saved words yet.</div>
          <div className="text-sm max-w-xs">Add your own words above, or save them from Vocabulary and Kanji learning with the + button.</div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200">
            <div className="text-2xl font-medium text-stone-800 min-w-12">{c.word}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-rose-500">{c.reading}</div>
              <div className="text-sm text-stone-600 truncate">{c.meaning}</div>
            </div>
            <span className="flex gap-0.5 shrink-0" title="Study progress">{[0, 1, 2].map((k) => <span key={k} className={`w-1.5 h-1.5 rounded-full ${k < dotsOf(c.word) ? "bg-emerald-400" : "bg-stone-200"}`} />)}</span>
            <button onClick={() => remove(c.id)} className="p-2 rounded-full hover:bg-rose-50 text-stone-300 hover:text-rose-400"><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
