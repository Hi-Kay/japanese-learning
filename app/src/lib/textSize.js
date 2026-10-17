import { storage } from "./storage.js";

// App-wide text size. Zoom scales everything at once (text, furigana, buttons, spacing),
// including sizes written in px, so the layout keeps its proportions.
export const TEXT_SIZES = [
  { id: "normal", label: "Normal", zoom: 1 },
  { id: "large", label: "Large", zoom: 1.15 },
  { id: "xlarge", label: "Extra large", zoom: 1.3 },
];

export const getTextSize = () => storage.get("textSize") || "normal";

export function applyTextSize(id) {
  const size = TEXT_SIZES.find((s) => s.id === id) ?? TEXT_SIZES[0];
  document.documentElement.style.zoom = size.zoom === 1 ? "" : String(size.zoom);
  storage.set("textSize", size.id);
  return size.id;
}
