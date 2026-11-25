// Getting new versions onto people's phones.
//
// The service worker (vite.config.js) installs a new version in the background within
// seconds, but a page that is already open keeps running the old one. So: look for a
// new version whenever the app comes back to the foreground (an iPhone often just wakes
// an installed app instead of reopening it), and reload once one is in place — only
// when nothing can be lost: before the first tap, or when coming back to the app.

const holds = []; // reasons not to reload right now, e.g. an open session
export const holdUpdateWhile = (fn) => {
  holds.push(fn);
  return () => holds.splice(holds.indexOf(fn), 1);
};

const typing = () => [...document.querySelectorAll("textarea, input")].some((el) => el.value && !["checkbox", "radio", "range"].includes(el.type));

export function watchForUpdates() {
  const sw = navigator.serviceWorker;
  if (!sw) return;
  const hadOldVersion = !!sw.controller; // a first visit has nothing to update from
  let ready = false;
  let touched = false;

  const reloadIfFree = () => {
    if (ready && !typing() && !holds.some((fn) => fn())) window.location.reload();
  };

  ["pointerdown", "keydown"].forEach((e) => window.addEventListener(e, () => { touched = true; }, { capture: true, passive: true }));
  if (hadOldVersion) {
    sw.addEventListener("controllerchange", () => {
      ready = true;
      if (!touched) reloadIfFree();
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    touched = false;
    if (ready) reloadIfFree();
    else sw.getRegistration().then((reg) => reg?.update()).catch(() => {}); // offline: next time
  });
}
