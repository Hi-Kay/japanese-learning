import { KANA_VARIANTS } from "../data/kana.js";

export default function VariantNote({ char }) {
  const v = KANA_VARIANTS[char];
  if (!v) return null;
  return (
    <div className="w-full max-w-sm text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
      ✍️ {v} <span className="text-amber-600">Tap the brush to see the handwritten strokes.</span>
    </div>
  );
}
