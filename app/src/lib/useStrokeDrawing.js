import { useEffect, useRef, useState } from "react";

// Freehand drawing on a 109x109 (KanjiVG) coordinate SVG, shared by trace & write-from-memory practice.
export function useStrokeDrawing(resetKey) {
  const [strokes, setStrokes] = useState([]);
  const [current, setCurrent] = useState(null);
  const svgRef = useRef(null);
  const drawing = useRef(false);
  // In-progress points live in a ref so end() can commit them without a nested
  // setState-in-updater (which StrictMode double-invokes, duplicating strokes).
  const currentRef = useRef(null);

  useEffect(() => { setStrokes([]); setCurrent(null); currentRef.current = null; drawing.current = false; }, [resetKey]);

  // iOS Safari doesn't reliably honor touch-action:none on <svg>, so a drawing
  // gesture scrolls the page instead. Block the native touch defaults directly —
  // React listeners are passive, so this needs addEventListener with passive:false.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener("touchstart", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    return () => {
      el.removeEventListener("touchstart", block);
      el.removeEventListener("touchmove", block);
    };
  }, [resetKey]);

  const point = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 109, y: ((e.clientY - rect.top) / rect.height) * 109 };
  };
  const start = (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} drawing.current = true; currentRef.current = [point(e)]; setCurrent(currentRef.current); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); currentRef.current = [...currentRef.current, point(e)]; setCurrent(currentRef.current); };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const c = currentRef.current;
    currentRef.current = null;
    if (c && c.length > 1) setStrokes((s) => [...s, c]);
    setCurrent(null);
  };
  const toPath = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const undo = () => setStrokes((s) => s.slice(0, -1));
  const clear = () => { setStrokes([]); setCurrent(null); };

  return { strokes, current, svgRef, start, move, end, toPath, undo, clear };
}
