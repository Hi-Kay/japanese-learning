import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Ruby from "./Ruby.jsx";
import SentenceView from "./SentenceView.jsx";
import SentenceSession from "./SentenceSession.jsx";
import { ALL_SENTENCES, LESSONS, ROLES, newWordsIn, particlesKnownBy } from "../data/sentences.js";
import { sentenceText, surface } from "../lib/sentence.js";
import { shuffle, speak } from "../lib/srs.js";

const keyOf = (s) => `s:${s.id}`;
const LEARNED = 2; // practiced correctly on two separate occasions → move on
const MASTERED = 4; // still remembered after days → mastered
const REVIEW_SIZE = 12;

const PARTICLE_CHARS = new Set(["は", "が", "を", "に", "で", "か"]);
const formulaTokens = (formula) => formula.map(([role, label]) => ({ jp: label, role, particle: PARTICLE_CHARS.has(label) }));

function shuffleApart(order) {
  if (order.length < 2) return order;
  let s;
  do { s = shuffle(order); } while (s.every((v, i) => v === order[i]));
  return s;
}

export default function Sentences({ progress, recordResult, showRomaji, onImmersive }) {
  const [view, setView] = useState("home"); // home | intro | session | summary
  const [lessonIdx, setLessonIdx] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    onImmersive?.(view !== "home");
    return () => onImmersive?.(false);
  }, [view, onImmersive]);

  const boxOf = (s) => progress[keyOf(s)]?.box || 0;
  const started = (s) => !!progress[keyOf(s)];
  const lessonScore = (l) => l.sentences.reduce((a, s) => a + Math.min(boxOf(s), MASTERED), 0) / (l.sentences.length * MASTERED);
  const lessonLearned = (l) => l.sentences.every((s) => boxOf(s) >= LEARNED);
  const lessonMastered = (l) => l.sentences.every((s) => boxOf(s) >= MASTERED);
  const upNext = LESSONS.find((l) => !lessonLearned(l)) ?? LESSONS.at(-1);
  const now = Date.now();
  const due = ALL_SENTENCES.filter((s) => started(s) && progress[keyOf(s)].due <= now)
    .sort((a, b) => progress[keyOf(a)].due - progress[keyOf(b)].due);
  const frontier = Math.max(upNext.index, ...ALL_SENTENCES.filter(started).map((s) => s.lesson));

  // Exercises get harder as a sentence settles in memory:
  // recognize it by ear → fill in its particle → build it → build it from audio alone.
  const makeItem = (s, type, particles) => {
    const it = { key: `${s.id}-${type}-${Math.random().toString(36).slice(2, 7)}`, sentence: s, type };
    if (type === "particle") {
      const blanks = s.tokens.map((t, i) => (t.particle ? i : -1)).filter((i) => i >= 0);
      if (!blanks.length || particles.length < 2) return makeItem(s, "build", particles);
      it.blank = blanks[Math.floor(Math.random() * blanks.length)];
      it.options = particles;
    }
    if (type === "build" || type === "dictation") it.shuffled = shuffleApart(s.tokens.map((_, i) => i));
    if (type === "listen") {
      const pool = ALL_SENTENCES.filter((o) => o.lesson <= frontier && o.en !== s.en);
      const sameLesson = shuffle(pool.filter((o) => o.lesson === s.lesson));
      const others = [...sameLesson, ...shuffle(pool)].map((o) => o.en).filter((en, i, a) => a.indexOf(en) === i).slice(0, 2);
      it.options = shuffle([s.en, ...others]);
    }
    return it;
  };
  const typeFor = (s) => ["listen", "particle", "build"][boxOf(s)] ?? "dictation";

  const startLesson = (l) => {
    const particles = particlesKnownBy(Math.max(l.index, frontier));
    const fresh = l.sentences.filter((s) => !started(s));
    const seen = l.sentences.filter(started);
    const reviews = due.filter((s) => s.lesson !== l.index).slice(0, 3);
    // New sentences are met twice: first by ear, then built — receptive before productive.
    const first = shuffle([...fresh.map((s) => makeItem(s, "listen", particles)), ...reviews.map((s) => makeItem(s, typeFor(s), particles))]);
    const second = shuffle([...fresh.map((s) => makeItem(s, "build", particles)), ...seen.map((s) => makeItem(s, typeFor(s), particles))]);
    setItems([...first, ...second]);
    setLessonIdx(l.index);
    setView("session");
  };

  const startReview = () => {
    const particles = particlesKnownBy(frontier);
    setItems(due.slice(0, REVIEW_SIZE).map((s) => makeItem(s, typeFor(s), particles)));
    setLessonIdx(null);
    setView("session");
  };

  // Correct answers only move a sentence up when it was due — re-practicing
  // the same day doesn't count as remembering it. Mistakes always count.
  const grade = (s, got) => {
    const st = progress[keyOf(s)];
    if (got && st && st.due > Date.now()) return;
    recordResult(keyOf(s), got);
  };

  // ----- SESSION -----
  if (view === "session" && items.length) {
    return (
      <SentenceSession
        key={items[0].key}
        items={items}
        showRomaji={showRomaji}
        onGrade={grade}
        onExit={() => setView(lessonIdx != null ? "intro" : "home")}
        onFinish={(firstTries) => { setSummary({ right: firstTries.filter(Boolean).length, total: firstTries.length }); setView("summary"); }}
      />
    );
  }

  // ----- SUMMARY -----
  if (view === "summary" && summary) {
    const lesson = lessonIdx != null ? LESSONS[lessonIdx] : null;
    const nextLesson = lesson && lessonLearned(lesson) ? LESSONS[lesson.index + 1] : null;
    return (
      <div className="flex flex-col items-center gap-4 text-center pt-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon name="check" size={32} /></div>
        <div className="text-xl font-semibold text-stone-800">{lesson ? `Lesson ${lesson.index + 1} done` : "Review done"}</div>
        <div className="text-sm text-stone-500">{summary.right} of {summary.total} right on the first try</div>
        {lesson && (
          <div className="w-full max-w-xs flex flex-col gap-1">
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${lessonScore(lesson) * 100}%` }} /></div>
            <div className="text-[11px] text-stone-400">
              {lessonMastered(lesson) ? "Mastered" : lessonLearned(lesson) ? "Learned — review over the next days to master it" : "Practice once more later today to lock it in"}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
          {nextLesson && <button onClick={() => { setLessonIdx(nextLesson.index); setView("intro"); }} className="py-3.5 rounded-2xl bg-rose-500 text-white font-medium">Next: {nextLesson.title}</button>}
          {lesson && <button onClick={() => startLesson(lesson)} className={`py-3.5 rounded-2xl font-medium ${nextLesson ? "bg-white border-2 border-stone-200 text-stone-600" : "bg-rose-500 text-white"}`}>Practice again</button>}
          <button onClick={() => setView("home")} className="py-3 rounded-2xl text-stone-500 font-medium">Done</button>
        </div>
      </div>
    );
  }

  // ----- LESSON INTRO -----
  if (view === "intro" && lessonIdx != null) {
    const l = LESSONS[lessonIdx];
    const words = newWordsIn(l);
    const roles = [...new Set(l.sentences.flatMap((s) => s.tokens.map((t) => t.role)))].filter((r) => r !== "Q");
    return (
      <div className="flex flex-col gap-5 pb-24">
        <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1 self-start"><Icon name="back" size={16} /> Back</button>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs text-stone-400">Lesson {l.index + 1}</span>
          <h2 className="text-2xl font-semibold text-stone-800 -mt-2">{l.title}</h2>
          <SentenceView tokens={formulaTokens(l.formula)} gloss={false} size="lg" />
          <p className="text-sm text-stone-600 max-w-sm">{l.note}</p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {roles.map((r) => (
              <span key={r} className="flex items-center gap-1 text-[11px] text-stone-500"><span className={`w-2 h-2 rounded-full ${ROLES[r].dot}`} />{ROLES[r].name}: {ROLES[r].hint}</span>
            ))}
          </div>
        </div>
        {words.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-stone-500">New words · tap to hear</div>
            <div className="flex flex-wrap gap-1.5">
              {words.map((w) => (
                <button key={w.id} onClick={() => speak(surface(w.jp))} className="px-2.5 py-1 rounded-xl bg-white border border-stone-200 flex flex-col items-start leading-tight">
                  <span className="text-lg text-stone-800"><Ruby jp={w.jp} /></span>
                  <span className="text-[10px] text-stone-400">{showRomaji ? `${w.ro} · ` : ""}{w.en}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-stone-500">Examples · tap to hear</div>
          {l.sentences.map((s) => (
            <button key={s.id} onClick={() => speak(sentenceText(s.tokens))} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-stone-200 active:scale-[0.99] transition">
              <SentenceView tokens={s.tokens} showRomaji={showRomaji} size="sm" />
              <span className="text-xs text-stone-500">{s.en}</span>
            </button>
          ))}
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent pt-6">
          <div className="max-w-lg mx-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button onClick={() => startLesson(l)} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-medium shadow">{l.sentences.some(started) ? "Practice" : "Start practice"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ----- HOME -----
  const anyStarted = ALL_SENTENCES.some(started);
  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => { setLessonIdx(upNext.index); setView("intro"); }} className="w-full rounded-3xl bg-white border-2 border-rose-200 p-5 flex flex-col items-center gap-3 text-center shadow-sm active:scale-[0.99] transition">
        <span className="text-[11px] font-semibold tracking-widest text-rose-400">{anyStarted ? "UP NEXT" : "START HERE"} · LESSON {upNext.index + 1}</span>
        <span className="text-xl font-semibold text-stone-800 -mt-1">{upNext.title}</span>
        <SentenceView tokens={formulaTokens(upNext.formula)} gloss={false} size="sm" />
        <span className="text-sm text-stone-500">{upNext.gist}</span>
        <span className="w-full py-3 rounded-2xl bg-rose-500 text-white font-medium">{upNext.sentences.some(started) ? "Continue" : "Start"}</span>
      </button>
      {anyStarted && (
        <button onClick={startReview} disabled={!due.length} className="w-full py-3.5 rounded-2xl bg-white border-2 border-stone-200 text-stone-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          <Icon name="cards" size={18} /> {due.length ? <>Review <span className="text-stone-400 text-sm font-normal">· {Math.min(due.length, REVIEW_SIZE)} {due.length === 1 ? "sentence" : "sentences"}</span></> : "Review · all caught up"}
        </button>
      )}
      <div className="flex flex-col gap-1.5 mt-1">
        <div className="text-xs font-medium text-stone-500 px-1">All lessons</div>
        {LESSONS.map((l) => {
          const score = lessonScore(l);
          const mastered = lessonMastered(l);
          return (
            <button key={l.id} onClick={() => { setLessonIdx(l.index); setView("intro"); }} className={`flex items-center gap-3 p-3 rounded-2xl bg-white border text-left ${l === upNext ? "border-rose-200" : "border-stone-200"}`}>
              <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${mastered ? "bg-emerald-500 text-white" : score > 0 ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
                {mastered ? <Icon name="check" size={16} /> : l.index + 1}
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-stone-800 truncate">{l.title}</span>
                  <span className="text-[11px] text-stone-400 truncate">{l.gist}</span>
                </span>
                <span className="h-1 rounded-full bg-stone-100 overflow-hidden"><span className="block h-full bg-emerald-400 rounded-full" style={{ width: `${score * 100}%` }} /></span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
