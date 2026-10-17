import { cycleTextSize, useTextSize } from "../lib/textSize.js";

// "AA" button: tap to cycle Normal → Large → Extra large. `compact` hides the label
// (used in exercise top bars where space is tight).
export default function TextSizeButton({ compact = false }) {
  const size = useTextSize();
  const active = size.id !== "normal";
  return (
    <button
      onClick={cycleTextSize}
      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition ${active ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-stone-200 text-stone-500"}`}
      title={`Text size: ${size.label} — tap to change`}
      aria-label={`Text size: ${size.label}`}
    >
      <span className="font-semibold">A</span><span className="text-[15px] font-semibold">A</span>
      {active && !compact && <span className="ml-1">{size.label}</span>}
    </button>
  );
}
