import { LESSONS, tokensOf } from "./sentences.js";

// Mini-dialogues: someone asks, the learner answers. Built only from words and patterns
// of the lessons; `lesson` is the latest lesson a dialogue needs, and it is offered once
// that lesson is learned. The question is spoken by a second voice (see lib/speech.js).
//
// [id, lesson id, where it happens, [question, english], [answer, english]]
const DIALOGUE_DEFS = [
  ["tea", "questions", "At a café", ["kore:T wa:T ocha:V desu:V ka:V", "Is this tea?"], ["iie:Q, koohii:V desu:V", "No, it's coffee."]],
  ["station", "questions", "On the street", ["eki:T wa:T doko:V desu:V ka:V", "Where is the station?"], ["eki:T wa:T koko:V desu:V", "The station is here."]],
  ["what", "kore", "At a market", ["sore:T wa:T nan:V desu:V ka:V", "What is that?"], ["kore:T wa:T ocha:V desu:V", "This is tea."]],
  ["who", "kono", "At the office", ["ano:T hito:T wa:T dare:V desu:V ka:V", "Who is that person over there?"], ["tanaka:V desu:V", "That's Tanaka-san."]],
  ["coffee", "masen", "At a friend's home", ["koohii:O o:O nomimasu:V ka:V", "Do you drink coffee?"], ["hai:Q, nomimasu:V", "Yes, I do."]],
  ["where", "ni", "Leaving the office", ["doko:L ni:L ikimasu:V ka:V", "Where are you going?"], ["eki:L ni:L ikimasu:V", "I'm going to the station."]],
  ["like", "suki", "At a café", ["koohii:S ga:S suki:V desu:V ka:V", "Do you like coffee?"], ["hai:Q, suki:V desu:V", "Yes, I like it."]],
  ["time", "time", "On the street", ["nanji:V desu:V ka:V", "What time is it?"], ["sanji:V desu:V", "It's three o'clock."]],
  ["from", "karamade", "Meeting someone new", ["doko:L kara:L kimashita:V ka:V", "Where are you from?"], ["doitsu:L kara:L kimashita:V", "I'm from Germany."]],
  ["invite", "mashou", "After work", ["koohii:O o:O nomimasen:V ka:V", "Shall we have a coffee?"], ["hai:Q, nomimashou:V", "Yes, let's have a drink."]],
];

// Shaped like a sentence (the answer is what gets practiced and graded), so sessions,
// reviews and progress treat it like one. Progress key: s:dlg-<id>.
export const DIALOGUES = DIALOGUE_DEFS.map(([id, lessonId, scene, [ask, askEn], [answer, en]]) => {
  const lesson = LESSONS.findIndex((l) => l.id === lessonId);
  if (lesson < 0) throw new Error(`Unknown lesson "${lessonId}" in dialogue data`);
  return { id: `dlg-${id}`, lesson, en, tokens: tokensOf(answer), dialogue: { scene, ask: { tokens: tokensOf(ask), en: askEn } } };
});
