import Icon from "./Icon.jsx";

// ○ new · ◐ learning · ✓ learned · ★ mastered
export default function StatusIcon({ state, label, size = "md" }) {
  const box = size === "lg" ? "w-16 h-16 text-xl" : "w-8 h-8 text-sm";
  const icon = size === "lg" ? 30 : 16;
  const cls = {
    new: "bg-stone-100 text-stone-400",
    learning: "bg-emerald-100 text-emerald-700",
    learned: "bg-emerald-500 text-white",
    mastered: "bg-amber-400 text-white",
  }[state];
  return (
    <span className={`${box} shrink-0 rounded-full flex items-center justify-center font-semibold ${cls}`}>
      {state === "learned" ? <Icon name="check" size={icon} /> : state === "mastered" ? <Icon name="star" size={icon} /> : label ?? <Icon name="check" size={icon} />}
    </span>
  );
}
