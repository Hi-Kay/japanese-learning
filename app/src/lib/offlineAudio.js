import RECORDED from "../data/audio.json";

// Fetches all recordings in the background so the app sounds the same offline. They are
// not part of the app's install on purpose: with hundreds of files, a new version only
// took effect after the last one had arrived, so people stayed on an old version. Here
// it doesn't matter when it is interrupted — the next start carries on.
export const AUDIO_CACHE = "recordings"; // filled by the service worker, see vite.config.js

export async function fetchRecordings() {
  const sw = navigator.serviceWorker;
  if (!sw || !("caches" in window) || navigator.connection?.saveData) return;
  try {
    await sw.ready;
    const cache = await caches.open(AUDIO_CACHE);
    const have = new Set((await cache.keys()).map((r) => r.url));
    const missing = [...new Set(Object.values(RECORDED))]
      .map((id) => new URL(`${import.meta.env.BASE_URL}audio/${id}.mp3`, window.location.href).href)
      .filter((url) => !have.has(url));
    const next = async () => {
      for (let url = missing.shift(); url; url = missing.shift()) {
        if (!sw.controller) return; // nobody there to store it
        const res = await fetch(url, { priority: "low" });
        if (!res.ok) continue; // tried again on the next start
        await res.arrayBuffer();
      }
    };
    await Promise.all([next(), next()]);
  } catch {
    // offline or interrupted: the next start carries on
  }
}
