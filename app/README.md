# 日本語 — Japanese Learning

An installable web app (PWA) for learning hiragana, katakana, core kanji, and everyday
vocabulary, with spaced repetition, animated stroke order, and handwriting practice.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

The build output in `dist/` is a fully static site — it can be hosted anywhere that
serves static files (no server-side code required).

## Deploying

The simplest path to a shareable, installable app is a free static host:

**Vercel**
```bash
npm install -g vercel
vercel deploy --prod
```
(from inside the `app/` folder; accept the defaults — Vercel auto-detects Vite)

**Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

**GitHub Pages** — push `dist/` to a `gh-pages` branch, or use the
`actions/deploy-pages` GitHub Action on every push to `main`.

Once deployed, anyone can open the URL on iOS or Android and use the browser's
"Add to Home Screen" option to install it like a native app — it gets its own icon,
opens without browser chrome, and the Study/Vocabulary/My Words screens keep working
offline (stroke-order diagrams are cached after first view; a network connection is
only needed the very first time a given character is opened).

## Data & privacy

All progress (spaced-repetition boxes, saved words, streak) is stored only in the
browser's `localStorage` — there is no backend, no account, and nothing is sent
anywhere. That also means progress does not sync across devices/browsers; each
install has its own local progress.

## Content credits

Stroke order diagrams are from [KanjiVG](https://kanjivg.tagaini.net/) (CC BY-SA 3.0).
