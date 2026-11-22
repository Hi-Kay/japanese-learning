// Speech-to-text (Japanese or English) using the browser's built-in speech recognition
// (Chrome sends the audio to Google, Safari to Apple). No API key needed.

const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const canListen = () => !!Recognition;

// The language the tutor's microphone listens for, shared by the Tutor tab and "Ask the tutor".
export const MIC_LANG_STORE = "tutorMicLang";
export const MIC_LANGS = [{ id: "ja-JP", label: "日本語" }, { id: "en-US", label: "English" }];

// What to send for a spoken message: Japanese is speaking practice, so the model is told
// it is a transcript (plus the recognizer's other guesses); English is just a question.
export const spokenContent = (text, voice) =>
  voice && !voice.english
    ? `[Spoken — speech-recognition transcript]\n${text}` +
      (voice.alternatives.length ? `\n[The recognizer also heard: ${voice.alternatives.join(" / ")}]` : "")
    : text;

// Starts listening once. Calls onInterim with the text heard so far, and finally
// onDone({ text, alternatives }) — alternatives are the recognizer's other guesses,
// a hint that the pronunciation was unclear. Returns a function that stops listening.
export function listen({ lang = "ja-JP", onInterim, onDone, onError }) {
  const rec = new Recognition();
  rec.lang = lang; // one language at a time — recognizers can't detect it themselves
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  let finalText = "";
  let alternatives = [];
  let failed = false;

  rec.onresult = (e) => {
    let interim = "";
    finalText = "";
    alternatives = [];
    for (const result of e.results) {
      if (result.isFinal) {
        finalText += result[0].transcript;
        for (let i = 1; i < result.length; i++) alternatives.push(result[i].transcript);
      } else interim += result[0].transcript;
    }
    onInterim?.(finalText + interim);
  };
  rec.onerror = (e) => {
    failed = true;
    const messages = {
      "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings and try again.",
      "service-not-allowed": "Speech recognition isn't allowed in this browser.",
      "no-speech": "I didn't hear anything — tap the microphone and speak a little louder.",
      "audio-capture": "No microphone was found.",
      // Despite the name, this usually means the browser has no speech service (Brave, Arc, Opera,
      // in-app browsers…) or a VPN / extension blocks it — not that the internet is down.
      network: "This browser couldn't reach its speech service. Try Safari or Google Chrome, and turn off VPNs or privacy extensions for this page.",
    };
    onError?.(messages[e.error] ?? `Speech recognition stopped (${e.error}).`);
  };
  rec.onend = () => {
    if (failed) return;
    const text = finalText.trim();
    const alts = [...new Set(alternatives.map((a) => a.trim()))].filter((a) => a && a !== text);
    onDone?.({ text, alternatives: alts });
  };
  rec.start();
  return () => rec.stop();
}
