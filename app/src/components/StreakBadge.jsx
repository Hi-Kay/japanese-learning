import Icon from "./Icon.jsx";
import { isStreakActiveToday } from "../lib/streak.js";

export default function StreakBadge({ streak }) {
  const active = isStreakActiveToday(streak);
  if (!streak?.current) return null;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${active ? "bg-orange-50 text-orange-500" : "bg-stone-100 text-stone-400"}`} title={active ? "Study today to keep your streak" : "Streak paused — study today to restart it"}>
      <Icon name="flame" size={15} />
      {streak.current} day{streak.current > 1 ? "s" : ""}
    </div>
  );
}
