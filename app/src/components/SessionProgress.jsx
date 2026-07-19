// Single progress signal during a session: a bar plus "N left".
// Score is shown only on the summary screen.
export default function SessionProgress({ current, total }) {
  const left = total - current;
  return (
    <div className="w-full max-w-sm flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div className="h-full bg-rose-400 rounded-full transition-all duration-300" style={{ width: `${total ? (current / total) * 100 : 0}%` }} />
      </div>
      <span className="text-xs text-stone-400 whitespace-nowrap">{left} left</span>
    </div>
  );
}
