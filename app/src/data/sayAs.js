// Words the voice reads wrongly when they stand alone, with the reading to speak instead
// (魚 came out as "uo", 卵 as "ran", 何時 as "itsu"). Used when recording (scripts/make-audio.mjs) and
// by the phone's built-in voice (lib/speech.js). After adding one, delete its file in
// public/audio/ and run the recording script again.
export const SAY_AS = {
  魚: "さかな",
  卵: "たまご",
  何時: "なんじ",
  日本: "にほん",
  友達の家: "ともだちのいえ",
  何時ですか: "なんじですか",
};
