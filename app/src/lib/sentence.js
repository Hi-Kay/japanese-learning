// Helpers for sentence tokens: furigana parsing, text rendering, and answer checking.

const KANJI = /[㐀-䶿一-鿿々]/;

// "飲[の]みます" → [{ text: "飲", rt: "の" }, { text: "みます" }]
export function parseFurigana(src) {
  const segs = [];
  let plain = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "[") {
      const close = src.indexOf("]", i);
      const rt = src.slice(i + 1, close);
      let k = plain.length;
      while (k > 0 && KANJI.test(plain[k - 1])) k--;
      if (k > 0) segs.push({ text: plain.slice(0, k) });
      segs.push({ text: plain.slice(k), rt });
      plain = "";
      i = close;
    } else plain += c;
  }
  if (plain) segs.push({ text: plain });
  return segs;
}

export const surface = (jp) => parseFurigana(jp).map((s) => s.text).join("");

// The sentence as normal Japanese text, e.g. for speech.
export const sentenceText = (tokens) => tokens.map((t) => surface(t.jp) + (t.comma ? "、" : "")).join("") + "。";

// Split a sentence into its movable phrases and its fixed ending.
// A phrase is a run of words closed by a phrase particle (は/が/を/に/で), or a lone
// time word like 毎日. The ending is everything after the last phrase particle.
export function structure(tokens) {
  let last = -1;
  tokens.forEach((t, i) => { if (t.particle) last = i; });
  const tailStart = last + 1;
  const phrases = [];
  let cur = [];
  for (let i = 0; i < tailStart; i++) {
    cur.push(i);
    const t = tokens[i];
    const next = tokens[i + 1];
    if (t.particle || t.comma || (next && !next.particle && i + 1 < tailStart)) { phrases.push(cur); cur = []; }
  }
  if (cur.length) phrases.push(cur);
  const tail = tokens.map((_, i) => i).slice(tailStart);
  return { phrases, tail };
}

// Is `order` (token indices, in the learner's order) a correct sentence?
// Phrases before the ending may come in any order, as long as each stays intact
// and the ending stays last — that's how Japanese word order works.
export function checkOrder(tokens, order, { strict = false } = {}) {
  const exact = order.every((idx, i) => idx === i) && order.length === tokens.length;
  if (exact) return { correct: true, exact: true };
  if (strict || order.length !== tokens.length) return { correct: false };
  const { phrases, tail } = structure(tokens);
  const tailPart = order.slice(order.length - tail.length);
  if (!tail.every((idx, i) => tailPart[i] === idx)) return { correct: false };
  // Tokens can repeat (same word twice), so compare by word id, not index.
  const key = (idxs) => idxs.map((i) => tokens[i].id).join("|");
  const remaining = phrases.map(key);
  const prefix = order.slice(0, order.length - tail.length);
  let p = 0;
  while (p < prefix.length) {
    const hit = remaining.findIndex((k) => {
      const len = k.split("|").length;
      return key(prefix.slice(p, p + len)) === k;
    });
    if (hit < 0) return { correct: false };
    p += remaining[hit].split("|").length;
    remaining.splice(hit, 1);
  }
  return { correct: remaining.length === 0, exact: false };
}
