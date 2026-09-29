import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Ruby from "./Ruby.jsx";
import SentenceView from "./SentenceView.jsx";
import SessionProgress from "./SessionProgress.jsx";
import { PARTICLE_NOTES } from "../data/sentences.js";
import { checkOrder, sentenceText } from "../lib/sentence.js";
import { shuffle, speak } from "../lib/srs.js";

const KINDS = {
  listen: { label: "LISTEN", cls: "bg-sky-100 text-sky-700", prompt: "What does this mean?" },
  build: { label: "BUILD", cls: "bg-violet-100 text-violet-700", prompt: "Build this in Japanese" },
  particle: { label: "PARTICLE", cls: "bg-amber-100 text-amber-700", prompt: "Which particle fits?" },
  dictation: { label: "LISTEN & BUILD", cls: "bg-emerald-100 text-emerald-700", prompt: "Build what you hear" },
};

const say = (s, slow) => speak(sentenceText(s.tokens), slow ? 0.55 : 0.85);

function AudioButtons({ sentence, big }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button onClick={() => say(sentence)} className={`${big ? "w-20 h-20" : "w-11 h-11"} rounded-full bg-rose-50 text-rose-500 flex items-center justify-center active:scale-95 transition`} title="Play"><Icon name="volume" size={big ? 34 : 20} /></button>
      <button onClick={() => say(sentence, true)} className={`${big ? "px-3 py-2" : "px-2.5 py-1.5"} rounded-full bg-stone-100 text-stone-500 text-xs font-medium`} title="Play slowly">slow</button>
    </div>
  );
}

function Tile({ t, showRomaji, onClick, hidden }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`px-3 py-1.5 rounded-xl bg-white border-2 border-stone-200 border-b-4 flex flex-col items-center leading-tight active:translate-y-px transition ${hidden ? "invisible" : ""}`}>
      <span className="text-xl text-stone-800"><Ruby jp={t.jp} /></span>
      {showRomaji && <span className="text-[10px] text-stone-400">{t.ro}</span>}
    </button>
  );
}

function ListenExercise({ item, result, onAnswer }) {
  const { sentence, options } = item;
  useEffect(() => { say(sentence); }, [item.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <AudioButtons sentence={sentence} big />
      <div className="w-full flex flex-col gap-2">
        {options.map((o) => {
          const plain = "bg-white border-stone-200 text-stone-700";
          const state = !result ? plain : o === sentence.en ? "bg-emerald-50 border-emerald-400 text-emerald-800" : o === result.picked ? "bg-red-50 border-red-300 text-red-700" : `${plain} opacity-50`;
          return (
            <button key={o} disabled={!!result} onClick={() => onAnswer({ correct: o === sentence.en, picked: o })} className={`w-full py-3 px-4 rounded-2xl border-2 text-left transition ${state}`}>{o}</button>
          );
        })}
      </div>
    </>
  );
}

function BuildExercise({ item, result, onAnswer, showRomaji }) {
  const { sentence, shuffled } = item;
  const tokens = sentence.tokens;
  const [picked, setPicked] = useState([]);
  const dictation = item.type === "dictation";
  useEffect(() => { if (dictation) say(sentence); }, [item.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => onAnswer({ ...checkOrder(tokens, picked, { strict: dictation }), picked });
  return (
    <>
      {dictation ? <AudioButtons sentence={sentence} /> : <div className="text-xl font-medium text-stone-800 text-center px-2">{sentence.en}</div>}
      <div className="w-full min-h-[4.5rem] flex flex-wrap justify-center content-start gap-2 py-2 border-b-2 border-dashed border-stone-200">
        {picked.map((ti, pi) => (
          <Tile key={ti} t={tokens[ti]} showRomaji={showRomaji} onClick={result ? undefined : () => setPicked((p) => p.filter((_, j) => j !== pi))} />
        ))}
      </div>
      {!result && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {shuffled.map((ti) => (
              <Tile key={ti} t={tokens[ti]} showRomaji={showRomaji} hidden={picked.includes(ti)} onClick={() => setPicked((p) => [...p, ti])} />
            ))}
          </div>
          <button disabled={picked.length !== tokens.length} onClick={check} className="w-full py-3.5 rounded-2xl bg-stone-800 text-white font-medium disabled:opacity-30 transition">Check</button>
        </>
      )}
    </>
  );
}

function ParticleExercise({ item, result, onAnswer, showRomaji }) {
  const { sentence, blank, options } = item;
  const answer = sentence.tokens[blank];
  return (
    <>
      <div className="flex flex-wrap justify-center items-end gap-x-1 gap-y-2">
        {sentence.tokens.map((t, i) => (
          <div key={i} className="flex flex-col items-center leading-tight">
            {i === blank ? (
              <span className={`text-2xl min-w-10 text-center border-b-2 ${result ? "border-emerald-400 text-emerald-600 font-bold" : "border-rose-300 text-rose-300"}`}>{result ? answer.jp : "?"}</span>
            ) : (
              <span className="text-2xl text-stone-800"><Ruby jp={t.jp} />{t.comma ? "、" : ""}</span>
            )}
            {showRomaji && <span className="text-[10px] text-stone-400">{i === blank && !result ? "…" : t.ro}</span>}
          </div>
        ))}
      </div>
      <div className="text-sm text-stone-500 text-center">{sentence.en}</div>
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((p) => {
          const plain = "bg-white border-stone-200";
          const state = !result ? plain : p.id === answer.id ? "bg-emerald-50 border-emerald-400" : p.id === result.picked ? "bg-red-50 border-red-300" : `${plain} opacity-40`;
          return (
            <button key={p.id} disabled={!!result} onClick={() => onAnswer({ correct: p.id === answer.id, picked: p.id })} className={`w-16 py-2 rounded-2xl border-2 border-b-4 flex flex-col items-center transition ${state}`}>
              <span className="text-2xl text-stone-800">{p.jp}</span>
              <span className="text-[10px] text-stone-400">{p.ro}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Feedback({ item, result, showRomaji, onContinue }) {
  const s = item.sentence;
  const good = result.correct;
  useEffect(() => { say(s); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] ${good ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
        <div className={`font-semibold flex items-center gap-2 ${good ? "text-emerald-700" : "text-rose-600"}`}>
          <Icon name={good ? "check" : "x"} size={20} />
          {good ? (result.exact === false ? "Correct — your order works too!" : "Correct!") : "Not quite — here's how it goes:"}
        </div>
        <SentenceView tokens={s.tokens} showRomaji={showRomaji} />
        <div className="text-center text-sm text-stone-600">{s.en}</div>
        {item.type === "particle" && <div className="text-xs text-amber-800 bg-amber-100/60 rounded-xl px-3 py-2 text-center">{PARTICLE_NOTES[s.tokens[item.blank].id]}</div>}
        <div className="flex items-center justify-center gap-3">
          <AudioButtons sentence={s} />
          <span className="text-[11px] text-stone-400">Say it out loud once</span>
        </div>
        <button onClick={onContinue} className={`w-full py-3.5 rounded-2xl text-white font-medium ${good ? "bg-emerald-500" : "bg-rose-500"}`}>Continue</button>
      </div>
    </div>
  );
}

// Runs a list of exercises. Wrong answers come back once at the end of the
// session (only the first attempt counts for spaced repetition).
export default function SentenceSession({ items, showRomaji, onGrade, onExit, onFinish }) {
  const [queue, setQueue] = useState(items);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [firstTries, setFirstTries] = useState([]);
  const item = queue[idx];
  const kind = KINDS[item.type];

  const answer = (r) => {
    setResult(r);
    if (item.retry) return;
    onGrade(item.sentence, r.correct);
    setFirstTries((f) => [...f, r.correct]);
    if (!r.correct) {
      const again = { ...item, key: `${item.key}-again`, retry: true };
      if (item.shuffled) again.shuffled = shuffle(item.shuffled);
      if (item.type === "listen") again.options = shuffle(item.options);
      setQueue((q) => [...q, again]);
    }
  };

  const next = () => {
    if (idx + 1 >= queue.length) { onFinish(firstTries); return; }
    setIdx(idx + 1);
    setResult(null);
  };

  const props = { item, result, onAnswer: answer, showRomaji };
  return (
    <div className={`flex flex-col items-center gap-5 ${result ? "pb-72" : ""}`}>
      <div className="w-full flex items-center justify-between gap-3 max-w-sm">
        <button onClick={onExit} className="text-stone-400 text-sm flex items-center gap-1 shrink-0"><Icon name="back" size={16} /> Back</button>
        <SessionProgress current={idx} total={queue.length} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full ${kind.cls}`}>{kind.label}</span>
        <span className="text-sm text-stone-500">{item.retry ? "One more try" : kind.prompt}</span>
      </div>
      <div key={item.key} className="w-full max-w-sm flex flex-col items-center gap-5">
        {item.type === "listen" && <ListenExercise {...props} />}
        {(item.type === "build" || item.type === "dictation") && <BuildExercise {...props} />}
        {item.type === "particle" && <ParticleExercise {...props} />}
      </div>
      {result && <Feedback key={`fb-${item.key}`} item={item} result={result} showRomaji={showRomaji} onContinue={next} />}
    </div>
  );
}
