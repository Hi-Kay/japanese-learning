// agent.js — a Japanese tutor agent, written from scratch (no framework).
//
// Run:   node agent.js          (needs Node 18 or newer)
// Needs: an environment variable ANTHROPIC_API_KEY with your key.
//
// The whole idea of an "agent" is in runAgentTurn() below:
//   1. send the conversation + a list of tools to the model
//   2. if the model asks to use a tool, run it and send back the result
//   3. repeat until the model gives a final answer

import readline from "node:readline/promises";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-5-5"; // cheapest model tier
const MAX_STEPS = 10;             // safety cap so a confused agent can't loop forever
// Always next to this script, no matter which folder you start it from.
const VOCAB_FILE = fileURLToPath(new URL("vocab.json", import.meta.url));

if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. See the instructions in the chat.");
  process.exit(1);
}

// ---------- 1. TOOLS: what the agent is allowed to do ----------
// The model never runs code itself. It only *asks* for a tool by name,
// with arguments matching input_schema. Your code does the actual work.

const tools = [
  {
    name: "lookup_word",
    description:
      "Look up a Japanese or English word in the Jisho dictionary. Returns readings, meanings and JLPT level. Use this to check readings and meanings instead of guessing.",
    input_schema: {
      type: "object",
      properties: { word: { type: "string", description: "Word to look up, in Japanese or English" } },
      required: ["word"],
    },
  },
  {
    name: "save_vocab",
    description:
      "Save one or more items to the learner's study list so they can review them later. " +
      "Items can be single words, phrases, or whole sentences. " +
      "When the learner asks to save several items, save them all in ONE call.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              japanese: { type: "string", description: "The word, phrase or sentence in Japanese" },
              reading: { type: "string", description: "Full reading in hiragana" },
              meaning: { type: "string", description: "English meaning" },
              example: { type: "string", description: "Optional example sentence (for single words)" },
            },
            required: ["japanese", "reading", "meaning"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "list_vocab",
    description: "List everything the learner has saved so far (words, phrases and sentences).",
    input_schema: { type: "object", properties: {} },
  },
];

function loadVocab() {
  return fs.existsSync(VOCAB_FILE) ? JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8")) : [];
}

async function runTool(name, input) {
  if (name === "lookup_word") {
    const url = "https://jisho.org/api/v1/search/words?keyword=" + encodeURIComponent(input.word);
    const res = await fetch(url, { headers: { "user-agent": "japanese-tutor-agent (learning project)" } });
    const body = await res.text();
    // Report clearly what went wrong, so both the model and you can see it.
    if (!res.ok) throw new Error(`Jisho returned HTTP ${res.status}: ${body.slice(0, 100)}`);
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Jisho sent a web page instead of data (HTTP ${res.status}): ${body.slice(0, 100)}`);
    }
    // Keep only the top 3 results, trimmed down — less text = fewer tokens = lower cost.
    const results = data.data.slice(0, 3).map((entry) => ({
      word: entry.japanese[0].word ?? entry.japanese[0].reading,
      reading: entry.japanese[0].reading,
      meanings: entry.senses[0]?.english_definitions ?? [],
      jlpt: entry.jlpt ?? [],
    }));
    return results.length ? JSON.stringify(results) : "No results found.";
  }
  if (name === "save_vocab") {
    const vocab = loadVocab();
    const saved = new Date().toISOString();
    for (const item of input.items) vocab.push({ ...item, saved });
    fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocab, null, 2));
    return `Saved ${input.items.length} item(s). The list now has ${vocab.length} items.`;
  }
  if (name === "list_vocab") {
    const vocab = loadVocab();
    return vocab.length ? JSON.stringify(vocab) : "The vocabulary list is empty.";
  }
  return `Unknown tool: ${name}`;
}

// ---------- 2. THE MODEL CALL ----------

const SYSTEM = `You are a friendly Japanese tutor for a beginner.
When the learner writes Japanese, correct mistakes and briefly explain why.
Always use lookup_word to check readings or meanings you are not certain about.
When a useful new word or sentence comes up, offer to save it, and use save_vocab if they agree.
Never say something was saved unless save_vocab confirmed it.
Keep answers short. Show readings in hiragana for any kanji you use.
When quizzing, ask ONE question at a time and never reveal the answer in the question itself.
Wait for the learner's reply, then say whether it was right and give the answer.`;

let totalIn = 0, totalOut = 0;
const gray = (text) => `\x1b[90m${text}\x1b[0m`; // dim text in the terminal

async function callModel(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data.error ?? data)}`);
  totalIn += data.usage.input_tokens;
  totalOut += data.usage.output_tokens;
  return data;
}

// ---------- 3. THE AGENT LOOP ----------

async function runAgentTurn(messages) {
  for (let step = 1; step <= MAX_STEPS; step++) {
    const response = await callModel(messages);
    messages.push({ role: "assistant", content: response.content });

    // No tool requested -> this is the final answer.
    if (response.stop_reason !== "tool_use") {
      if (step === 1) console.log(gray("  (answered directly, no tools used)"));
      return response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    }

    // Show what the model said while deciding to use tools (its "thinking out loud").
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) console.log(gray(`  💭 ${block.text.trim()}`));
    }

    // Run every tool the model asked for, and send all results back together.
    const results = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.log(`  🔧 step ${step}: ${block.name}(${JSON.stringify(block.input)})`);
      let output;
      try {
        output = await runTool(block.name, block.input);
      } catch (err) {
        output = `Tool failed: ${err.message}`; // let the model see the error and adapt
        console.log(`     ⚠️  ${output}`);              // and always show errors to you
      }
      // Tool results can contain answers (e.g. meanings during a quiz), so by default
      // only show their size. Run with DEBUG=1 to see the full result.
      if (process.env.DEBUG) {
        const preview = output.length > 300 ? output.slice(0, 300) + "…" : output;
        console.log(gray(`     ↳ ${preview}`));
      } else {
        console.log(gray(`     ↳ result: ${output.length} characters (DEBUG=1 to show)`));
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }
    messages.push({ role: "user", content: results });
  }
  return "(Stopped: too many steps.)";
}

// ---------- 4. CHAT IN THE TERMINAL ----------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = []; // the full conversation; this is the agent's short-term memory

console.log("日本語 tutor — type a sentence, or 'quit' to exit.\n");
while (true) {
  const text = (await rl.question("You: ")).trim();
  if (!text) continue;
  if (text === "quit") break;
  messages.push({ role: "user", content: text });
  try {
    console.log("\nTutor: " + (await runAgentTurn(messages)) + "\n");
  } catch (err) {
    console.error("\n" + err.message + "\n");
    messages.pop(); // drop the failed message so the conversation stays valid
  }
  console.log(`  (tokens so far: ${totalIn} in / ${totalOut} out)\n`);
}
rl.close();
