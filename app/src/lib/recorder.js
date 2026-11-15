// Records the learner's own voice in the "Say it" exercise, so they can hear themself
// next to the model. Nothing is analysed or stored: the recording lives in memory until
// the exercise is left. The microphone is released as soon as a recording stops —
// otherwise an iPhone keeps playing sound quietly, as if in a phone call.
let recorder = null;
let stream = null;
let chunks = [];

export const canRecord = () =>
  typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

const release = () => {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
};

// Rejects when the learner (or the browser) refuses the microphone.
export async function startMic() {
  cancelMic();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();
}

// Resolves to an object URL of the recording (null when nothing was recorded).
export function stopMic() {
  return new Promise((resolve) => {
    const r = recorder;
    recorder = null;
    if (!r) { release(); resolve(null); return; }
    r.onstop = () => {
      release();
      resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: r.mimeType })) : null);
    };
    r.stop();
  });
}

export function cancelMic() {
  if (recorder) { recorder.onstop = null; try { recorder.stop(); } catch { /* already stopped */ } }
  recorder = null;
  release();
}
