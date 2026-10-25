import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Ruby from "./Ruby.jsx";
import SentenceView from "./SentenceView.jsx";
import SentenceSession from "./SentenceSession.jsx";
import TextSizeButton from "./TextSizeButton.jsx";
import { ALL_SENTENCES, LESSONS, ROLES, newWordsIn, particlesKnownBy } from "../data/sentences.js";
import { speechText, surface } from "../lib/sentence.js";
import { shuffle, speak } from "../lib/srs.js";
import { countsForProgress, progressStatus, statusLine, whenText } from "../lib/progressStatus.js";
import StatusIcon from "./StatusIcon.jsx";

const keyOf = (s) => `s:${s.id}`;
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
  const statusOf = (l) => progressStatus(l.sentences, keyOf, progress);
  const lessonLearned = (l) => ["learned", "mastered"].includes(statusOf(l).state);
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

  const nextReviewText = () => {
    const upcoming = ALL_SENTENCES.filter(started).map((x) => progress[keyOf(x)].due);
    if (!upcoming.length) return "";
    const when = whenText(Math.min(...upcoming));
    return when === "now" ? "Some sentences are ready again — review once more to lock them in." : `All caught up. Next review ${when}.`;
  };

  const grade = (s, got) => {
    if (countsForProgress(progress[keyOf(s)], got)) recordResult(keyOf(s), got);
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
    const st = lesson ? statusOf(lesson) : progressStatus(ALL_SENTENCES.filter(started), keyOf, progress);
    const title = !lesson ? "Review done"
      : st.state === "mastered" ? `Lesson ${lesson.index + 1} mastered`
      : st.state === "learned" ? `Lesson ${lesson.index + 1} learned` : `Lesson ${lesson.index + 1} practiced`;
    const next = lesson ? null : nextReviewText();
    return (
      <div className="flex flex-col items-center gap-4 text-center pt-8">
        <StatusIcon state={lesson ? st.state : "learned"} size="lg" />
        <div className="text-xl font-semibold text-stone-800">{title}</div>
        <div className="text-sm text-stone-500">{summary.right} of {summary.total} right on the first try</div>
        <div className="max-w-xs text-sm text-stone-600 bg-white border border-stone-200 rounded-2xl px-4 py-3">
          {!lesson ? next
            : st.state === "mastered" ? "You know these sentences. They'll come back in Review every few days so you keep them."
            : st.state === "learned" ? `Come back ${st.next === "now" ? "now" : st.next} for a quick review — reviewing over the next days is what makes it stick.`
            : `${st.total - st.learned === 1 ? "One sentence needs" : `${st.total - st.learned} sentences need`} one more round — practice again ${st.next === "now" ? "now" : st.next}.`}
        </div>
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
        <div className="flex items-center justify-between">
          <button onClick={() => setView("home")} className="text-stone-400 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Back</button>
          <TextSizeButton compact />
        </div>
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
            <button key={s.id} onClick={() => speak(speechText(s.tokens))} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-stone-200 active:scale-[0.99] transition">
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
          const st = statusOf(l);
          const line = statusLine(st);
          return (
            <button key={l.id} onClick={() => { setLessonIdx(l.index); setView("intro"); }} className={`flex items-center gap-3 p-3 rounded-2xl bg-white border text-left ${l === upNext ? "border-rose-200" : "border-stone-200"}`}>
              <StatusIcon state={st.state} label={l.index + 1} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-medium text-stone-800 truncate">{l.title}</span>
                <span className={`text-[11px] truncate ${st.dueNow && st.state !== "mastered" ? "text-rose-500 font-medium" : "text-stone-400"}`}>{line ?? l.gist}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
