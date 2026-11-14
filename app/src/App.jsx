import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./components/Icon.jsx";
import Study from "./components/Study.jsx";
import Vocabulary from "./components/Vocabulary.jsx";
import Sentences from "./components/Sentences.jsx";
import Tutor from "./components/Tutor.jsx";
import StreakBadge from "./components/StreakBadge.jsx";
import VoicePicker from "./components/VoicePicker.jsx";
import { storage } from "./lib/storage.js";
import { nextDue } from "./lib/srs.js";
import { bumpStreak, DEFAULT_STREAK } from "./lib/streak.js";
import TextSizeButton from "./components/TextSizeButton.jsx";

const TABS = [
  { id: "today", label: "Today", icon: "check" },
  { id: "library", label: "Library", icon: "book" },
  { id: "tutor", label: "Tutor", icon: "spark" },
];

// Everything outside the Today plan lives in the Library, for browsing and free practice.
const SECTIONS = [
  { id: "lessons", label: "Lessons", detail: "All 12 sentence patterns", icon: "chat" },
  { id: "kana", label: "Kana", detail: "Hiragana and katakana", icon: "notes" },
  { id: "words", label: "Words", detail: "Extra vocabulary by topic · optional", icon: "globe" },
  { id: "kanji", label: "Kanji", detail: "Optional for now", icon: "brush" },
];

export default function App() {
  const [tab, setTab] = useState("today");
  const [section, setSection] = useState(null); // the open Library section, or null for its menu
  const [showRomaji, setShowRomaji] = useState(() => storage.get("showRomaji") !== "0");
  const toggleRomaji = () => setShowRomaji((v) => { storage.set("showRomaji", v ? "0" : "1"); return !v; });
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Where the Kana section should open when the Today plan sends the learner there.
  const [kanaFocus, setKanaFocus] = useState(null);
  const goKana = (focus) => { setKanaFocus(focus); setSection("kana"); setTab("library"); };
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  // During a session the header is hidden so small phones fit everything without scrolling.
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    setCards(storage.getJSON("deck", []));
    setProgress(storage.getJSON("progress", {}));
    setStreak(storage.getJSON("streak", DEFAULT_STREAK));
    setLoading(false);
  }, []);

  // Persist via effects, never inside setState updaters — updaters must stay pure
  // (StrictMode double-invokes them; see the duplicated-stroke bug in useStrokeDrawing).
  useEffect(() => { if (!loading) storage.setJSON("deck", cards); }, [cards, loading]);
  useEffect(() => { if (!loading) storage.setJSON("progress", progress); }, [progress, loading]);
  useEffect(() => { if (!loading) storage.setJSON("streak", streak); }, [streak, loading]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }, []);

  const recordResult = useCallback((key, got) => {
    setProgress((prev) => {
      const cur = prev[key] || { box: 0, n: 0, due: 0 };
      const box = got ? Math.min(5, cur.box + 1) : 1;
      const now = Date.now();
      return { ...prev, [key]: { box, n: cur.n + 1, due: nextDue(box, now), seen: now } };
    });
    setStreak((prev) => bumpStreak(prev));
  }, []);

  const removeCard = useCallback((id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCard = useCallback((card) => {
    if (cards.some((c) => c.word === card.word && c.meaning === card.meaning)) {
      showToast("Already saved");
      return;
    }
    setCards((prev) => [{ ...card, id: Date.now() + Math.random() }, ...prev]);
    showToast("Saved to My Words ✓");
  }, [cards, showToast]);

  // Batch add for the AI tutor: skips words already in My Words and reports what happened.
  // A ref keeps it correct when the tutor saves twice before React re-renders.
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  const addCards = useCallback((list) => {
    const added = [];
    const skipped = [];
    for (const card of list) {
      if (!card.word) continue;
      if (cardsRef.current.some((c) => c.word === card.word) || added.some((c) => c.word === card.word)) skipped.push(card.word);
      else added.push({ ...card, id: Date.now() + Math.random() });
    }
    if (added.length) {
      cardsRef.current = [...added, ...cardsRef.current];
      setCards(cardsRef.current);
    }
    return { added: added.map((c) => c.word), skipped };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className={`max-w-lg mx-auto px-4 ${immersive ? "pt-4 pb-6" : "pt-6 pb-24"}`}>
        {!immersive && (
          <header className="flex flex-col mb-5 gap-3">
            <div className="flex items-center gap-2">
              <h1 className="flex-1 text-2xl font-bold text-stone-800 tracking-tight">日本語</h1>
              <StreakBadge streak={streak} />
              <button onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${settingsOpen ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-stone-200 text-stone-500"}`}>
                Settings
              </button>
            </div>
            {settingsOpen && (
              <div className="flex flex-col gap-3 rounded-2xl bg-stone-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-stone-700">Show romaji (Latin letters)</span>
                  <button role="switch" aria-checked={showRomaji} aria-label="Show romaji" onClick={toggleRomaji} className={`relative w-10 h-6 rounded-full transition-colors ${showRomaji ? "bg-emerald-500" : "bg-stone-300"}`}>
                    <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${showRomaji ? "left-[19px]" : "left-[3px]"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-stone-700">Text size</span>
                  <TextSizeButton />
                </div>
                <VoicePicker onClose={() => setSettingsOpen(false)} />
              </div>
            )}
            {tab === "library" && section && (
              <button onClick={() => { setKanaFocus(null); setSection(null); }} className="self-start text-stone-500 text-sm flex items-center gap-1"><Icon name="back" size={16} /> Library</button>
            )}
          </header>
        )}
        {tab === "today" && <Sentences section="today" progress={progress} recordResult={recordResult} showRomaji={showRomaji} tutorApp={{ getCards: () => cards, getProgress: () => progress, addCards }} onImmersive={setImmersive} onGoKana={goKana} />}
        {tab === "library" && !section && (
          <div className="flex flex-col gap-2">
            {SECTIONS.map((x) => (
              <button key={x.id} onClick={() => setSection(x.id)} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-200 text-left active:scale-[0.99] transition">
                <span className="w-10 h-10 shrink-0 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><Icon name={x.icon} size={20} /></span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="font-medium text-stone-800">{x.label}</span>
                  <span className="text-xs text-stone-400">{x.detail}</span>
                </span>
                <Icon name="arrow" size={16} className="text-stone-300" />
              </button>
            ))}
          </div>
        )}
        {tab === "library" && section === "lessons" && <Sentences section="lessons" progress={progress} recordResult={recordResult} showRomaji={showRomaji} tutorApp={{ getCards: () => cards, getProgress: () => progress, addCards }} onImmersive={setImmersive} onGoKana={goKana} />}
        {tab === "library" && section === "kana" && <Study focus={kanaFocus} onFocusDone={() => { setKanaFocus(null); setSection(null); setTab("today"); }} setIds={["hiragana", "katakana"]} onAddCard={addCard} progress={progress} recordResult={recordResult} onImmersive={setImmersive} showRomaji={showRomaji} />}
        {tab === "library" && section === "kanji" && <Study setIds={["kanji", "rtk"]} onAddCard={addCard} progress={progress} recordResult={recordResult} onImmersive={setImmersive} showRomaji={showRomaji} />}
        {tab === "library" && section === "words" && <Vocabulary onAddCard={addCard} progress={progress} recordResult={recordResult} cards={cards} removeCard={removeCard} onImmersive={setImmersive} showRomaji={showRomaji} />}
        {tab === "tutor" && <Tutor cards={cards} progress={progress} addCards={addCards} />}
      </div>
      {toast && (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-20">{toast}</div>)}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)] ${immersive ? "hidden" : ""}`}>
        <div className="max-w-lg mx-auto flex">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setKanaFocus(null); setSection(null); setSettingsOpen(false); setTab(t.id); }} className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${active ? "text-rose-500" : "text-stone-400"}`}>
                <Icon name={t.icon} size={22} />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
