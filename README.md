# 日本語 — Japanese Learning

A small, installable web app (PWA) for learning Japanese from scratch: the two kana
alphabets, the first few hundred kanji, and everyday vocabulary — with spaced
repetition, animated stroke order, and handwriting practice.

**Live app: https://hi-kay.github.io/japanese-learning/**

Open it on a phone and use *Add to Home Screen* to install it like a native app. It
works offline, needs no account, and sends no data anywhere.

---

## What's inside

The app has three tabs, named after what you're learning:

| Tab | Content |
| --- | --- |
| **Kana** | Hiragana (46) and Katakana (46), grouped into gojūon rows of five |
| **Kanji** | Kanji N5 (180 characters) and RTK 1–200, grouped into stages of 20 |
| **Words** | 8 vocabulary categories (175 words/phrases) plus your own saved words |

Vocabulary categories: Greetings & Basics, Numbers, Days & Time, Survival Phrases,
Common Verbs, Adjectives, Food & Restaurant, Travel & Directions.

## How it teaches

- **Introduction before testing.** A character you've never seen appears first as a
  `NEW` card showing the character together with its sound/meaning — it's only
  quizzed after you've met it.
- **Labeled exercises.** Every test card is marked `READ` (see the character, recall
  the sound) or `WRITE` (hear the sound, draw the character), so the two kinds of
  practice are clearly different on purpose.
- **Read / Write / Mix.** For kana you can practice one direction only, or both.
- **Small chunks.** Kana are grouped by gojūon row, kanji into stages of 20, each
  with its own *Practice* button and progress count.
- **Spaced repetition.** A Leitner box system schedules each item: correct answers
  move it to a longer interval (1 min → 10 min → 1 day → 3 days → 10 days), a miss
  sends it back. An item counts as *known* at box 3. Sessions are capped at 20 cards.
- **Writing practice.** The stroke-order animation plays inside the practice box and
  you trace on top of it; write-from-memory cards let you draw blind, then reveal the
  real character over your strokes to compare.
- **Listening practice.** In Words, a *Listen* round plays audio first and you recall
  the word before revealing it.
- **One progress signal.** During a session: a progress bar and "N left". Your score
  appears once, on the summary screen, with a *Redo the ones you missed* option.
- **Daily streak** to keep the habit going.

## Other features

- **Add your own words** with a built-in offline dictionary (485 common words) that
  fills in the rest in either direction — type `dog` and get 犬 / いぬ · inu, or type
  犬 (or いぬ) and get the English.
- **Save to My Words** from any kanji or vocabulary card.
- **Audio** for every character, word, and example sentence via the device's Japanese
  speech synthesis.
- Works **offline** after the first visit; stroke diagrams are cached once viewed.

## Repo layout

```
.
├── app/                     # the application (Vite + React + Tailwind)
│   ├── src/
│   │   ├── components/      # UI: Study, Vocabulary, WritePanel, cards, icons
│   │   ├── data/            # kana, kanji, RTK 200, vocabulary, dictionary
│   │   └── lib/             # SRS scheduling, streak, storage, drawing hook
│   ├── public/              # app icons
│   └── vite.config.js       # build + PWA manifest/service worker
├── .github/workflows/       # GitHub Pages deploy
└── japanese-standalone.html # the original single-file prototype (kept for reference)
```

## Development

```bash
cd app
npm install
npm run dev
```

The dev server serves the app under the `/japanese-learning/` path (the same base
path it uses in production), so open http://localhost:5173/japanese-learning/.

```bash
npm run build     # production build into app/dist
npm run preview   # serve that build locally
npm run lint
```

## Deploying

Pushing to `main` is all it takes — a GitHub Actions workflow builds `app/` and
publishes it to GitHub Pages. The live site updates within about a minute.

If you ever move the app to a different URL, change `BASE` in
[app/vite.config.js](app/vite.config.js) to match the new path (or `'/'` for a
custom domain).

## Data & privacy

All progress lives in the browser's `localStorage` on the device — there is no
backend and no account:

| Key | What it holds |
| --- | --- |
| `progress` | Spaced-repetition box and due date per item |
| `deck` | Your saved words |
| `streak` | Daily streak and review count |
| `kanaMode` | Read / Write / Mix preference |

Because it's stored per device, progress doesn't sync between your phone and
computer, and clearing site data resets it.

## Credits

Stroke-order data from [KanjiVG](https://kanjivg.tagaini.net/) (CC BY-SA 3.0).
The RTK set follows the character ordering of *Remembering the Kanji* (6th ed.) by
James Heisig, with standard dictionary meanings and readings.
