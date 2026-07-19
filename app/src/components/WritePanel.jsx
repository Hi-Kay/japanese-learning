import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { KANA_VARIANTS } from "../data/kana.js";
import { kvgUrl } from "../lib/srs.js";
import { useStrokeDrawing } from "../lib/useStrokeDrawing.js";

// One screen instead of Watch/Trace tabs: the stroke-order animation plays
// inside the practice box and you trace right on top of it.
export default function WritePanel({ char, onClose }) {
  const url = kvgUrl(char);
  const variant = KANA_VARIANTS[char];
  const [paths, setPaths] = useState(null);
  const [mode, setMode] = useState("loading"); // loading | anim | img | fail
  const [playKey, setPlayKey] = useState(0);
  const pathRefs = useRef([]);
  const { strokes, current, svgRef, start, move, end, toPath, undo, clear } = useStrokeDrawing(char);

  useEffect(() => {
    let cancelled = false;
    setMode("loading"); setPaths(null); pathRefs.current = [];
    fetch(url).then((r) => { if (!r.ok) throw new Error("nf"); return r.text(); })
      .then((t) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(t, "image/svg+xml");
        const ds = [...doc.querySelectorAll("path")].map((p) => p.getAttribute("d")).filter(Boolean);
        if (!ds.length) throw new Error("empty");
        setPaths(ds); setMode("anim"); setPlayKey((k) => k + 1); // auto-play once on load
      }).catch(() => { if (!cancelled) setMode("img"); });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (mode !== "anim" || !paths || !playKey) return;
    let delay = 0; const timers = [];
    pathRefs.current.forEach((el) => {
      if (!el) return;
      const len = el.getTotalLength();
      el.style.transition = "none"; el.style.strokeDasharray = `${len}`; el.style.strokeDashoffset = `${len}`; el.style.opacity = "1";
      const dur = Math.max(280, Math.min(850, len * 7)); const startAt = delay;
      timers.push(setTimeout(() => { el.style.transition = `stroke-dashoffset ${dur}ms ease`; el.style.strokeDashoffset = "0"; }, startAt + 40));
      delay += dur + 170;
    });
    return () => timers.forEach(clearTimeout);
  }, [paths, mode, playKey]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3 py-1">
      {variant && (
        <div className="w-full max-w-xs text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
          printed <span className="text-lg text-stone-800 align-middle mx-1">{char}</span> looks different — {variant}
        </div>
      )}
      <div className="relative w-60 h-60 rounded-2xl bg-white border border-stone-200 overflow-hidden" style={{ touchAction: "none", overscrollBehavior: "none" }}>
        {mode === "img" && (<img src={url} alt="" onError={() => setMode("fail")} className="absolute inset-0 w-full h-full object-contain p-2 opacity-25 pointer-events-none" />)}
        {mode === "fail" && (<div className="absolute inset-0 flex items-center justify-center text-9xl text-stone-100 pointer-events-none">{char}</div>)}
        <svg ref={svgRef} viewBox="0 0 109 109" className="absolute inset-0 w-full h-full cursor-crosshair" style={{ touchAction: "none" }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
          <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
          {mode === "anim" && paths && paths.map((d, i) => (<path key={`g${i}`} d={d} fill="none" stroke="#e7e5e4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />))}
          {mode === "anim" && paths && playKey > 0 && paths.map((d, i) => (<path key={`s${i}-${playKey}`} ref={(el) => (pathRefs.current[i] = el)} d={d} fill="none" stroke="#fda4af" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />))}
          {strokes.map((s, i) => (<path key={`m${i}`} d={toPath(s)} fill="none" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />))}
          {current && (<path d={toPath(current)} fill="none" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
      </div>
      <div className="text-xs text-stone-400">
        {mode === "loading" ? "Loading strokes…" : mode === "anim" ? `${paths.length} stroke${paths.length > 1 ? "s" : ""} — watch, then trace on top` : "Trace over the guide"}
      </div>
      <div className="flex items-center gap-2">
        {mode === "anim" && (<button onClick={() => setPlayKey((k) => k + 1)} className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-500 text-xs font-medium flex items-center gap-1"><Icon name="refresh" size={13} /> Replay</button>)}
        <button onClick={undo} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">Undo</button>
        <button onClick={clear} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">Clear</button>
      </div>
      <span className="text-[10px] text-stone-300">Stroke data: KanjiVG · CC BY-SA</span>
      <button onClick={onClose} className="text-sm text-rose-500 font-medium">← Back</button>
    </div>
  );
}
