import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { kvgUrl } from "../lib/srs.js";

export default function StrokeOrder({ char }) {
  const url = kvgUrl(char);
  const [paths, setPaths] = useState(null);
  const [mode, setMode] = useState("loading");
  const [playKey, setPlayKey] = useState(0);
  const pathRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    setMode("loading"); setPaths(null); pathRefs.current = [];
    fetch(url).then((r) => { if (!r.ok) throw new Error("nf"); return r.text(); })
      .then((t) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(t, "image/svg+xml");
        const ds = [...doc.querySelectorAll("path")].map((p) => p.getAttribute("d")).filter(Boolean);
        if (!ds.length) throw new Error("empty");
        setPaths(ds); setMode("anim"); setPlayKey((k) => k + 1);
      }).catch(() => { if (!cancelled) setMode("img"); });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (mode !== "anim" || !paths) return;
    let delay = 0; const timers = [];
    pathRefs.current.forEach((el) => {
      if (!el) return;
      const len = el.getTotalLength();
      el.style.transition = "none"; el.style.strokeDasharray = `${len}`; el.style.strokeDashoffset = `${len}`; el.style.opacity = "1";
      const dur = Math.max(280, Math.min(850, len * 7)); const start = delay;
      timers.push(setTimeout(() => { el.style.transition = `stroke-dashoffset ${dur}ms ease`; el.style.strokeDashoffset = "0"; }, start + 40));
      delay += dur + 170;
    });
    return () => timers.forEach(clearTimeout);
  }, [paths, mode, playKey]);

  if (mode === "loading") return <div className="text-sm text-stone-400 py-10">Loading stroke order…</div>;
  if (mode === "fail") return <div className="text-center text-sm text-stone-400 py-6 px-6 max-w-xs">Stroke diagram for <span className="text-stone-600 text-lg">{char}</span> couldn't load. Check your internet connection.</div>;
  if (mode === "img") return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-44 h-44 rounded-2xl bg-white border border-stone-200 overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-stone-100" />
        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-stone-100" />
        <img src={url} alt={`Stroke order for ${char}`} className="absolute inset-0 w-full h-full object-contain p-2" onError={() => setMode("fail")} />
      </div>
      <span className="text-xs text-stone-400">Numbers show the writing order</span>
      <span className="text-[10px] text-stone-300">Stroke data: KanjiVG · CC BY-SA</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 109 109" className="w-44 h-44 rounded-2xl bg-white border border-stone-200">
        <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
        {paths.map((d, i) => (<path key={`g${i}`} d={d} fill="none" stroke="#ededed" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />))}
        {paths.map((d, i) => (<path key={`s${i}-${playKey}`} ref={(el) => (pathRefs.current[i] = el)} d={d} fill="none" stroke="#f43f5e" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />))}
      </svg>
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-400">{paths.length} stroke{paths.length > 1 ? "s" : ""}</span>
        <button onClick={() => setPlayKey((k) => k + 1)} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium flex items-center gap-1"><Icon name="refresh" size={13} /> Replay</button>
      </div>
      <span className="text-[10px] text-stone-300">Stroke data: KanjiVG · CC BY-SA</span>
    </div>
  );
}
