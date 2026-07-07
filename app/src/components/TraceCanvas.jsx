import { useState } from "react";
import { kvgUrl } from "../lib/srs.js";
import { useStrokeDrawing } from "../lib/useStrokeDrawing.js";

export default function TraceCanvas({ char }) {
  const url = kvgUrl(char);
  const [guide, setGuide] = useState(true);
  const [guideOk, setGuideOk] = useState(true);
  const { strokes, current, svgRef, start, move, end, toPath, undo, clear } = useStrokeDrawing(char);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-56 h-56 rounded-2xl bg-white border border-stone-200 overflow-hidden" style={{ touchAction: "none", overscrollBehavior: "none" }}>
        {guide && guideOk && (<img src={url} alt="" onError={() => setGuideOk(false)} className="absolute inset-0 w-full h-full object-contain p-2 opacity-20 pointer-events-none" />)}
        <svg ref={svgRef} viewBox="0 0 109 109" className="absolute inset-0 w-full h-full cursor-crosshair" style={{ touchAction: "none" }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
          <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#f1efed" strokeWidth="1" strokeDasharray="3 3" />
          {strokes.map((s, i) => (<path key={`m${i}`} d={toPath(s)} fill="none" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />))}
          {current && (<path d={toPath(current)} fill="none" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
      </div>
      <div className="text-xs text-stone-400">{guideOk ? `Your strokes: ${strokes.length}` : "Guide unavailable — trace freehand"}</div>
      <div className="flex items-center gap-2">
        <button onClick={() => setGuide((g) => !g)} disabled={!guideOk} className={`px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-40 ${guide && guideOk ? "bg-rose-100 text-rose-600" : "bg-stone-100 text-stone-500"}`}>{guide ? "Guide on" : "Guide off"}</button>
        <button onClick={undo} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">Undo</button>
        <button onClick={clear} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">Clear</button>
      </div>
    </div>
  );
}
