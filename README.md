# 日本語 — Japanese Learning

A small, installable web app (PWA) for learning Japanese from scratch — with a focus
on being able to say and understand simple sentences. It covers the core sentence
patterns, everyday vocabulary, the two kana alphabets, and the first few hundred kanji,
with spaced repetition, listening practice, and handwriting practice.

**Live app: https://hi-kay.github.io/japanese-learning/**

Open it on a phone and use *Add to Home Screen* to install it like a native app. It
works offline, needs no account, and sends no data anywhere.

---

## What's inside

The app has four tabs, named after what you're learning:

| Tab | Content |
| --- | --- |
| **Sentences** | 12 lessons, one core sentence pattern each (69 sentences, ~70 useful words) |
| **Words** | 8 vocabulary categories (175 words/phrases) plus your own saved words |
| **Kana** | Hiragana (46) and Katakana (46) in gojūon rows of five, plus dakuten (が), handakuten (ぱ), yōon (きゃ), sokuon (っ) and chōon (long vowels) |
| **Kanji** | Kanji N5 (180 characters) and RTK 1–200, grouped into stages of 20 |

Sentence lessons, in order: X is Y (は…です) · Questions & "not" (か, じゃないです) ·
Asking for things (をください) · Doing things (を + verb) · Topic + object + verb ·
Not doing (ません) · Going somewhere (に) · Where it happens (で) · There is / I have
(があります) · Likes (が好きです) · Wanting (たいです) · The past (ました).

Vocabulary categories: Greetings & Basics, Numbers, Days & Time, Survival Phrases,
Common Verbs, Adjectives, Food & Restaurant, Travel & Directions.

## The learning method

The Sentences section is built on a few well-supported principles:

- **Patterns, not word lists.** A small number of sentence patterns carry most everyday
  Japanese. Each lesson teaches one, reusing a small controlled vocabulary of useful
  words, so every sentence is understandable except the one new thing (research on
  formulaic sequences / "chunks" links them to fluency).
- **See the structure.** Every sentence is shown as colored blocks — topic, object,
  place, time, ending — with the hiragana above each kanji and the English meaning
  under each word. Japanese becomes: *blocks tagged by particles, verb last*.
- **Teach, then test.** Each lesson opens with the pattern, the new words, and all
  example sentences with audio — before any exercise.
- **Recognize before you produce.** Exercises get harder as a sentence settles in:
  *listen and pick the meaning* → *pick the missing particle* → *build it from tiles*
  → *build it from audio alone* (a form of dictation, which trains hearing individual
  words).
- **Retrieval + spacing.** Every answer is checked automatically and feeds the same
  spaced-repetition scheduler; practice testing and distributed practice are the two
  techniques rated "high utility" in Dunlosky et al.'s 2013 review. Re-practicing on
  the same day doesn't count as remembering — a sentence is *mastered* only once
  you've recalled it again days later.
- **Mistakes come back.** A wrong answer returns at the end of the session.
- **Listen and repeat.** Every answer plays the correct sentence (with a slow
  option) and prompts you to say it aloud — a light form of shadowing.
- **Word order is flexible, and the app knows it.** In build exercises, any
  grammatical ordering of the blocks before the verb is accepted (and pointed out),
  which is itself one of the most useful things to internalize about Japanese.

## How the other tabs teach

- **Introduction before testing.** A character you've never seen appears first as a
  `NEW` card showing the character together with its sound/meaning — it's only
  quizzed after you've met it.
- **Labeled exercises.** Every test card is marked `READ` (see the character, recall
  the sound) or `WRITE` (hear the sound, draw the character), so the two kinds of
  practice are clearly different on purpose.
- **Read / Write / Mix.** For kana you can practice one direction only, or both.
- **Marks & sound changes.** Dakuten, handakuten, yōon, sokuon and chōon each get a
  short explanation, then auto-graded *read* and *listen* questions whose wrong answers
  are the real mix-ups (が vs か, ぱ vs ば, きゃ vs きや, きって vs きて, ビール vs ビル).
  Sokuon and chōon are taught with minimal pairs — word pairs where only the small っ
  or the long vowel changes the meaning — which you can tap to hear side by side.
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
- **Hiragana readings.** Kanji readings (and words written with kanji) are shown in
  hiragana; a *Romaji on/off* switch in the header controls the romaji helper line
  everywhere in the app.
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
│   │   ├── components/      # UI: Sentences + exercises, Study, Vocabulary, WritePanel…
│   │   ├── data/            # sentence lessons, kana, kanji, RTK 200, vocabulary, dictionary
│   │   └── lib/             # SRS, sentence checking, furigana, romaji→kana, storage…
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
| `showRomaji` | Romaji on/off |

Because it's stored per device, progress doesn't sync between your phone and
computer, and clearing site data resets it.

## Credits

Stroke-order data from [KanjiVG](https://kanjivg.tagaini.net/) (CC BY-SA 3.0).
The RTK set follows the character ordering of *Remembering the Kanji* (6th ed.) by
James Heisig, with standard dictionary meanings and readings.
