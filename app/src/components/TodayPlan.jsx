import Icon from "./Icon.jsx";

// Today's short to-do list: each step is either done (✓) or has one button.
export default function TodayPlan({ steps }) {
  const allDone = steps.every((s) => s.done);
  return (
    <div className="w-full rounded-3xl bg-white border-2 border-rose-200 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[11px] font-semibold tracking-widest text-rose-400">TODAY</span>
        <span className="text-[11px] text-stone-400">about 10 minutes</span>
      </div>
      {steps.map((s, i) => (
        <div key={s.title} className="flex items-center gap-3">
          <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${s.done ? "bg-emerald-500 text-white" : "bg-rose-50 text-rose-500"}`}>
            {s.done ? <Icon name="check" size={14} /> : i + 1}
          </span>
          <span className="flex-1 min-w-0 flex flex-col leading-tight">
            <span className={`text-sm font-medium truncate ${s.done ? "text-stone-400" : "text-stone-800"}`}>{s.title}</span>
            <span className="text-[11px] text-stone-400 truncate">{s.detail}</span>
          </span>
          {!s.done && (
            <button onClick={s.onClick} className="shrink-0 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium active:scale-[0.97] transition">{s.action}</button>
          )}
        </div>
      ))}
      {allDone && (
        <div className="text-sm text-emerald-700 bg-emerald-50 rounded-2xl px-3 py-2.5 text-center">
          Done for today — well done! Everything else in the app is optional.
        </div>
      )}
    </div>
  );
}
