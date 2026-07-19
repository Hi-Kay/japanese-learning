import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import WritePanel from "./WritePanel.jsx";
import WriteCard from "./WriteCard.jsx";
import VariantNote from "./VariantNote.jsx";
import SessionProgress from "./SessionProgress.jsx";
import { HIRAGANA, KATAKANA } from "../data/kana.js";
import { KANJI } from "../data/kanji.js";
import { RTK_200, STAGE_SIZE } from "../data/rtk.js";
import { MASTER_BOX, SESSION_SIZE, shuffle, speak } from "../lib/srs.js";
import { storage } from "../lib/storage.js";

const SETS = {
  hiragana: { label: "Hiragana", source: HIRAGANA, kanjiLike: false },
  katakana: { label: "Katakana", source: KATAKANA, kanjiLike: false },
  kanji: { label: "Kanji", source: KANJI, kanjiLike: true },
  rtk: { label: "RTK 1–200", source: RTK_200, kanjiLike: true },
};

// Gojūon rows — kana are learned row by row, like every textbook teaches them.
const KANA_ROWS = [
  { label: "a", start: 0, len: 5 }, { label: "ka", start: 5, len: 5 },
  { label: "sa", start: 10, len: 5 }, { label: "ta", start: 15, len: 5 },
  { label: "na", start: 20, len: 5 }, { label: "ha", start: 25, len: 5 },
  { label: "ma", start: 30, len: 5 }, { label: "ya", start: 35, len: 3 },
  { label: "ra", start: 38, len: 5 }, { label: "wa–n", start: 43, len: 3 },
];

// Small colored chip that tells the learner what kind of card they're looking at.
function ModeChip({ kind }) {
  const styles = {
    read: "bg-sky-100 text-sky-600",
    write: "bg-violet-100 text-violet-600",
    new: "bg-amber-100 text-amber-700",
  };
  const labels = { read: "READ", write: "WRITE", new: "NEW" };
  return <span className={`text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full ${styles[kind]}`}>{labels[kind]}</span>;
}

export default function Study({ onAddCard, progress, recordResult, setIds, onImmersive }) {
  const [set, setSet] = useState(setIds[0]);
  const [view, setView] = useState("home");
  const [learnIdx, setLearnIdx] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [writeChar, setWriteChar] = useState(null);
  const [deck, setDeck] = useState([]);
  const [rIdx, setRIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [kanaMode, setKanaMode] = useState(() => storage.get("kanaMode") || "mix");
  const baselineKnown = useRef(new Set());

  const isKanji = SETS[set].kanjiLike;
  const source = SETS[set].source;
  const allDirs = isKanji ? ["rec"] : ["rec", "rcl"];
  const reviewDirs = isKanji ? ["rec"] : kanaMode === "read" ? ["rec"] : kanaMode === "write" ? ["rcl"] : ["rec", "rcl"];

  // Hide the app header during sessions so everything fits without scrolling.
  useEffect(() => {
    onImmersive?.(view !== "home" || !!writeChar);
    return () => onImmersive?.(false);
  }, [view, writeChar, onImmersive]);

  const changeKanaMode = (m) => { setKanaMode(m); storage.set("kanaMode", m); };

  const boxOf = (ch, d) => progress[`${ch}|${d}`]?.box || 0;
  const statusOf = (ch) => {
    if (allDirs.every((d) => boxOf(ch, d) >= MASTER_BOX)) return "known";
    if (allDirs.some((d) => progress[`${ch}|${d}`])) return "learning";
    return "new";
  };
  const progressOf = (ch) => {
    if (!allDirs.some((d) => progress[`${ch}|${d}`])) return -1;
    return allDirs.reduce((a, d) => a + Math.min(boxOf(ch, d), MASTER_BOX) / MASTER_BOX, 0) / allDirs.length;
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
  const now = Date.now();
  const dueCount = source.reduce((acc, it) => acc + reviewDirs.filter((d) => { const st = progress[`${it[0]}|${d}`]; return !st || st.due <= now; }).length, 0);

  const changeSet = (s) => { setSet(s); setView("home"); };
  const startLearn = (i) => { setLearnIdx(i); setLearnFlipped(false); setView("learn"); };

  const startReview = (subset) => {
    const pool0 = subset || source;
    baselineKnown.current = new Set(source.filter((it) => statusOf(it[0]) === "known").map((it) => it[0]));
    const t = Date.now();
    const items = [];
    pool0.forEach((it) => reviewDirs.forEach((d) => { const st = progress[`${it[0]}|${d}`]; items.push({ item: it, dir: d, box: st?.box ?? 0, due: st?.due ?? 0, isNew: !st }); }));
    let pool = items.filter((x) => x.isNew || x.due <= t);
    if (!pool.length) pool = items.slice();
    const ordered = shuffle(pool).sort((a, b) => a.box - b.box).slice(0, SESSION_SIZE);
    // Teach before testing: the first time a character appears in a session and it
    // has never been studied, it becomes an intro card that shows the answer.
    const introduced = new Set();
    const finalDeck = ordered.map(({ item, dir, isNew }) => {
      if (isNew && !introduced.has(item[0])) { introduced.add(item[0]); return { item, dir, intro: true }; }
      return { item, dir };
    });
    setDeck(finalDeck);
    setRIdx(0); setFlipped(false); setResults([]); setView("review");
  };

  const advance = () => {
    setFlipped(false);
    if (rIdx + 1 >= deck.length) { setView("summary"); return; }
    setRIdx(rIdx + 1);
  };

  const grade = (got) => {
    const cur = deck[rIdx];
    recordResult(`${cur.item[0]}|${cur.dir}`, got);
    setResults((r) => [...r, got]);
    advance();
  };

  // Intro cards: mark every unseen direction of this character as "seen once".
  const finishIntro = () => {
    const cur = deck[rIdx];
    allDirs.filter((d) => !progress[`${cur.item[0]}|${d}`]).forEach((d) => recordResult(`${cur.item[0]}|${d}`, true));
    setResults((r) => [...r, null]);
    advance();
  };

  const redoMissed = () => {
    const missed = deck.filter((_, i) => results[i] === false);
    if (!missed.length) return;
    baselineKnown.current = new Set(source.filter((it) => statusOf(it[0]) === "known").map((it) => it[0]));
    setDeck(shuffle(missed).map(({ item, dir }) => ({ item, dir })));
    setRIdx(0); setFlipped(false); setResults([]); setView("review");
  };

  if (writeChar) return (<div className="flex flex-col items-center"><WritePanel char={writeChar} onClose={() => setWriteChar(null)} /></div>);

  // ----- HOME / MAP -----
  if (view === "home") {
    const sections = isKanji
      ? Array.from({ length: Math.ceil(source.length / STAGE_SIZE) }, (_, s) => ({ label: `Stage ${s + 1}`, items: source.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE) }))
      : KANA_ROWS.map((r) => ({ label: `${r.label} row`, items: source.slice(r.start, r.start + r.len) }));
    return (
      <div className="flex flex-col items-center gap-4">
        {setIds.length > 1 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {setIds.map((s) => (
              <button key={s} onClick={() => changeSet(s)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${set === s ? "bg-rose-500 text-white shadow" : "bg-white text-stone-600 border border-stone-200"}`}>{SETS[s].label}</button>
            ))}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-emerald-500">{knownCount}</span>
          <span className="text-sm text-stone-400">of {source.length} known</span>
        </div>
        {set === "rtk" && (
          <div className="text-[11px] text-stone-400 text-center max-w-sm -mt-2">Ordered like “Remembering the Kanji” — each character builds on parts from earlier ones.</div>
        )}
        {!isKanji && (
          <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
            {[["read", "Read"], ["write", "Write"], ["mix", "Mix"]].map(([id, label]) => (
              <button key={id} onClick={() => changeKanaMode(id)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${kanaMode === id ? "bg-white text-rose-500 shadow-sm" : "text-stone-500"}`}>{label}</button>
            ))}
          </div>
        )}
        <button onClick={() => startReview()} className="w-full max-w-sm py-4 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2 shadow active:scale-[0.99] transition">
          <Icon name="cards" size={20} /> Review <span className="text-rose-100 text-sm font-normal">· {dueCount} due</span>
        </button>
        <div className="text-[11px] text-stone-400 -mt-2">Tap any character below to study it</div>
        <div className="w-full flex flex-col gap-3">
          {sections.map((sec) => (
            <div key={sec.label} className="w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-medium text-stone-500">{sec.label}
                  <span className="text-stone-300 font-normal"> · {sec.items.filter((it) => statusOf(it[0]) === "known").length}/{sec.items.length} known</span>
                </span>
                <button onClick={() => startReview(sec.items)} className="text-[11px] font-medium text-rose-500 px-2 py-0.5 rounded-full bg-rose-50">Practice</button>
              </div>
              <div className="w-full grid gap-1.5" style={{ gridTemplateColumns: `repeat(${isKanji ? 10 : 5}, minmax(0,1fr))` }}>
                {sec.items.map((it) => (
                  <button key={it[0]} onClick={() => startLearn(source.indexOf(it))} className={`aspect-square ${isKanji ? "" : "max-h-14"} rounded-md flex items-center justify-center ${isKanji ? "text-sm" : "text-lg"} ${tileClass(it[0])}`}>{it[0]}</button>
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
      </div>
    );
  }

  // ----- LEARN (tap a tile to browse) -----
  if (view === "learn") {
    const it = source[learnIdx];
    const [ch, sound, reading] = it;
    const goPrev = () => { setLearnFlipped(false); setLearnIdx((learnIdx - 1 + source.length) % source.length); };
    const goNext = () => { setLearnFlipped(false); setLearnIdx((learnIdx + 1) % source.length); };
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Back</button>
          <span className="text-xs text-stone-400">{learnIdx + 1} of {source.length}</span>
          <span className="w-12" />
        </div>
        <button onClick={() => setLearnFlipped((f) => !f)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition select-none px-4 text-center">
          {!learnFlipped ? (<div className="text-8xl font-medium text-stone-800">{ch}</div>) : (
            <div>
              <div className="text-3xl font-medium text-rose-500">{sound}</div>
              {isKanji && <div className="text-sm text-stone-500 mt-2">{reading}</div>}
            </div>
          )}
          <div className="text-xs text-stone-300 mt-1">tap to flip</div>
        </button>
        {learnFlipped && <VariantNote char={ch} />}
        <div className="flex gap-4 text-[11px] text-stone-400">
          {allDirs.map((d) => {
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
    const isWrite = !isKanji && cur.dir === "rcl" && !cur.intro;
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between gap-3 max-w-sm">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1 shrink-0"><Icon name="back" size={16} /> Back</button>
          <SessionProgress current={rIdx} total={deck.length} />
        </div>
        {cur.intro ? (
          <>
            <div className="w-full max-w-sm rounded-3xl bg-white border-2 border-amber-200 shadow-sm flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <ModeChip kind="new" />
              <div className="text-7xl font-medium text-stone-800 mt-1">{ch}</div>
              <div className="text-2xl font-medium text-rose-500">{sound}</div>
              {isKanji && <div className="text-sm text-stone-500">{reading}</div>}
              <div className="text-xs text-stone-400 mt-1">A new one — take it in, listen, then continue.</div>
            </div>
            <VariantNote char={ch} />
            <div className="flex items-center gap-3">
              <button onClick={() => speak(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Hear it"><Icon name="volume" /></button>
              <button onClick={() => setWriteChar(ch)} className="p-2 rounded-full bg-white border border-stone-200 text-stone-500" title="Stroke order"><Icon name="brush" /></button>
            </div>
            <button onClick={finishIntro} className="w-full max-w-sm py-3 rounded-2xl bg-amber-400 text-white font-medium">Got it — continue</button>
          </>
        ) : isWrite ? (
          <>
            <div className="flex items-center gap-2">
              <ModeChip kind="write" />
              <span className="text-sm text-stone-500">Draw the character for <span className="text-lg font-medium text-stone-800">{sound}</span></span>
            </div>
            <WriteCard char={ch} revealed={flipped} />
            {!flipped && (<button onClick={() => setFlipped(true)} className="w-full max-w-sm py-3 rounded-2xl bg-stone-800 text-white font-medium">Show answer</button>)}
            {flipped && <VariantNote char={ch} />}
            {flipped && (
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <button onClick={() => grade(false)} className="py-3 rounded-2xl bg-stone-100 text-stone-600 font-medium flex items-center justify-center gap-2"><Icon name="x" /> Missed</button>
                <button onClick={() => grade(true)} className="py-3 rounded-2xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2"><Icon name="check" /> Got it</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ModeChip kind="read" />
              <span className="text-sm text-stone-500">{isKanji ? "What does it mean?" : "What sound is this?"}</span>
            </div>
            <button onClick={() => setFlipped(!flipped)} className="w-full max-w-sm aspect-[4/3] rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition">
              {!flipped ? (<div className="text-8xl font-medium text-stone-800">{ch}</div>) : (
                <div className="text-center">
                  <div className="text-4xl font-medium text-rose-500">{sound}</div>
                  {isKanji && <div className="text-base text-stone-500 mt-2">{reading}</div>}
                </div>
              )}
              <div className="text-xs text-stone-300 mt-1">{flipped ? "" : "tap to reveal"}</div>
            </button>
            {flipped && <VariantNote char={ch} />}
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
          </>
        )}
      </div>
    );
  }

  // ----- SUMMARY -----
  const graded = results.map((r, i) => ({ r, card: deck[i] })).filter((x) => x.r !== null);
  const right = graded.filter((x) => x.r).length;
  const newSeen = results.filter((r) => r === null).length;
  const gained = source.filter((it) => statusOf(it[0]) === "known" && !baselineKnown.current.has(it[0])).length;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon name="check" size={28} /></div>
      <div className="text-lg font-semibold text-stone-800">Nice round</div>
      <div className="text-sm text-stone-500">
        {graded.length > 0 && `${right} of ${graded.length} right`}
        {newSeen > 0 && `${graded.length > 0 ? " · " : ""}${newSeen} new`}
        {gained > 0 && ` · ${gained} turned green`}
      </div>
      {graded.length > 0 && (
        <>
          <div className="grid gap-1.5 w-full max-w-sm" style={{ gridTemplateColumns: "repeat(10, minmax(0,1fr))" }}>
            {graded.map((x, i) => (<div key={i} className={`aspect-square rounded flex items-center justify-center text-sm ${x.r ? "bg-emerald-300 text-emerald-900" : "bg-red-200 text-red-900"}`}>{x.card ? x.card.item[0] : ""}</div>))}
          </div>
          <div className="flex gap-3 text-[11px] text-stone-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-300" /> got it</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" /> missed</span>
          </div>
        </>
      )}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {results.some((r) => r === false) && (<button onClick={redoMissed} className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-medium">Redo the {results.filter((r) => r === false).length} you missed</button>)}
        <div className="flex gap-3">
          <button onClick={() => setView("home")} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">Done</button>
          <button onClick={() => startReview()} className="px-6 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium">New round</button>
        </div>
      </div>
    </div>
  );
}
