import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { currentVoice, japaneseVoices, setVoice, speak } from "../lib/speech.js";

const SAMPLE = "こんにちは。私は毎日日本語を勉強します。";

// Lists the Japanese voices this device offers; tapping one plays a sample and keeps it.
export default function VoicePicker({ onClose }) {
  const [voices, setVoices] = useState(japaneseVoices);
  const [selected, setSelected] = useState(() => currentVoice()?.voiceURI);

  useEffect(() => {
    // Some browsers load their voice list asynchronously.
    const refresh = () => setVoices(japaneseVoices());
    window.speechSynthesis?.addEventListener?.("voiceschanged", refresh);
    const t = setTimeout(refresh, 500);
    return () => { clearTimeout(t); window.speechSynthesis?.removeEventListener?.("voiceschanged", refresh); };
  }, []);

  const pick = (v) => {
    setVoice(v.voiceURI);
    setSelected(v.voiceURI);
    speak(SAMPLE);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white border border-stone-200 p-3 flex flex-col gap-2 text-left">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">Japanese voice</span>
        <button onClick={onClose} className="p-1 text-stone-400" title="Close"><Icon name="x" size={16} /></button>
      </div>
      {voices.length === 0 ? (
        <div className="text-xs text-stone-500">No Japanese voice found on this device.</div>
      ) : (
        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
          {voices.map((v) => (
            <button key={v.voiceURI} onClick={() => pick(v)} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left border ${selected === v.voiceURI ? "border-rose-300 bg-rose-50 text-rose-700" : "border-stone-100 text-stone-700"}`}>
              <span className="truncate">{v.name}</span>
              <Icon name={selected === v.voiceURI ? "check" : "volume"} size={15} className="shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      )}
      <div className="text-[11px] text-stone-400">Tap a voice to hear it. On iPhone, Safari only offers Apple's built-in voices, not the downloadable “Enhanced” ones.</div>
    </div>
  );
}
