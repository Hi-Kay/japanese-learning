import { useState } from "react";
import { KANA_VARIANTS } from "../data/kana.js";
import StrokeOrder from "./StrokeOrder.jsx";
import TraceCanvas from "./TraceCanvas.jsx";

export default function WritePanel({ char, onClose }) {
  const [tab, setTab] = useState("watch");
  const variant = KANA_VARIANTS[char];
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4 py-2">
      <div className="flex gap-1 bg-stone-100 rounded-full p-1">
        {[["watch", "Watch"], ["trace", "Trace"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${tab === id ? "bg-white text-rose-500 shadow-sm" : "text-stone-500"}`}>{label}</button>
        ))}
      </div>
      {variant && (
        <div className="w-full max-w-xs text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
          <div className="mb-1">printed <span className="text-xl text-stone-800 align-middle mx-1">{char}</span> · handwritten below</div>
          {variant}
        </div>
      )}
      {tab === "watch" ? <StrokeOrder char={char} /> : <TraceCanvas char={char} />}
      <button onClick={onClose} className="text-sm text-rose-500 font-medium">← Back</button>
    </div>
  );
}
