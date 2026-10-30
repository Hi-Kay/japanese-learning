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
import TodayPlan from "./TodayPlan.jsx";
import { kanaPracticedToday, markToday, nextKanaStep, readToday } from "../lib/today.js";

const keyOf = (s) => `s:${s.id}`;
const REVIEW_SIZE = 12;

const PARTICLE_CHARS = new Set(["は", "が", "を", "に", "で", "か"]);
const formulaTokens = (formula) => formula.map(([role, label]) => ({ jp: label, role, particle: PARTICLE_CHARS.has(label) }));

// A session left with Back ({ lessonIdx, state }), so it can be continued later —
// kept outside the component so switching tabs doesn't lose it.
let paused = null;

function shuffleApart(order) {
  if (order.length < 2) return order;
  let s;
  do { s = shuffle(order); } while (s.every((v, i) => v === order[i]));
  return s;
}

export default function Sentences({ progress, recordResult, showRomaji, tutorApp, onImmersive, onGoKana }) {
  const [view, setView] = useState("home"); // home | intro | session | summary
  const [lessonIdx, setLessonIdx] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [today, setToday] = useState(readToday);
  const [saved, setSaved] = useState(null);     // the paused session being continued
  const [dayRun, setDayRun] = useState(false);  // going through the Today plan, part by part
  const [justDid, setJustDid] = useState(null); // the Today part just finished: "review" | "lesson"

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

  // Two extra tiles for build exercises, so the answer isn't just putting the given
  // words in order: a particle the sentence doesn't use, and a known word of the same
  // kind as one in the sentence (another verb form, another thing…). Topic and time
  // words are left out — 私は or 毎日 can often be added and still be right.
  const extraTiles = (s, particles) => {
    const used = new Set(s.tokens.map((t) => t.jp));
    const fits = (t) => !used.has(t.jp) && t.role !== "T" && t.role !== "M" && t.id !== "ka";
    const particle = shuffle(particles.filter((p) => p.id !== "wa" && fits(p)))[0];
    const roles = new Set(s.tokens.filter((t) => !t.particle).map((t) => t.role));
    const known = [...new Map(ALL_SENTENCES.filter((o) => o.lesson <= frontier)
      .flatMap((o) => o.tokens).filter((t) => !t.particle && fits(t)).map((t) => [t.id, t])).values()];
    const sameRole = known.filter((t) => roles.has(t.role));
    const word = shuffle(sameRole.length ? sameRole : known)[0];
    return [particle, word].filter(Boolean).map((t) => ({ ...t, role: "Q", comma: false }));
  };

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
    if (type === "build" || type === "dictation") {
      it.extra = extraTiles(s, particles);
      it.shuffled = shuffleApart([...s.tokens, ...it.extra].map((_, i) => i));
    }
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
    paused = null;
    setSaved(null);
    const particles = particlesKnownBy(Math.max(l.index, frontier));
    const fresh = l.sentences.filter((s) => !started(s));
    const seen = l.sentences.filter(started);
    // Only this lesson's sentences, so the session stays on one pattern; reviews of
    // other lessons have their own step in the Today plan.
    // New sentences are met twice: first by ear, then built — receptive before productive.
    const first = shuffle(fresh.map((s) => makeItem(s, "listen", particles)));
    const second = shuffle([...fresh.map((s) => makeItem(s, "build", particles)), ...seen.map((s) => makeItem(s, typeFor(s), particles))]);
    setItems([...first, ...second]);
    setLessonIdx(l.index);
    setView("session");
  };

  const startReview = (list = due) => {
    paused = null;
    setSaved(null);
    const particles = particlesKnownBy(frontier);
    setItems(list.slice(0, REVIEW_SIZE).map((s) => makeItem(s, typeFor(s), particles)));
    setLessonIdx(null);
    setView("session");
  };

  // The paused session for a lesson (or for the review, with null), if there is one.
  const pausedFor = (li) => (paused && paused.lessonIdx === li ? paused.state : null);
  const resume = () => {
    setItems(paused.state.queue);
    setSaved(paused.state);
    setLessonIdx(paused.lessonIdx);
    setView("session");
  };
  const placeText = (st) => `${st.idx} of ${st.queue.length} done`;

  const nextReviewText = () => {
    const upcoming = ALL_SENTENCES.filter(started).map((x) => progress[keyOf(x)].due);
    if (!upcoming.length) return "";
    // Missed sentences are due again within minutes, but the plan has one review a day.
    const next = Math.min(...upcoming);
    const tomorrow = new Date().setHours(24, 0, 0, 0);
    return next < tomorrow ? "That's the review for today. The sentences you missed will come back for more practice." : `All caught up. Next review ${whenText(next)}.`;
  };

  const grade = (s, got) => {
    if (countsForProgress(progress[keyOf(s)], got)) recordResult(keyOf(s), got);
  };

  // ----- TODAY PLAN -----
  const anyStarted = ALL_SENTENCES.some(started);

  // Three steps, about 10 minutes: what's due, one new lesson, one small kana step.
  function todaySteps() {
    // The lesson step: today's lesson until it's learned, otherwise the next one —
    // including a lesson started on an earlier day and not finished yet.
    const lessonToday = today.lesson != null ? LESSONS[today.lesson] : null;
    let lessonStep;
    let planLesson = null;
    if (lessonToday && lessonLearned(lessonToday)) {
      lessonStep = { id: "lesson", title: `Lesson ${lessonToday.index + 1} learned`, detail: "One new lesson a day is plenty", done: true };
    } else if (!lessonToday && LESSONS.every(lessonLearned)) {
      lessonStep = { id: "lesson", title: "All lessons learned", detail: "Keep up the reviews to master them", done: true };
    } else {
      const l = lessonToday ?? upNext;
      const st = statusOf(l);
      planLesson = l.index;
      const place = pausedFor(l.index);
      lessonStep = { id: "lesson", short: l.title, ...(place
        ? { title: `Continue: ${l.title}`, detail: `Lesson ${l.index + 1} · ${placeText(place)}`, onClick: resume, resumes: true }
        : st.state === "new"
        ? { title: `New: ${l.title}`, detail: `Lesson ${l.index + 1} · about 6 min`, onClick: () => { setLessonIdx(l.index); setView("intro"); } }
        : { title: `Finish: ${l.title}`, detail: `Lesson ${l.index + 1} · ${st.learned} of ${st.total} learned`, onClick: () => startLesson(l) }) };
    }

    const steps = [];
    // The review step shows what is actually open right now. Sentences of the lesson
    // in the lesson step are left out, so nothing is counted twice. One review a day
    // is the plan: mistakes come back a minute later and anything over REVIEW_SIZE
    // stays due, but those wait for tomorrow's review instead of reopening this step.
    if (anyStarted) {
      const open = due.filter((x) => x.lesson !== planLesson);
      const n = Math.min(open.length, REVIEW_SIZE);
      const place = pausedFor(null);
      steps.push(place
        ? { id: "review", short: "Review", title: "Review", detail: placeText(place), onClick: resume, resumes: true }
        : n && !today.reviewed
        ? { id: "review", short: "Review", title: "Review", detail: `${n} ${n === 1 ? "sentence" : "sentences"} · about ${Math.max(1, Math.round(n / 3))} min`, onClick: () => startReview(open) }
        : { id: "review", title: "Review", detail: today.reviewed ? "Done for today" : "Nothing due right now", done: true });
    }
    steps.push(lessonStep);
    const kana = nextKanaStep(progress);
    if (kana) {
      steps.push(kanaPracticedToday(progress)
        ? { id: "kana", title: "Kana", detail: "Practiced today", done: true }
        : { id: "kana", short: kana.title, title: `Kana: ${kana.title}`, detail: `${kana.sample} · about 3 min`, onClick: () => onGoKana?.(kana) });
    }
    return steps;
  }
  // ----- SESSION -----
  if (view === "session" && items.length) {
    return (
      <SentenceSession
        key={items[0].key}
        items={items}
        saved={saved}
        hasLesson={lessonIdx != null}
        showRomaji={showRomaji}
        tutorApp={tutorApp}
        onGrade={grade}
        onLeave={(where, state) => {
          paused = state ? { lessonIdx, state } : null;
          setView(where === "intro" ? "intro" : "home");
        }}
        onFinish={(firstTries) => {
          paused = null;
          setJustDid(lessonIdx != null ? "lesson" : "review");
          setSummary({ right: firstTries.filter(Boolean).length, total: firstTries.length });
          setToday(markToday(lessonIdx != null ? { lesson: lessonIdx } : { reviewed: true }));
          setView("summary");
        }}
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
    // Going through the Today plan: offer its next part (one new lesson a day, so not the next lesson).
    const nextPart = dayRun ? todaySteps().find((x) => !x.done && x.id !== justDid) : null;
    const dayDone = dayRun && !nextPart;
    return (
      <div className="flex flex-col items-center gap-4 text-center pt-8">
        <StatusIcon state={lesson ? st.state : "learned"} size="lg" />
        <div className="text-xl font-semibold text-stone-800">{title}</div>
        <div className="text-sm text-stone-500">{summary.right} of {summary.total} right on the first try</div>
        <div className="max-w-xs text-sm text-stone-600 bg-white border border-stone-200 rounded-2xl px-4 py-3">
          {!lesson ? next
            : st.state === "mastered" ? "You know these sentences. They'll come back in Review every few days so you keep them."
            : st.state === "learned" ? `Review it ${st.next === "now" ? "now" : st.next} — a quick review over the next days is what makes it stick. That's it for this lesson today.`
            : `${st.total - st.learned === 1 ? "One sentence needs" : `${st.total - st.learned} sentences need`} one more round — practice again ${st.next === "now" ? "now" : st.next}.`}
        </div>
        {dayDone && <div className="text-sm font-medium text-emerald-700">That's everything for today — well done!</div>}
        <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
          {nextPart && <button onClick={nextPart.onClick} className="py-3.5 rounded-2xl bg-rose-500 text-white font-medium">Next: {nextPart.short}</button>}
          {nextLesson && !dayRun && <button onClick={() => { setLessonIdx(nextLesson.index); setView("intro"); }} className="py-3.5 rounded-2xl bg-rose-500 text-white font-medium">Next: {nextLesson.title}</button>}
          {lesson && <button onClick={() => startLesson(lesson)} className={`py-3.5 rounded-2xl font-medium ${nextLesson || dayRun ? "bg-white border-2 border-stone-200 text-stone-600" : "bg-rose-500 text-white"}`}>Practice again</button>}
          <button onClick={() => { setDayRun(false); setView("home"); }} className="py-3 rounded-2xl text-stone-500 font-medium">{dayRun && !dayDone ? "Stop for now" : "Done"}</button>
        </div>
      </div>
    );
  }

  // ----- LESSON INTRO -----
  if (view === "intro" && lessonIdx != null) {
    const l = LESSONS[lessonIdx];
    const words = newWordsIn(l);
    const roles = [...new Set(l.sentences.flatMap((s) => s.tokens.map((t) => t.role)))].filter((r) => r !== "Q");
    // The ending as this lesson uses it (ください, verb-ます, です…), not a general description.
    const ending = l.formula.filter(([r, label]) => r === "V" && !/^[XY]$/.test(label)).map(([, label]) => label).join(" ");
    const hint = (r) => (r === "V" && ending ? `${ending} — always last` : ROLES[r].hint);
    const place = pausedFor(l.index);
    return (
      <div className="flex flex-col gap-5 pb-24">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 -my-2 bg-stone-50 flex items-center justify-between">
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
              <span key={r} className="flex items-center gap-1 text-[11px] text-stone-500"><span className={`w-2 h-2 rounded-full ${ROLES[r].dot}`} />{ROLES[r].name}: {hint(r)}</span>
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
            {place ? (
              <div className="flex flex-col gap-1">
                <button onClick={resume} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-medium shadow">Continue practice · {placeText(place)}</button>
                <button onClick={() => startLesson(l)} className="py-1.5 text-sm text-stone-500">Start over</button>
              </div>
            ) : (
              <button onClick={() => startLesson(l)} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-medium shadow">{l.sentences.some(started) ? "Practice" : "Start practice"}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TodayPlan steps={todaySteps()} onStart={(step) => { setDayRun(true); step.onClick(); }} />
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
