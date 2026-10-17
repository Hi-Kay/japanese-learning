import { useSyncExternalStore } from "react";
import { storage } from "./storage.js";

// App-wide text size. Zoom scales everything at once (text, furigana, buttons, spacing),
// including sizes written in px, so the layout keeps its proportions.
export const TEXT_SIZES = [
  { id: "normal", label: "Normal", zoom: 1 },
  { id: "large", label: "Large", zoom: 1.15 },
  { id: "xlarge", label: "Extra large", zoom: 1.3 },
];

let current = storage.get("textSize") || "normal";
const listeners = new Set();

export const getTextSize = () => current;

export function applyTextSize(id) {
  const size = TEXT_SIZES.find((s) => s.id === id) ?? TEXT_SIZES[0];
  document.documentElement.style.zoom = size.zoom === 1 ? "" : String(size.zoom);
  storage.set("textSize", size.id);
  current = size.id;
  listeners.forEach((l) => l());
  return size.id;
}

export function cycleTextSize() {
  const i = TEXT_SIZES.findIndex((s) => s.id === current);
  return applyTextSize(TEXT_SIZES[(i + 1) % TEXT_SIZES.length].id);
}

// Every AA button on screen shows the same, current size.
export function useTextSize() {
  const id = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getTextSize);
  return TEXT_SIZES.find((s) => s.id === id) ?? TEXT_SIZES[0];
}
