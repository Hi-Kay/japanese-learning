import { parseFurigana } from "../lib/sentence.js";

// Japanese text with hiragana readings above its kanji.
export default function Ruby({ jp }) {
  return parseFurigana(jp).map((s, i) =>
    s.rt ? (
      <ruby key={i}>{s.text}<rt className="furigana">{s.rt}</rt></ruby>
    ) : (
      <span key={i}>{s.text}</span>
    ),
  );
}
