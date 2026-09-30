import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import SessionProgress from "./SessionProgress.jsx";
import { KANA_EXTRA } from "../data/kanaExtra.js";
import { contrastOf, makeExercise } from "../lib/kanaQuiz.js";
import { MASTER_BOX, shuffle, speak } from "../lib/srs.js";

const keyOf = (it) => `x:${it.kana}|rec`;
const SESSION = 12;

function PlayRow({ kana, ro, en, highlight, stacked }) {
  return (
    <button onClick={() => speak(kana, 0.75)} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left min-w-0 ${highlight ? "bg-white border-emerald-300" : "bg-white/60 border-stone-200"}`}>
      <Icon name="volume" size={16} className="text-rose-400 shrink-0" />
      {stacked ? (
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-xl text-stone-800">{kana}</span>
          <span className="text-[11px] text-stone-500 truncate">{ro}{en ? ` · ${en}` : ""}</span>
        </span>
      ) : (
        <>
          <span className="text-2xl text-stone-800">{kana}</span>
          <span className="text-sm text-stone-500">{ro}</span>
          {en && <span className="text-xs text-stone-400 truncate">{en}</span>}
        </>
      )}
    </button>
  );
}

// Real pairs (きって/きて) appear twice in the item list; show each pair once.
const uniquePairs = (items) => {
  const seen = new Set();
  return items.filter((it) => {
    const k = [it.kana, it.pair.kana].sort().join("|");
    return !seen.has(k) && seen.add(k);
  });
};

function Quiz({ group, items, showRomaji, onGrade, onExit, onFinish }) {
  const [queue, setQueue] = useState(items);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [firstTries, setFirstTries] = useState([]);
  const ex = queue[idx];
  const { it } = ex;
  const hear = ex.type === "hear";

  useEffect(() => { if (hear) speak(it.kana, 0.75); }, [ex.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (opt) => {
    setPicked(opt);
    speak(it.kana, 0.75);
    if (ex.retry) return;
    onGrade(it, !!opt.correct);
    setFirstTries((f) => [...f, !!opt.correct]);
    if (!opt.correct) setQueue((q) => [...q, { ...ex, key: `${ex.key}-again`, retry: true, options: shuffle(ex.options) }]);
  };
  const next = () => {
    if (idx + 1 >= queue.length) { onFinish(firstTries); return; }
    setIdx(idx + 1);
    setPicked(null);
  };

  const good = picked?.correct;
  const contrast = contrastOf(group, it);
  return (
    <div className={`flex flex-col items-center gap-5 ${picked ? "pb-72" : ""}`}>
      <div className="w-full flex items-center justify-between gap-3 max-w-sm">
        <button onClick={onExit} className="text-stone-400 text-sm flex items-center gap-1 shrink-0"><Icon name="back" size={16} /> Back</button>
        <SessionProgress current={idx} total={queue.length} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full ${hear ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-600"}`}>{hear ? "LISTEN" : "READ"}</span>
        <span className="text-sm text-stone-500">{ex.retry ? "One more try" : hear ? "Which one did you hear?" : "How do you read this?"}</span>
      </div>
      {hear ? (
        <div className="flex items-center gap-3">
          <button onClick={() => speak(it.kana, 0.75)} className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center active:scale-95 transition" title="Play"><Icon name="volume" size={34} /></button>
          <button onClick={() => speak(it.kana, 0.5)} className="px-3 py-2 rounded-full bg-stone-100 text-stone-500 text-xs font-medium">slow</button>
        </div>
      ) : (
        <div className="text-7xl font-medium text-stone-800 py-2">{it.kana}</div>
      )}
      <div className="w-full max-w-sm grid grid-cols-2 gap-2">
        {ex.options.map((o) => {
          const plain = "bg-white border-stone-200";
          const state = !picked ? plain : o.correct ? "bg-emerald-50 border-emerald-400" : o === picked ? "bg-red-50 border-red-300" : `${plain} opacity-40`;
          return (
            <button key={o.label} disabled={!!picked} onClick={() => answer(o)} className={`py-3 rounded-2xl border-2 border-b-4 flex flex-col items-center transition ${state}`}>
              <span className={`${hear ? "text-3xl" : "text-2xl"} text-stone-800`}>{o.label}</span>
              {hear && showRomaji && o.sub && <span className="text-xs text-stone-400">{o.sub}</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className={`fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] ${good ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
            <div className={`font-semibold flex items-center gap-2 ${good ? "text-emerald-700" : "text-rose-600"}`}>
              <Icon name={good ? "check" : "x"} size={20} /> {good ? "Correct!" : "Not quite"}
            </div>
            <div className="text-xs text-stone-500">Tap to compare:</div>
            <PlayRow kana={it.kana} ro={it.ro} en={it.en} highlight />
            {contrast.kana && <PlayRow kana={contrast.kana} ro={contrast.ro} en={contrast.en} />}
            <button onClick={next} className={`w-full py-3.5 rounded-2xl text-white font-medium mt-1 ${good ? "bg-emerald-500" : "bg-rose-500"}`}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

const boxOf = (progress, it) => progress[keyOf(it)]?.box || 0;
const groupScore = (progress, g) => g.items.reduce((a, it) => a + Math.min(boxOf(progress, it), MASTER_BOX), 0) / (g.items.length * MASTER_BOX);
const knownIn = (progress, g) => g.items.filter((it) => boxOf(progress, it) >= MASTER_BOX).length;
const dueIn = (progress, g) => g.items.filter((it) => { const st = progress[keyOf(it)]; return !st || st.due <= Date.now(); }).length;

// Cards for the Kana home screen.
export function ExtraGroupList({ script, progress, onOpen }) {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="px-0.5">
        <div className="text-sm font-semibold text-stone-700">Marks & sound changes</div>
        <div className="text-[11px] text-stone-400">Best after the basic rows above</div>
      </div>
      {KANA_EXTRA[script].map((g) => {
        const score = groupScore(progress, g);
        return (
          <button key={g.id} onClick={() => onOpen(g.id)} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-stone-200 text-left active:scale-[0.99] transition">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-xl text-stone-700">{g.symbol}</span>
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-stone-800">{g.title} <span className="text-stone-400 font-normal text-xs">· {g.subtitle}</span></span>
                <span className="text-[11px] text-stone-400 shrink-0">{knownIn(progress, g)}/{g.items.length}</span>
              </span>
              <span className="h-1 rounded-full bg-stone-100 overflow-hidden"><span className="block h-full bg-emerald-400 rounded-full" style={{ width: `${score * 100}%` }} /></span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// One group: explanation → practice → summary.
export function KanaGroup({ script, groupId, progress, recordResult, showRomaji, onExit }) {
  const group = KANA_EXTRA[script].find((g) => g.id === groupId);
  const [view, setView] = useState("intro");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);

  const start = () => {
    const now = Date.now();
    const ranked = shuffle(group.items)
      .map((it) => ({ it, st: progress[keyOf(it)] }))
      .sort((a, b) => ((a.st && a.st.due > now) - (b.st && b.st.due > now)) || ((a.st?.box ?? 0) - (b.st?.box ?? 0)));
    // Easier first: read it (see the mark), then hear it (tell it apart by ear).
    setItems(ranked.slice(0, SESSION).map(({ it, st }) => {
      const box = st?.box ?? 0;
      const type = it.noHear || box === 0 ? "read" : box === 1 ? "hear" : Math.random() < 0.5 ? "read" : "hear";
      return makeExercise(group, it, type);
    }));
    setView("quiz");
  };

  // Only recall on a later occasion moves an item up; mistakes always count.
  const grade = (it, got) => {
    const st = progress[keyOf(it)];
    if (got && st && st.due > Date.now()) return;
    recordResult(keyOf(it), got);
  };

  if (view === "quiz") {
    return (
      <Quiz key={items[0]?.key} group={group} items={items} showRomaji={showRomaji} onGrade={grade}
        onExit={() => setView("intro")}
        onFinish={(tries) => { setSummary({ right: tries.filter(Boolean).length, total: tries.length }); setView("summary"); }} />
    );
  }

  if (view === "summary") {
    return (
      <div className="flex flex-col items-center gap-4 text-center pt-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon name="check" size={32} /></div>
        <div className="text-xl font-semibold text-stone-800">{group.title} practice done</div>
        <div className="text-sm text-stone-500">{summary.right} of {summary.total} right on the first try</div>
        <div className="w-full max-w-xs flex flex-col gap-1">
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${groupScore(progress, group) * 100}%` }} /></div>
          <div className="text-[11px] text-stone-400">{knownIn(progress, group)} of {group.items.length} known</div>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
          <button onClick={start} className="py-3.5 rounded-2xl bg-rose-500 text-white font-medium">Practice again</button>
          <button onClick={onExit} className="py-3 rounded-2xl text-stone-500 font-medium">Done</button>
        </div>
      </div>
    );
  }

  const due = dueIn(progress, group);
  const tileCls = (it) => {
    const b = boxOf(progress, it);
    if (!progress[keyOf(it)]) return "bg-white border-stone-200 text-stone-700";
    if (b >= MASTER_BOX) return "bg-emerald-500 border-emerald-500 text-white";
    return "bg-emerald-100 border-emerald-200 text-emerald-800";
  };
  return (
    <div className="flex flex-col gap-5 pb-24">
      <button onClick={onExit} className="text-stone-400 text-sm flex items-center gap-1 self-start"><Icon name="back" size={16} /> Back</button>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="w-16 h-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-3xl text-stone-700">{group.symbol}</span>
        <h2 className="text-2xl font-semibold text-stone-800">{group.title}</h2>
        <span className="text-xs text-stone-400 -mt-1">{group.subtitle}</span>
        <p className="text-sm text-stone-600 max-w-sm">{group.note}</p>
      </div>
      <div className="text-xs font-medium text-stone-500">{group.kind === "words" ? "Word pairs · tap to hear the difference" : "Tap to hear"}</div>
      {group.kind === "chars" ? (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${group.id === "youon" ? 3 : 5}, minmax(0,1fr))` }}>
          {group.items.map((it) => (
            <button key={it.kana} onClick={() => speak(it.kana, 0.75)} className={`py-2 rounded-xl border flex flex-col items-center ${tileCls(it)}`}>
              <span className="text-xl">{it.kana}</span>
              <span className="text-[10px] opacity-70">{it.ro}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {uniquePairs(group.items).map((it) => (
            <div key={it.kana} className="grid grid-cols-2 gap-2">
              <PlayRow kana={it.kana} ro={it.ro} en={it.en} highlight stacked />
              <PlayRow kana={it.pair.kana} ro={it.pair.ro} en={it.pair.en ?? "no common word"} stacked />
            </div>
          ))}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent pt-6">
        <div className="max-w-lg mx-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={start} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-medium shadow">
            Practice <span className="text-rose-100 text-sm font-normal">· {Math.min(due || group.items.length, SESSION)} to go</span>
          </button>
        </div>
      </div>
    </div>
  );
}
