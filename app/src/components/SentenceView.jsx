import Ruby from "./Ruby.jsx";
import { ROLES } from "../data/sentences.js";

// Consecutive words with the same role form one colored block; a particle closes its block.
function blocksOf(tokens) {
  const blocks = [];
  tokens.forEach((t) => {
    const last = blocks.at(-1);
    const prev = last?.tokens.at(-1);
    if (last && last.role === t.role && !prev.comma && !prev.particle) last.tokens.push(t);
    else blocks.push({ role: t.role, tokens: [t] });
  });
  return blocks;
}

// A sentence split into its colored building blocks, with an optional
// romaji line and word-by-word English under each word.
export default function SentenceView({ tokens, showRomaji, gloss = true, size = "md" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {blocksOf(tokens).map((b, bi) => (
        <div key={bi} className={`flex items-end gap-1.5 rounded-xl border px-2 py-1 ${ROLES[b.role].cls}`}>
          {b.tokens.map((t, ti) => (
            <div key={ti} className="flex flex-col items-center leading-tight">
              <span className={`${text} ${t.particle || t.id === "ka" ? "font-bold" : ""}`}><Ruby jp={t.jp} />{t.comma ? "、" : ""}</span>
              {showRomaji && t.ro && <span className="text-[10px] opacity-70">{t.ro}</span>}
              {gloss && t.en && <span className="text-[10px] opacity-60 whitespace-nowrap">{t.en}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
