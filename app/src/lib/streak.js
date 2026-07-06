import { daysBetween, todayKey } from "./srs.js";

export const DEFAULT_STREAK = { current: 0, best: 0, lastDate: null, totalReviews: 0 };

// Bump the streak at most once per calendar day; called on every graded review.
export function bumpStreak(streak) {
  const today = todayKey();
  const s = streak || DEFAULT_STREAK;
  if (s.lastDate === today) {
    return { ...s, totalReviews: s.totalReviews + 1 };
  }
  const gap = s.lastDate ? daysBetween(s.lastDate, today) : null;
  const current = gap === 1 ? s.current + 1 : 1;
  return { current, best: Math.max(s.best, current), lastDate: today, totalReviews: s.totalReviews + 1 };
}

// A streak "counts" for today's display as long as it wasn't broken (gap of more than 1 day since last study).
export function isStreakActiveToday(streak) {
  if (!streak?.lastDate) return false;
  const gap = daysBetween(streak.lastDate, todayKey());
  return gap <= 1;
}
