import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import WritePanel from "./WritePanel.jsx";
import AddWordForm from "./AddWordForm.jsx";
import SessionProgress from "./SessionProgress.jsx";
import { VOCAB_CATEGORIES } from "../data/vocab.js";
import { MASTER_BOX, SESSION_SIZE, shuffle, speak } from "../lib/srs.js";

// Personal words use w:* progress keys (kept from the old My Words tab so
// existing progress carries over); curated vocabulary uses v:*.
const MINE = "mine";

export default function Vocabulary({ onAddCard, progress, recordResult, cards, removeCard, onImmersive }) {
  // Land on My Words when the user has saved words; otherwise start with real content.
  const [catId, setCatId] = useState(cards.length ? MINE : VOCAB_CATEGORIES[0].id);
  const [view, setView] = useState("home");
  const [adding, setAdding] = useState(false);
  const [learnIdx, setLearnIdx] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [writeChar, setWriteChar] = useState(null);
  const [deck, setDeck] = useState([]);
  const [rIdx, setRIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sess, setSess] = useState({ right: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [listenMode, setListenMode] = useState(false);
  const baselineKnown = useRef(new Set());

  const isMine = catId === MINE;
  const category = isMine ? null : VOCAB_CATEGORIES.find((c) => c.id === catId);
  const source = isMine
    ? cards.map((c) => ({ jp: c.word, reading: c.reading, meaning: c.meaning, _id: c.id }))
    : category.items;
  const keyOf = (jp) => (isMine ? `w:${jp}|rec` : `v:${jp}|rec`);

  // In listening mode the prompt is audio, so play it as each new card appears.
  useEffect(() => {
    if (view === "review" && listenMode && deck.length && !flipped) speak(deck[rIdx].jp);
  }, [view, listenMode, deck, rIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide the app header during sessions so everything fits without scrolling.
  useEffect(() => {
    onImmersive?.(view !== "home" || !!writeChar);
    return () => onImmersive?.(false);
  }, [view, writeChar, onImmersive]);

  const boxOf = (jp) => progress[keyOf(jp)]?.box || 0;
  const statusOf = (jp) => (boxOf(jp) >= MASTER_BOX ? "known" : progress[keyOf(jp)] ? "learning" : "new");
  const tileClass = (jp) => {
    const st = progress[keyOf(jp)];
    if (!st) return "bg-white text-stone-300 border border-stone-200";
    const p = Math.min(st.box, MASTER_BOX) / MASTER_BOX;
    if (p >= 1) return "bg-emerald-500 text-white";
    if (p >= 0.66) return "bg-emerald-300 text-emerald-900";
    if (p >= 0.34) return "bg-emerald-200 text-emerald-800";
    return "bg-emerald-100 text-emerald-700";
  };
  const knownCount = source.filter((it) => statusOf(it.jp) === "known").length;
  const learningCount = source.filter((it) => statusOf(it.jp) === "learning").length;
  const now = Date.now();
  const dueCount = source.filter((it) => { const st = progress[keyOf(it.jp)]; return !st || st.due <= now; }).length;

  const changeCat = (id) => { setCatId(id); setView("home"); setAdding(false); };
  const startLearn = (i) => { setLearnIdx(i); setLearnFlipped(false); setView("learn"); };

  const startReview = (listen = false) => {
    setListenMode(listen);
    baselineKnown.current = new Set(source.filter((it) => statusOf(it.jp) === "known").map((it) => it.jp));
    const t = Date.now();
    const items = source.map((it) => { const st = progress[keyOf(it.jp)]; return { item: it, box: st?.box ?? 0, due: st?.due ?? 0, isNew: !st }; });
    let pool = items.filter((x) => x.isNew || x.due <= t);
    if (!pool.length) pool = items.slice();
    const ordered = shuffle(pool).sort((a, b) => a.box - b.box).slice(0, SESSION_SIZE);
    setDeck(ordered.map(({ item }) => item));
    setRIdx(0); setFlipped(false); setSess({ right: 0, total: 0 }); setResults([]); setView("review");
  };

  const grade = (got) => {
    const cur = deck[rIdx];
    recordResult(keyOf(cur.jp), got);
    setSess((s) => ({ right: s.right + (got ? 1 : 0), total: s.total + 1 }));
    setResults((r) => [...r, got]);
    setFlipped(false);
    if (rIdx + 1 >= deck.length) { setView("summary"); return; }
    setRIdx(rIdx + 1);
  };

  const redoMissed = () => {
    const missed = deck.filter((_, i) => results[i] === false);
    if (!missed.length) return;
    baselineKnown.current = new Set(source.filter((it) => statusOf(it.jp) === "known").map((it) => it.jp));
    setDeck(shuffle(missed));
    setRIdx(0); setFlipped(false); setSess({ right: 0, total: 0 }); setResults([]); setView("review");
  };

  if (writeChar) return (<div className="flex flex-col items-center"><WritePanel char={writeChar} onClose={() => setWriteChar(null)} /></div>);

  // ----- HOME / MAP -----
  if (view === "home") {
    const hasWords = source.length > 0;
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={() => changeCat(MINE)} className={`px-3.5 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${isMine ? "bg-rose-500 text-white shadow" : "bg-white text-stone-600 border border-stone-200"}`}>
            <Icon name="layers" size={14} /> My Words{cards.length > 0 ? ` (${cards.length})` : ""}
          </button>
          {VOCAB_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => changeCat(c.id)} className={`px-3.5 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${catId === c.id ? "bg-rose-500 text-white shadow" : "bg-white text-stone-600 border border-stone-200"}`}>
              <Icon name={c.icon} size={14} /> {c.label}
            </button>
          ))}
        </div>
        {hasWords && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-emerald-500">{knownCount}</span>
              <span className="text-sm text-stone-400">of {source.length} known</span>
            </div>
            {learningCount > 0 && <span className="text-xs text-stone-400">{learningCount} in progress</span>}
          </div>
        )}
        {isMine && (
          adding ? (
            <div className="w-full max-w-sm"><AddWordForm onAddCard={onAddCard} onClose={() => setAdding(false)} /></div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full max-w-sm py-3 rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 font-medium flex items-center justify-center gap-2 hover:border-rose-300 hover:text-rose-500 transition"><Icon name="plus" size={18} /> Add your own word</button>
          )
        )}
        {hasWords && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <button onClick={() => startReview(false)} className="py-3.5 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2 shadow active:scale-[0.99] transition">
              <Icon name="cards" size={18} /> Review <span className="text-rose-100 text-xs font-normal">· {dueCount} due</span>
            </button>
            <button onClick={() => startReview(true)} className="py-3.5 rounded-2xl bg-white border-2 border-rose-200 text-rose-500 font-medium flex items-center justify-center gap-2 active:scale-[0.99] transition">
              <Icon name="volume" size={18} /> Listen
            </button>
          </div>
        )}
        {hasWords && <div className="text-[11px] text-stone-400 -mt-2">Tap any word below to study it</div>}
        {!hasWords && isMine && !adding && (
          <div className="text-center text-stone-400 py-8 flex flex-col items-center gap-3">
            <Icon name="layers" size={40} className="text-stone-300" />
            <div>No saved words yet.</div>
            <div className="text-sm max-w-xs">Add your own words above, or save them from any category or Kanji card with the + button.</div>
          </div>
        )}
        <div className="w-full flex flex-col gap-1.5">
          {source.map((it, i) => (
            <div key={it._id ?? it.jp} className={`rounded-xl pl-4 ${isMine ? "pr-1" : "pr-4"} py-1 flex items-center ${tileClass(it.jp)}`}>
              <button onClick={() => startLearn(i)} className="flex-1 min-w-0 flex items-center justify-between text-left py-1.5">
                <span className="font-medium">{it.jp}</span>
                <span className="text-xs opacity-70 truncate ml-3">{it.meaning}</span>
              </button>
              {isMine && (
                <button onClick={() => removeCard(it._id)} className="p-2 ml-1 rounded-full text-current opacity-40 hover:opacity-100 shrink-0" title="Remove"><Icon name="trash" size={15} /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ----- LEARN -----
  if (view === "learn") {
    const it = source[learnIdx];
    const single = [...it.jp].length === 1;
    const goPrev = () => { setLearnFlipped(false); setLearnIdx((learnIdx - 1 + source.length) % source.length); };
    const goNext = () => { setLearnFlipped(false); setLearnIdx((learnIdx + 1) % source.length); };
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="w-full flex items-center justify-between max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Back</button>
          <span className="text-xs text-stone-400">{learnIdx + 1} of {source.length}</span>
          <span className="w-12" />
        </div>
        <div className="text-xs text-stone-400">{learnFlipped ? "" : "Recall the meaning, then flip"}</div>
        <button onClick={() => setLearnFlipped((f) => !f)} className="w-full max-w-sm min-h-40 rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition select-none px-5 py-6 text-center">
          {!learnFlipped ? (
            <div className="text-4xl font-medium text-stone-800">{it.jp}</div>
          ) : (
            <div>
              <div className="text-2xl font-medium text-rose-500">{it.reading}</div>
              <div className="text-base text-stone-600 mt-1">{it.meaning}</div>
              {it.example && (
                <div className="mt-4 pt-4 border-t border-stone-100 text-left">
                  <div className="text-lg text-stone-800">{it.example.jp}</div>
                  <div className="text-sm text-rose-400 italic mt-0.5">{it.example.reading}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{it.example.meaning}</div>
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-stone-300 mt-1">{learnFlipped ? "" : "tap to flip"}</div>
        </button>
        <div className="flex gap-4 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">progress
            <span className="flex gap-0.5">{[0, 1, 2].map((k) => <span key={k} className={`w-1.5 h-1.5 rounded-full ${k < Math.min(boxOf(it.jp), MASTER_BOX) ? "bg-emerald-400" : "bg-stone-200"}`} />)}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => speak(it.jp)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
          {single && (<button onClick={() => setWriteChar(it.jp)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order & writing"><Icon name="brush" /></button>)}
          {!isMine && (<button onClick={() => onAddCard({ word: it.jp, reading: it.reading, meaning: it.meaning })} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Save to My Words"><Icon name="plus" /></button>)}
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={goPrev} className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium">Previous</button>
          <button onClick={goNext} className="flex-1 py-3 rounded-2xl bg-stone-800 text-white font-medium flex items-center justify-center gap-2">Next <Icon name="arrow" size={16} /></button>
        </div>
      </div>
    );
  }

  // ----- REVIEW -----
  if (view === "review") {
    if (!deck.length) return null;
    const it = deck[rIdx];
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between gap-3 max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1 shrink-0"><Icon name="back" size={16} /> Back</button>
          <SessionProgress current={rIdx} total={deck.length} />
        </div>
        <div className="text-xs text-stone-400">{listenMode ? "Listen — what was said?" : "What does this mean?"}</div>
        <button onClick={() => setFlipped(!flipped)} className="w-full max-w-sm min-h-40 rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition px-5 py-6 text-center">
          {!flipped ? (
            listenMode ? (
              <span onClick={(e) => { e.stopPropagation(); speak(it.jp); }} className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center" title="Play again"><Icon name="volume" size={30} /></span>
            ) : (
              <div className="text-4xl font-medium text-stone-800">{it.jp}</div>
            )
          ) : (
            <div>
              {listenMode && <div className="text-3xl font-medium text-stone-800 mb-1">{it.jp}</div>}
              <div className="text-2xl font-medium text-rose-500">{it.reading}</div>
              <div className="text-base text-stone-600 mt-1">{it.meaning}</div>
              {it.example && (
                <div className="mt-4 pt-4 border-t border-stone-100 text-left">
                  <div className="text-lg text-stone-800">{it.example.jp}</div>
                  <div className="text-sm text-rose-400 italic mt-0.5">{it.example.reading}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{it.example.meaning}</div>
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-stone-300 mt-1">{flipped ? "" : listenMode ? "tap speaker to replay · tap card to reveal" : "tap to flip"}</div>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => speak(it.jp)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
        </div>
        {flipped && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <button onClick={() => grade(false)} className="py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium flex items-center justify-center gap-2"><Icon name="x" /> Missed</button>
            <button onClick={() => grade(true)} className="py-3 rounded-2xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="check" /> Got it</button>
          </div>
        )}
      </div>
    );
  }

  // ----- SUMMARY -----
  const gained = source.filter((it) => statusOf(it.jp) === "known" && !baselineKnown.current.has(it.jp)).length;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon name="check" size={28} /></div>
      <div className="text-lg font-semibold text-stone-800">Nice round</div>
      <div className="text-sm text-stone-500">{sess.right} of {sess.total} right{gained > 0 ? ` · ${gained} turned green` : ""}</div>
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {results.some((r) => !r) && (<button onClick={redoMissed} className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-medium">Redo the {results.filter((r) => !r).length} you missed</button>)}
        <div className="flex gap-3">
          <button onClick={() => setView("home")} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">Done</button>
          <button onClick={() => startReview(listenMode)} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">New round</button>
        </div>
      </div>
    </div>
  );
}
