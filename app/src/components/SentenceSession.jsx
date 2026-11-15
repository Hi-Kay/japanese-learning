import { useEffect, useRef, useState } from "react";
import AskTutor from "./AskTutor.jsx";
import Icon from "./Icon.jsx";
import Ruby from "./Ruby.jsx";
import SentenceView from "./SentenceView.jsx";
import SessionProgress from "./SessionProgress.jsx";
import { PARTICLE_NOTES } from "../data/sentences.js";
import { checkOrder, checkTyped, slowSpeechText, speechText } from "../lib/sentence.js";
import { canRecord, cancelMic, startMic, stopMic } from "../lib/recorder.js";
import { playClip } from "../lib/speech.js";
import { shuffle, speak, stopSpeaking } from "../lib/srs.js";

const KINDS = {
  listen: { label: "LISTEN", cls: "bg-sky-100 text-sky-700", prompt: "What does this mean?" },
  build: { label: "BUILD", cls: "bg-violet-100 text-violet-700", prompt: "Build this in Japanese" },
  particle: { label: "PARTICLE", cls: "bg-amber-100 text-amber-700", prompt: "Which particle fits?" },
  dictation: { label: "LISTEN & BUILD", cls: "bg-emerald-100 text-emerald-700", prompt: "Build what you hear" },
  say: { label: "SAY IT", cls: "bg-rose-100 text-rose-700", prompt: "Say this in Japanese" },
};

const say = (s, slow) => (slow ? speak(slowSpeechText(s.tokens), 0.6) : speak(speechText(s.tokens)));

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
  const tiles = [...tokens, ...(item.extra ?? [])];
  const [picked, setPicked] = useState(result?.picked ?? []);
  const dictation = item.type === "dictation";
  useEffect(() => { if (dictation) say(sentence); }, [item.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => onAnswer({ ...checkOrder(tokens, picked, { strict: dictation }), picked });
  return (
    <>
      {dictation ? <AudioButtons sentence={sentence} /> : <div className="text-xl font-medium text-stone-800 text-center px-2">{sentence.en}</div>}
      <div className="w-full min-h-[4.5rem] flex flex-wrap justify-center content-start gap-2 py-2 border-b-2 border-dashed border-stone-200">
        {picked.map((ti, pi) => (
          <Tile key={ti} t={tiles[ti]} showRomaji={showRomaji} onClick={result ? undefined : () => setPicked((p) => p.filter((_, j) => j !== pi))} />
        ))}
      </div>
      {!result && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {shuffled.map((ti) => (
              <Tile key={ti} t={tiles[ti]} showRomaji={showRomaji} hidden={picked.includes(ti)} onClick={() => setPicked((p) => [...p, ti])} />
            ))}
          </div>
          <button disabled={!picked.length} onClick={check} className="w-full py-3.5 rounded-2xl bg-stone-800 text-white font-medium disabled:opacity-30 transition">Check</button>
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

// Producing the sentence from nothing: see the English, say the Japanese aloud, then
// look at the answer, hear it, and judge yourself. No tiles to recognize — the words
// have to come from memory. The rating moves straight on to the next exercise.
function SayExercise({ item, result, onAnswer, showRomaji }) {
  const { sentence } = item;
  const [revealed, setRevealed] = useState(!!result);
  const [mic, setMic] = useState("off"); // off · on · denied
  const [takes, setTakes] = useState([]); // the learner's own recordings: { n, url }
  const [typing, setTyping] = useState(result?.typed != null);
  const [typed, setTyped] = useState(result?.typed ?? "");
  const [empty, setEmpty] = useState(false);
  const takesRef = useRef(takes);
  takesRef.current = takes;
  const count = useRef(0);
  useEffect(() => () => { cancelMic(); takesRef.current.forEach((t) => URL.revokeObjectURL(t.url)); }, []);

  // Ends the running recording and adds it to the takes (the last four are kept).
  const finishTake = async () => {
    const url = await stopMic();
    setMic("off");
    if (!url) return null;
    const take = { n: ++count.current, url };
    setTakes((ts) => {
      const all = [...ts, take];
      all.slice(0, -4).forEach((t) => URL.revokeObjectURL(t.url));
      return all.slice(-4);
    });
    return take;
  };
  const record = async () => {
    if (mic === "on") {
      const take = await finishTake();
      // After the answer is shown: hear the new take against the model right away.
      if (take && revealed) playClip(take.url, () => say(sentence));
      return;
    }
    stopSpeaking();
    try { await startMic(); setMic("on"); } catch { setMic("denied"); }
  };
  // Your own voice first, then the model right after it.
  const reveal = async () => {
    const mine = mic === "on" ? await finishTake() : takes.at(-1);
    setRevealed(true);
    if (mine) playClip(mine.url, () => say(sentence));
    else say(sentence);
  };
  const check = () => {
    if (!typed.trim()) { setEmpty(true); return; }
    onAnswer({ ...checkTyped(sentence.tokens, typed), typed });
  };
  const micOk = canRecord() && mic !== "denied";
  const takeList = takes.length > 0 && (
    <div className="w-full flex flex-col items-center gap-1.5">
      <div className="text-xs text-stone-400">{takes.length > 1 ? "Your recordings — tap to compare" : "Your recording — tap to listen"}</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {takes.map((t) => (
          <button key={t.n} onClick={() => playClip(t.url)} aria-label={`Play your recording ${t.n}`}
            className="h-10 px-3.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-1.5 active:scale-95 transition">
            <Icon name="volume" size={16} /> {t.n}
          </button>
        ))}
      </div>
    </div>
  );

  if (typing) {
    return (
      <>
        <div className="text-xl font-medium text-stone-800 text-center px-2">{sentence.en}</div>
        <input
          value={typed} onChange={(e) => { setTyped(e.target.value); setEmpty(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && !result) check(); }}
          disabled={!!result} lang="ja" autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false}
          placeholder="にほんごで…" aria-label="Your answer in Japanese"
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 bg-white text-lg text-stone-800 text-center focus:border-stone-400 outline-none disabled:bg-stone-50"
        />
        {empty && <div className="text-sm text-rose-600">Type the sentence first.</div>}
        {!result && (
          <>
            <button onClick={check} className="w-full py-3.5 rounded-2xl bg-stone-800 text-white font-medium">Check</button>
            <div className="text-xs text-stone-400 text-center">Use the Japanese keyboard. Kana is enough; kanji works too.</div>
            <button onClick={() => { setTyping(false); setEmpty(false); }} className="text-sm text-stone-500 underline underline-offset-2">Say it instead</button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="text-xl font-medium text-stone-800 text-center px-2">{sentence.en}</div>
      {!revealed ? (
        <>
          {micOk ? (
            <div className="w-full flex flex-col items-center gap-2 py-1">
              <button onClick={record} aria-label={mic === "on" ? "Stop recording" : "Record yourself"}
                className={`w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition ${mic === "on" ? "bg-rose-500 text-white animate-pulse" : "bg-rose-50 text-rose-500"}`}>
                {mic === "on" ? <span className="w-6 h-6 rounded-md bg-white" /> : <Icon name="mic" size={34} />}
              </button>
              <div className="text-sm text-stone-500 text-center">
                {mic === "on" ? "Recording… tap to stop" : takes.length ? "Tap the microphone to try again" : "Say it out loud. Tap to record yourself."}
              </div>
            </div>
          ) : (
            <div className="w-full min-h-[4.5rem] flex items-center justify-center gap-2 px-3 rounded-2xl border-2 border-dashed border-stone-200 text-sm text-stone-400 text-center">
              <Icon name="mic" size={18} className="shrink-0" /> {mic === "denied" ? "No microphone access. Say it out loud, then check." : "Say it first, then check"}
            </div>
          )}
          {takeList}
          <button onClick={reveal} className="w-full py-3.5 rounded-2xl bg-stone-800 text-white font-medium">Show the answer</button>
          <button onClick={() => { cancelMic(); setMic("off"); stopSpeaking(); setTyping(true); }} className="text-sm text-stone-500 underline underline-offset-2">Type it instead</button>
        </>
      ) : (
        <>
          <SentenceView tokens={sentence.tokens} showRomaji={showRomaji} />
          <AudioButtons sentence={sentence} />
          {takeList}
          {!result && (
            <>
              {micOk && (
                <button onClick={record}
                  className={`h-11 px-4 rounded-full text-sm font-medium flex items-center gap-2 active:scale-95 transition ${mic === "on" ? "bg-rose-500 text-white animate-pulse" : "bg-rose-50 text-rose-600"}`}>
                  {mic === "on" ? <><span className="w-3.5 h-3.5 rounded-sm bg-white" /> Recording… tap to stop</> : <><Icon name="mic" size={16} /> {takes.length ? "Record again" : "Record yourself"}</>}
                </button>
              )}
              <div className="text-sm text-stone-500">Did you say it like this?</div>
              <div className="w-full grid grid-cols-2 gap-2">
                <button onClick={() => { cancelMic(); onAnswer({ correct: false }, true); }} className="py-3.5 rounded-2xl bg-white border-2 border-stone-200 text-stone-600 font-medium">Not yet</button>
                <button onClick={() => { cancelMic(); onAnswer({ correct: true }, true); }} className="py-3.5 rounded-2xl bg-emerald-500 text-white font-medium">Yes</button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function Feedback({ item, result, showRomaji, onContinue, continueLabel = "Continue", onAsk }) {
  const s = item.sentence;
  const good = result.correct;
  useEffect(() => { say(s); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] ${good ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className={`font-semibold flex items-center gap-2 ${good ? "text-emerald-700" : "text-rose-600"}`}>
            <Icon name={good ? "check" : "x"} size={20} className="shrink-0" />
            {good ? (result.exact === false ? "Correct — your order works too!" : "Correct!") : "Not quite — here's how it goes:"}
          </div>
          <button onClick={onAsk} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-600 active:scale-95 transition">
            <Icon name="spark" size={13} className="text-rose-500" /> Ask why
          </button>
        </div>
        <SentenceView tokens={s.tokens} showRomaji={showRomaji} />
        <div className="text-center text-sm text-stone-600">{s.en}</div>
        {item.type === "particle" && <div className="text-xs text-amber-800 bg-amber-100/60 rounded-xl px-3 py-2 text-center">{PARTICLE_NOTES[s.tokens[item.blank].id]}</div>}
        <div className="flex items-center justify-center gap-3">
          <AudioButtons sentence={s} />
          <span className="text-[11px] text-stone-400">Say it out loud once</span>
        </div>
        <button onClick={onContinue} className={`w-full py-3.5 rounded-2xl text-white font-medium ${good ? "bg-emerald-500" : "bg-rose-500"}`}>{continueLabel}</button>
      </div>
    </div>
  );
}

// Back offers three ways out: look at the previous exercise again, read the lesson's
// explanation, or go home. Leaving keeps your place: onLeave gets the session's state,
// and passing it back as `saved` continues where you were.
function BackMenu({ canPeek, hasLesson, onPeek, onLeave, onClose }) {
  const row = "w-full text-left px-4 py-3 text-sm text-stone-700 active:bg-stone-50";
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-0 top-8 z-40 w-64 rounded-2xl bg-white border border-stone-200 shadow-lg overflow-hidden divide-y divide-stone-100">
        {canPeek && <button onClick={onPeek} className={row}>Previous exercise</button>}
        {hasLesson && <button onClick={() => onLeave("intro")} className={row}>Lesson explanation</button>}
        <button onClick={() => onLeave("home")} className={row}>Home</button>
        <div className="px-4 py-2 text-[11px] text-stone-400">Your place is kept — you can continue later.</div>
      </div>
    </>
  );
}

// Runs a list of exercises. Wrong answers come back once at the end of the
// session (only the first attempt counts for spaced repetition).
export default function SentenceSession({ items, saved, hasLesson, showRomaji, tutorApp, onGrade, onLeave, onFinish }) {
  const [queue, setQueue] = useState(saved?.queue ?? items);
  const [idx, setIdx] = useState(saved?.idx ?? 0);
  const [results, setResults] = useState(saved?.results ?? []); // by position in the queue
  const [firstTries, setFirstTries] = useState(saved?.firstTries ?? []);
  const [peek, setPeek] = useState(null); // an earlier exercise, opened again from Back
  const [menu, setMenu] = useState(false);
  const [asking, setAsking] = useState(false);
  const shown = peek ?? idx;
  const item = queue[shown];
  const result = results[shown] ?? null;
  const kind = KINDS[item.type];

  // `advance`: go straight on, without the feedback panel (the Say it exercise has
  // already shown the answer).
  const answer = (r, advance = false) => {
    setResults((rs) => { const next = [...rs]; next[idx] = r; return next; });
    let tries = firstTries;
    let length = queue.length;
    if (!item.retry) {
      onGrade(item.sentence, r.correct);
      tries = [...firstTries, r.correct];
      setFirstTries(tries);
      if (!r.correct) {
        const again = { ...item, key: `${item.key}-again`, retry: true };
        if (item.shuffled) again.shuffled = shuffle(item.shuffled);
        if (item.type === "listen") again.options = shuffle(item.options);
        setQueue((q) => [...q, again]);
        length++;
      }
    }
    if (!advance) return;
    stopSpeaking();
    if (idx + 1 >= length) onFinish(tries);
    else setIdx(idx + 1);
  };

  const next = () => {
    stopSpeaking();
    setAsking(false);
    if (peek != null) { setPeek(null); return; }
    if (idx + 1 >= queue.length) { onFinish(firstTries); return; }
    setIdx(idx + 1);
  };

  const peekBack = () => { stopSpeaking(); setMenu(false); setAsking(false); setPeek(shown - 1); };

  const leave = (where) => {
    stopSpeaking();
    const resumeAt = results[idx] ? idx + 1 : idx;
    if (resumeAt >= queue.length) { onFinish(firstTries); return; }
    onLeave(where, resumeAt > 0 ? { queue, idx: resumeAt, results, firstTries } : null);
  };

  const props = { item, result, onAnswer: answer, showRomaji };
  return (
    <div className={`flex flex-col items-center gap-5 ${result ? "pb-72" : ""}`}>
      <div className="sticky top-0 z-20 w-full max-w-sm -my-2 py-2 bg-stone-50 flex items-center justify-between gap-3">
        <div className="relative shrink-0">
          <button onClick={() => setMenu(!menu)} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Back</button>
          {menu && <BackMenu canPeek={shown > 0} hasLesson={hasLesson} onPeek={peekBack} onLeave={leave} onClose={() => setMenu(false)} />}
        </div>
        <SessionProgress current={idx} total={queue.length} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full ${kind.cls}`}>{kind.label}</span>
        <span className="text-sm text-stone-500">{peek != null ? "Looking back" : item.retry ? "One more try" : kind.prompt}</span>
      </div>
      <div key={item.key} className="w-full max-w-sm flex flex-col items-center gap-5">
        {item.type === "listen" && <ListenExercise {...props} />}
        {(item.type === "build" || item.type === "dictation") && <BuildExercise {...props} />}
        {item.type === "particle" && <ParticleExercise {...props} />}
        {item.type === "say" && <SayExercise {...props} />}
      </div>
      {result && <Feedback key={`fb-${item.key}`} item={item} result={result} showRomaji={showRomaji} onContinue={next} continueLabel={peek != null ? "Back to where I was" : "Continue"} onAsk={() => setAsking(true)} />}
      {result && asking && <AskTutor item={item} result={result} app={tutorApp} showRomaji={showRomaji} onClose={() => setAsking(false)} />}
    </div>
  );
}
