import Icon from "./Icon.jsx";

// Today's short to-do list: up to three parts, done one after another with a single
// button. After each part, its summary offers the next one.
export default function TodayPlan({ steps, onStart }) {
  const current = steps.find((s) => !s.done);
  const anyDone = steps.some((s) => s.done);
  return (
    <div className="w-full rounded-3xl bg-white border-2 border-rose-200 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[11px] font-semibold tracking-widest text-rose-400">TODAY</span>
        <span className="text-[11px] text-stone-400">about 10 minutes</span>
      </div>
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3">
          <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${s.done ? "bg-emerald-500 text-white" : s === current ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-500"}`}>
            {s.done ? <Icon name="check" size={14} /> : i + 1}
          </span>
          <span className="flex-1 min-w-0 flex flex-col leading-tight">
            <span className={`text-sm font-medium truncate ${s.done ? "text-stone-400" : "text-stone-800"}`}>{s.title}</span>
            <span className="text-[11px] text-stone-400 truncate">{s.detail}</span>
          </span>
        </div>
      ))}
      {current ? (
        <button onClick={() => onStart(current)} className="w-full mt-1 py-3.5 rounded-2xl bg-rose-500 text-white font-medium active:scale-[0.98] transition">
          {anyDone ? `Continue · part ${steps.indexOf(current) + 1} of ${steps.length}` : current.resumes ? "Continue" : "Start"}
        </button>
      ) : (
        <div className="text-sm text-emerald-700 bg-emerald-50 rounded-2xl px-3 py-2.5 text-center">
          Done for today — well done! Everything else in the app is optional.
        </div>
      )}
    </div>
  );
}
