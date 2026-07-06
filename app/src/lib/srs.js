export const BOX_INTERVALS = [0, 60e3, 600e3, 86400e3, 259200e3, 864000e3];
export const MASTER_BOX = 3;
export const SESSION_SIZE = 20;

export const kvgUrl = (char) =>
  `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${char.codePointAt(0).toString(16).padStart(5, "0")}.svg`;

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const speak = (text) => {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {}
};

// Local-day string (YYYY-MM-DD) used for streak tracking, independent of timezone shifts mid-session.
export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const daysBetween = (aKey, bKey) => {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((b - a) / 86400000);
};
