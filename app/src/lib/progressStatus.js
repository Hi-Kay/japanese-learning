// Turns spaced-repetition levels into the three states a learner sees:
//   new → learned (answered correctly in practice) → mastered (still known days later)
// plus a plain-language "when" for the next review.

export const LEARNED = 2;
export const MASTERED = 4;

// "now", "in 8 min", "later today", "tomorrow", "in 3 days"
export function whenText(due, now = Date.now()) {
  if (due <= now) return "now";
  const day = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(due) - day(now)) / 86400000);
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  const min = Math.ceil((due - now) / 60000);
  return min < 60 ? `in ${min} min` : "later today";
}

export function progressStatus(items, keyOf, progress, now = Date.now()) {
  const sts = items.map((it) => progress[keyOf(it)]);
  const started = sts.filter(Boolean);
  const total = items.length;
  const learned = sts.filter((st) => (st?.box ?? 0) >= LEARNED).length;
  const mastered = sts.filter((st) => (st?.box ?? 0) >= MASTERED).length;
  // Something can be practiced right now if an item is due or hasn't been tried yet.
  const dueNow = started.length > 0 && (started.length < total || started.some((st) => st.due <= now));
  const nextDue = started.length ? Math.min(...started.map((st) => st.due)) : null;
  const state = !started.length ? "new" : mastered === total ? "mastered" : learned === total ? "learned" : "learning";
  return { state, total, learned, dueNow, next: dueNow ? "now" : nextDue && whenText(nextDue, now) };
}

// One short line for lists, e.g. "Learned · review tomorrow". Null for "new".
export function statusLine(s) {
  if (s.state === "new") return null;
  if (s.state === "mastered") return "Mastered";
  if (s.state === "learned") return `Learned · review ${s.next}`;
  return `${s.learned} of ${s.total} learned · practice ${s.next === "now" ? "now" : `again ${s.next}`}`;
}

// Correct answers move an item up freely while it's being learned (levels 0→2);
// beyond that, only an answer given once the item is due counts — re-practicing the
// same day doesn't prove you remember it. Mistakes always count.
export const countsForProgress = (st, got, now = Date.now()) => !(got && st && st.box >= LEARNED && st.due > now);
