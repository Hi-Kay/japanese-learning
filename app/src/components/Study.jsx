import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import WritePanel from "./WritePanel.jsx";
import WriteCard from "./WriteCard.jsx";
import VariantNote from "./VariantNote.jsx";
import { HIRAGANA, KATAKANA } from "../data/kana.js";
import { KANJI } from "../data/kanji.js";
import { RTK_200, STAGE_SIZE } from "../data/rtk.js";
import { MASTER_BOX, SESSION_SIZE, shuffle, speak } from "../lib/srs.js";

const SETS = {
  hiragana: { label: "Hiragana", source: HIRAGANA, kanjiLike: false },
  katakana: { label: "Katakana", source: KATAKANA, kanjiLike: false },
  kanji: { label: "Kanji", source: KANJI, kanjiLike: true },
  rtk: { label: "RTK 1–200", source: RTK_200, kanjiLike: true },
};

export default function Study({ onAddCard, progress, recordResult }) {
  const [set, setSet] = useState("hiragana");
  const [view, setView] = useState("home");
  const [learnIdx, setLearnIdx] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [writeChar, setWriteChar] = useState(null);
  const [deck, setDeck] = useState([]);
  const [rIdx, setRIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sess, setSess] = useState({ right: 0, total: 0 });
  const [results, setResults] = useState([]);
  const baselineKnown = useRef(new Set());

  const isKanji = SETS[set].kanjiLike;
  const source = SETS[set].source;
  const dirs = isKanji ? ["rec"] : ["rec", "rcl"];

  const boxOf = (ch, d) => progress[`${ch}|${d}`]?.box || 0;
  const statusOf = (ch) => {
    if (dirs.every((d) => boxOf(ch, d) >= MASTER_BOX)) return "known";
    if (dirs.some((d) => progress[`${ch}|${d}`])) return "learning";
    return "new";
  };
  // 0..1 progress toward full mastery (across both directions); -1 = never seen
  const progressOf = (ch) => {
    if (!dirs.some((d) => progress[`${ch}|${d}`])) return -1;
    return dirs.reduce((a, d) => a + Math.min(boxOf(ch, d), MASTER_BOX) / MASTER_BOX, 0) / dirs.length;
  };
  const tileClass = (ch) => {
    const p = progressOf(ch);
    if (p < 0) return "bg-white text-stone-300 border border-stone-200";
    if (p >= 1) return "bg-emerald-500 text-white";
    if (p >= 0.66) return "bg-emerald-300 text-emerald-900";
    if (p >= 0.34) return "bg-emerald-200 text-emerald-800";
    return "bg-emerald-100 text-emerald-700";
  };
  const knownCount = source.filter((it) => statusOf(it[0]) === "known").length;
  const learningCount = source.filter((it) => statusOf(it[0]) === "learning").length;
  const now = Date.now();
  const dueCount = source.reduce((acc, it) => acc + dirs.filter((d) => { const st = progress[`${it[0]}|${d}`]; return !st || st.due <= now; }).length, 0);

  const changeSet = (s) => { setSet(s); setView("home"); };
  const startLearn = (i) => { setLearnIdx(i); setLearnFlipped(false); setView("learn"); };

  const startReview = (subset) => {
    const pool0 = subset || source;
    baselineKnown.current = new Set(source.filter((it) => statusOf(it[0]) === "known").map((it) => it[0]));
    const t = Date.now();
    const items = [];
    pool0.forEach((it) => dirs.forEach((d) => { const st = progress[`${it[0]}|${d}`]; items.push({ item: it, dir: d, box: st?.box ?? 0, due: st?.due ?? 0, isNew: !st }); }));
    let pool = items.filter((x) => x.isNew || x.due <= t);
    if (!pool.length) pool = items.slice();
    const ordered = shuffle(pool).sort((a, b) => a.box - b.box).slice(0, SESSION_SIZE);
    setDeck(ordered.map(({ item, dir }) => ({ item, dir })));
    setRIdx(0); setFlipped(false); setSess({ right: 0, total: 0 }); setResults([]); setView("review");
  };

  const grade = (got) => {
    const cur = deck[rIdx];
    recordResult(`${cur.item[0]}|${cur.dir}`, got);
    setSess((s) => ({ right: s.right + (got ? 1 : 0), total: s.total + 1 }));
    setResults((r) => [...r, got]);
    setFlipped(false);
    if (rIdx + 1 >= deck.length) { setView("summary"); return; }
    setRIdx(rIdx + 1);
  };

  const redoMissed = () => {
    const missed = deck.filter((_, i) => results[i] === false);
    if (!missed.length) return;
    baselineKnown.current = new Set(source.filter((it) => statusOf(it[0]) === "known").map((it) => it[0]));
    setDeck(shuffle(missed));
    setRIdx(0); setFlipped(false); setSess({ right: 0, total: 0 }); setResults([]); setView("review");
  };

  if (writeChar) return (<div className="flex flex-col items-center"><WritePanel char={writeChar} onClose={() => setWriteChar(null)} /></div>);

  // ----- HOME / MAP -----
  if (view === "home") {
    // Kanji-like sets are shown in stages of STAGE_SIZE so 200 tiles feel like levels, not a wall.
    const stages = isKanji
      ? Array.from({ length: Math.ceil(source.length / STAGE_SIZE) }, (_, s) => source.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE))
      : [source];
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-2 flex-wrap justify-center">
          {Object.entries(SETS).map(([s, cfg]) => (
            <button key={s} onClick={() => changeSet(s)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${set === s ? "bg-rose-500 text-white shadow" : "bg-white text-stone-600 border border-stone-200"}`}>{cfg.label}</button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-emerald-500">{knownCount}</span>
            <span className="text-sm text-stone-400">of {source.length} known</span>
          </div>
          {learningCount > 0 && <span className="text-xs text-stone-400">{learningCount} in progress</span>}
        </div>
        {set === "rtk" && (
          <div className="text-[11px] text-stone-400 text-center max-w-sm -mt-2">Ordered like “Remembering the Kanji” — each character builds on parts from earlier ones.</div>
        )}
        <div className="w-full flex flex-col gap-4">
          {stages.map((stage, si) => (
            <div key={si} className="w-full flex flex-col gap-1.5">
              {isKanji && (
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-medium text-stone-500">Stage {si + 1}
                    <span className="text-stone-300 font-normal"> · {stage.filter((it) => statusOf(it[0]) === "known").length}/{stage.length} known</span>
                  </span>
                  <button onClick={() => startReview(stage)} className="text-[11px] font-medium text-rose-500 px-2 py-0.5 rounded-full bg-rose-50">Review stage</button>
                </div>
              )}
              <div className="w-full grid gap-1.5" style={{ gridTemplateColumns: isKanji ? "repeat(10, minmax(0,1fr))" : "repeat(8, minmax(0,1fr))" }}>
                {stage.map((it) => (
                  <button key={it[0]} onClick={() => startLearn(source.indexOf(it))} className={`aspect-square rounded-md flex items-center justify-center ${isKanji ? "text-sm" : "text-base"} ${tileClass(it[0])}`}>{it[0]}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <span>new</span>
          <span className="flex gap-0.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-stone-200" />
            <span className="w-3 h-3 rounded-sm bg-emerald-100" />
            <span className="w-3 h-3 rounded-sm bg-emerald-200" />
            <span className="w-3 h-3 rounded-sm bg-emerald-300" />
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          </span>
          <span>known</span>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <button onClick={() => startLearn(0)} className="border border-stone-200 rounded-2xl p-4 text-center bg-white active:scale-[0.99] transition">
            <div className="text-stone-700 flex justify-center mb-1"><Icon name="book" size={22} /></div>
            <div className="text-base font-medium text-stone-800">Learn</div>
            <div className="text-[11px] text-stone-400">browse freely</div>
          </button>
          <button onClick={() => startReview()} className="border-2 border-rose-300 rounded-2xl p-4 text-center bg-white active:scale-[0.99] transition">
            <div className="text-rose-500 flex justify-center mb-1"><Icon name="cards" size={22} /></div>
            <div className="text-base font-medium text-stone-800">Review</div>
            <div className="text-[11px] text-stone-400">{dueCount} due</div>
          </button>
        </div>
      </div>
    );
  }

  // ----- LEARN -----
  if (view === "learn") {
    const it = source[learnIdx];
    const [ch, sound, reading] = it;
    const goPrev = () => { setLearnFlipped(false); setLearnIdx((learnIdx - 1 + source.length) % source.length); };
    const goNext = () => { setLearnFlipped(false); setLearnIdx((learnIdx + 1) % source.length); };
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="w-full flex items-center justify-between max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Map</button>
          <span className="text-xs text-stone-400">{learnIdx + 1} of {source.length}</span>
          <span className="w-12" />
        </div>
        <div className="text-xs text-stone-400">{learnFlipped ? "" : isKanji ? "Recall the meaning, then flip" : "Recall the sound, then flip"}</div>
        <button onClick={() => setLearnFlipped((f) => !f)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition select-none px-4 text-center">
          {!learnFlipped ? (<div className="text-8xl font-medium text-stone-800">{ch}</div>) : (
            <div>
              <div className="text-3xl font-medium text-rose-500">{sound}</div>
              {isKanji && <div className="text-sm text-stone-500 mt-2">{reading}</div>}
            </div>
          )}
          <div className="text-xs text-stone-300 mt-1">{learnFlipped ? "" : "tap to flip"}</div>
        </button>
        {learnFlipped && <VariantNote char={ch} />}
        <div className="flex gap-4 text-[11px] text-stone-400">
          {dirs.map((d) => {
            const b = Math.min(boxOf(ch, d), MASTER_BOX);
            const label = d === "rec" ? (isKanji ? "recognition" : "read") : "write";
            return (
              <span key={d} className="flex items-center gap-1.5">{label}
                <span className="flex gap-0.5">{[0, 1, 2].map((k) => <span key={k} className={`w-1.5 h-1.5 rounded-full ${k < b ? "bg-emerald-400" : "bg-stone-200"}`} />)}</span>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => speak(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
          <button onClick={() => setWriteChar(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order & writing"><Icon name="brush" /></button>
          {isKanji && (<button onClick={() => onAddCard({ word: ch, reading: reading, meaning: sound })} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Save to My Words"><Icon name="plus" /></button>)}
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
    const cur = deck[rIdx];
    const [ch, sound, reading] = cur.item;
    const isWrite = !isKanji && cur.dir === "rcl";
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="w-full flex items-center justify-between max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Map</button>
          <span className="text-xs text-stone-400">{rIdx + 1} of {deck.length}</span>
          <span className="w-12" />
        </div>
        {isWrite ? (
          <>
            <div className="text-xs text-stone-400">Write the character for</div>
            <div className="text-5xl font-medium text-stone-800">{sound}</div>
            <WriteCard char={ch} revealed={flipped} />
            {!flipped && (<button onClick={() => setFlipped(true)} className="w-full max-w-sm py-3 rounded-2xl bg-stone-800 text-white font-medium">Reveal &amp; compare</button>)}
            {flipped && <VariantNote char={ch} />}
          </>
        ) : (
          <>
            <div className="text-xs text-stone-400">{isKanji ? "What does it mean?" : "What sound is this?"}</div>
            <button onClick={() => setFlipped(!flipped)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition">
              {!flipped ? (<div className="text-8xl font-medium text-stone-800">{ch}</div>) : (
                <div className="text-center">
                  <div className="text-4xl font-medium text-rose-500">{sound}</div>
                  {isKanji && <div className="text-base text-stone-500 mt-2">{reading}</div>}
                </div>
              )}
              <div className="text-xs text-stone-300 mt-1">{flipped ? "" : "tap to flip"}</div>
            </button>
            {flipped && <VariantNote char={ch} />}
          </>
        )}
        <div className="flex items-center gap-3">
          <button onClick={() => speak(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
          <button onClick={() => setWriteChar(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order"><Icon name="brush" /></button>
        </div>
        {flipped && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <button onClick={() => grade(false)} className="py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium flex items-center justify-center gap-2"><Icon name="x" /> Missed</button>
            <button onClick={() => grade(true)} className="py-3 rounded-2xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="check" /> Got it</button>
          </div>
        )}
        <div className="text-sm text-stone-400">{sess.right}/{sess.total} this round</div>
      </div>
    );
  }

  // ----- SUMMARY -----
  const gained = source.filter((it) => statusOf(it[0]) === "known" && !baselineKnown.current.has(it[0])).length;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon name="check" size={28} /></div>
      <div className="text-lg font-semibold text-stone-800">Nice round</div>
      <div className="text-sm text-stone-500">{sess.right} of {sess.total} right{gained > 0 ? ` · ${gained} turned green` : ""}</div>
      <div className="grid gap-1.5 w-full max-w-sm" style={{ gridTemplateColumns: "repeat(10, minmax(0,1fr))" }}>
        {results.map((got, i) => (<div key={i} className={`aspect-square rounded flex items-center justify-center text-sm ${got ? "bg-emerald-300 text-emerald-900" : "bg-red-200 text-red-900"}`}>{deck[i] ? deck[i].item[0] : ""}</div>))}
      </div>
      <div className="flex gap-3 text-[11px] text-stone-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-300" /> got it</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" /> missed</span>
      </div>
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {results.some((r) => !r) && (<button onClick={redoMissed} className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-medium">Redo the {results.filter((r) => !r).length} you missed</button>)}
        <div className="flex gap-3">
          <button onClick={() => setView("home")} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">Done</button>
          <button onClick={() => startReview()} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">New round</button>
        </div>
      </div>
    </div>
  );
}
