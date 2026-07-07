import { useCallback, useEffect, useState } from "react";
import Icon from "./components/Icon.jsx";
import Study from "./components/Study.jsx";
import Vocabulary from "./components/Vocabulary.jsx";
import MyWords from "./components/MyWords.jsx";
import StreakBadge from "./components/StreakBadge.jsx";
import { storage } from "./lib/storage.js";
import { BOX_INTERVALS } from "./lib/srs.js";
import { bumpStreak, DEFAULT_STREAK } from "./lib/streak.js";

const TABS = [
  { id: "study", label: "Study", icon: "book" },
  { id: "vocab", label: "Vocabulary", icon: "globe" },
  { id: "words", label: "My Words", icon: "layers" },
];

export default function App() {
  const [tab, setTab] = useState("study");
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

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
      const due = Date.now() + BOX_INTERVALS[box];
      return { ...prev, [key]: { box, n: cur.n + 1, due } };
    });
    setStreak((prev) => bumpStreak(prev));
  }, []);

  const addCard = useCallback((card) => {
    if (cards.some((c) => c.word === card.word && c.meaning === card.meaning)) {
      showToast("Already saved");
      return;
    }
    setCards((prev) => [{ ...card, id: Date.now() + Math.random() }, ...prev]);
    showToast("Saved to My Words ✓");
  }, [cards, showToast]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="max-w-lg mx-auto px-4 pb-24 pt-6">
        <header className="flex flex-col items-center mb-6 gap-2">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">日本語</h1>
          <p className="text-sm text-stone-400">Your Japanese study companion</p>
          <StreakBadge streak={streak} />
        </header>
        {tab === "study" && <Study onAddCard={addCard} progress={progress} recordResult={recordResult} />}
        {tab === "vocab" && <Vocabulary onAddCard={addCard} progress={progress} recordResult={recordResult} />}
        {tab === "words" && <MyWords cards={cards} setCards={setCards} loading={loading} onAddCard={addCard} progress={progress} recordResult={recordResult} />}
      </div>
      {toast && (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-20">{toast}</div>)}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${active ? "text-rose-500" : "text-stone-400"}`}>
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
