import { useState } from "react";
import Icon from "./Icon.jsx";
import WritePanel from "./WritePanel.jsx";
import { shuffle, speak } from "../lib/srs.js";

export default function MyWords({ cards, setCards, loading }) {
  const [mode, setMode] = useState("list");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showStroke, setShowStroke] = useState(false);
  const [studyDeck, setStudyDeck] = useState([]);
  const startStudy = () => { setStudyDeck(shuffle(cards)); setIdx(0); setFlipped(false); setShowStroke(false); setMode("study"); };
  const remove = (id) => setCards(cards.filter((c) => c.id !== id));

  if (loading) return <div className="text-center text-stone-400 py-10">Loading your words…</div>;
  if (!cards.length) {
    return (
      <div className="text-center text-stone-400 py-16 flex flex-col items-center gap-3">
        <Icon name="layers" size={40} className="text-stone-300" />
        <div>No saved words yet.</div>
        <div className="text-sm">Save words from Vocabulary or Kanji learning with the + button.</div>
      </div>
    );
  }

  if (mode === "study") {
    const card = studyDeck[idx];
    const single = [...card.word].length === 1;
    const next = () => { setShowStroke(false); if (idx + 1 >= studyDeck.length) { setMode("list"); return; } setIdx(idx + 1); setFlipped(false); };
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="text-sm text-stone-400">{idx + 1} of {studyDeck.length}</div>
        {showStroke ? (
          <WritePanel char={[...card.word][0]} onClose={() => setShowStroke(false)} />
        ) : (
          <>
            <button onClick={() => setFlipped(!flipped)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition">
              {!flipped ? (<div className="text-6xl font-medium text-stone-800">{card.word}</div>) : (
                <div className="text-center"><div className="text-2xl text-rose-500">{card.reading}</div><div className="text-lg text-stone-700 mt-2">{card.meaning}</div></div>
              )}
              <div className="text-xs text-stone-300 mt-2">tap to flip</div>
            </button>
            <div className="flex gap-3 items-center">
              <button onClick={() => speak(card.word)} className="p-3 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
              {single && (<button onClick={() => setShowStroke(true)} className="p-3 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order"><Icon name="brush" /></button>)}
              <button onClick={next} className="px-8 py-3 rounded-2xl bg-rose-500 text-white font-medium">Next</button>
            </div>
            <button onClick={() => setMode("list")} className="text-sm text-stone-400">End session</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm text-stone-400 -mb-1">Words you've saved</div>
      <button onClick={startStudy} className="py-3 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="book" /> Study {cards.length} word{cards.length > 1 ? "s" : ""}</button>
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200">
            <div className="text-2xl font-medium text-stone-800 min-w-12">{c.word}</div>
            <div className="flex-1 min-w-0"><div className="text-sm text-rose-500">{c.reading}</div><div className="text-sm text-stone-600 truncate">{c.meaning}</div></div>
            <button onClick={() => remove(c.id)} className="p-2 rounded-full hover:bg-rose-50 text-stone-300 hover:text-rose-400"><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
