import { useEffect, useRef, useState } from "react";

// Freehand drawing on a 109x109 (KanjiVG) coordinate SVG, shared by trace & write-from-memory practice.
export function useStrokeDrawing(resetKey) {
  const [strokes, setStrokes] = useState([]);
  const [current, setCurrent] = useState(null);
  const svgRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => { setStrokes([]); setCurrent(null); }, [resetKey]);

  const point = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 109, y: ((e.clientY - rect.top) / rect.height) * 109 };
  };
  const start = (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} drawing.current = true; setCurrent([point(e)]); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const p = point(e); setCurrent((c) => (c ? [...c, p] : [p])); };
  const end = () => { if (!drawing.current) return; drawing.current = false; setCurrent((c) => { if (c && c.length > 1) setStrokes((s) => [...s, c]); return null; }); };
  const toPath = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const undo = () => setStrokes((s) => s.slice(0, -1));
  const clear = () => { setStrokes([]); setCurrent(null); };

  return { strokes, current, svgRef, start, move, end, toPath, undo, clear };
}
