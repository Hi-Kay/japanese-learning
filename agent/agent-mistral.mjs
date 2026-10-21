// agent-mistral.mjs — the same Japanese tutor agent, running on Mistral.
//
// Run:   export MISTRAL_API_KEY="..."   # from console.mistral.ai
//        node agent/agent-mistral.mjs
//
// This is a straight port of agent.mjs. The agent loop is identical:
//   1. send the conversation + a list of tools to the model
//   2. if the model asks to use a tool, run it and send back the result
//   3. repeat until the model gives a final answer
//
// Only the shape of the API calls changes. Every difference is marked [DIFF]
// below, and PORTING.md explains them together.

import readline from "node:readline/promises";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.MISTRAL_API_KEY;
// [DIFF] Model names. mistral-small-latest is the cheap tier, like Haiku was.
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
const MAX_STEPS = 10;             // safety cap so a confused agent can't loop forever
// Overridable so the loop can be driven against a local mock in tests.
const API_URL = process.env.MISTRAL_API_URL ?? "https://api.mistral.ai/v1/chat/completions";
const VOCAB_FILE = fileURLToPath(new URL("vocab.json", import.meta.url));

if (!API_KEY) {
  console.error("Missing MISTRAL_API_KEY. Create one at console.mistral.ai, then:");
  console.error('  export MISTRAL_API_KEY="..."');
  process.exit(1);
}

// ---------- 1. TOOLS: what the agent is allowed to do ----------
// [DIFF] Mistral wraps each tool as { type: "function", function: {...} } and calls
// the schema `parameters`. Anthropic has { name, description, input_schema } at the
// top level. The JSON Schema inside is identical, so only the envelope changes.

const tools = [
  {
    type: "function",
    function: {
      name: "lookup_word",
      description:
        "Look up a Japanese or English word in the Jisho dictionary. Returns readings, meanings and JLPT level. Use this to check readings and meanings instead of guessing.",
      parameters: {
        type: "object",
        properties: { word: { type: "string", description: "Word to look up, in Japanese or English" } },
        required: ["word"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_vocab",
      description:
        "Save one or more items to the learner's study list so they can review them later. " +
        "Items can be single words, phrases, or whole sentences. " +
        "When the learner asks to save several items, save them all in ONE call.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "list_vocab",
      description: "List everything the learner has saved so far (words, phrases and sentences).",
      parameters: { type: "object", properties: {} },
    },
  },
];

function loadVocab() {
  return fs.existsSync(VOCAB_FILE) ? JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8")) : [];
}

// Unchanged from agent.mjs — the tools themselves know nothing about the model.
async function runTool(name, input) {
  if (name === "lookup_word") {
    const url = "https://jisho.org/api/v1/search/words?keyword=" + encodeURIComponent(input.word);
    const res = await fetch(url, { headers: { "user-agent": "japanese-tutor-agent (learning project)" } });
    const body = await res.text();
    if (!res.ok) throw new Error(`Jisho returned HTTP ${res.status}: ${body.slice(0, 100)}`);
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Jisho sent a web page instead of data (HTTP ${res.status}): ${body.slice(0, 100)}`);
    }
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
const gray = (text) => `\x1b[90m${text}\x1b[0m`;

async function callModel(messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      // [DIFF] Bearer token, not x-api-key, and no API-version header.
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    // [DIFF] The system prompt is the first message, not a separate `system` field.
    body: JSON.stringify({ model: MODEL, tools, messages: [{ role: "system", content: SYSTEM }, ...messages] }),
  });
  const data = await res.json();
  // [DIFF] Mistral reports errors as { detail: ... }; Anthropic as { error: {...} }.
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data.detail ?? data.error ?? data)}`);
  // [DIFF] usage.prompt_tokens / completion_tokens, not input_tokens / output_tokens.
  totalIn += data.usage?.prompt_tokens ?? 0;
  totalOut += data.usage?.completion_tokens ?? 0;
  return data.choices[0];   // [DIFF] the reply is wrapped in a choices array
}

// ---------- 3. THE AGENT LOOP ----------
// Structurally identical to agent.mjs. Only how a tool call is read, and how a
// result is sent back, differ.

async function runAgentTurn(messages) {
  for (let step = 1; step <= MAX_STEPS; step++) {
    const choice = await callModel(messages);
    const message = choice.message;
    messages.push(message);   // [DIFF] push the message object back verbatim

    // [DIFF] finish_reason === "tool_calls", not stop_reason === "tool_use".
    if (choice.finish_reason !== "tool_calls") {
      if (step === 1) console.log(gray("  (answered directly, no tools used)"));
      return message.content ?? "";
    }

    // [DIFF] Text and tool calls are separate fields here, not mixed content blocks.
    if (message.content?.trim()) console.log(gray(`  💭 ${message.content.trim()}`));

    for (const call of message.tool_calls ?? []) {
      // [DIFF] arguments arrive as a JSON *string*, so they have to be parsed —
      // and a model can emit malformed JSON, so this needs its own guard.
      let input;
      try {
        input = typeof call.function.arguments === "string"
          ? JSON.parse(call.function.arguments)
          : call.function.arguments;
      } catch {
        const output = `Tool failed: arguments were not valid JSON: ${String(call.function.arguments).slice(0, 120)}`;
        console.log(`     ⚠️  ${output}`);
        messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
        continue;
      }

      console.log(`  🔧 step ${step}: ${call.function.name}(${JSON.stringify(input)})`);
      let output;
      try {
        output = await runTool(call.function.name, input);
      } catch (err) {
        output = `Tool failed: ${err.message}`;   // let the model see the error and adapt
        console.log(`     ⚠️  ${output}`);
      }
      if (process.env.DEBUG) {
        const preview = output.length > 300 ? output.slice(0, 300) + "…" : output;
        console.log(gray(`     ↳ ${preview}`));
      } else {
        console.log(gray(`     ↳ result: ${output.length} characters (DEBUG=1 to show)`));
      }
      // [DIFF] One message per result, role "tool", carrying tool_call_id.
      // Anthropic instead collects every result into a single user message.
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
    }
  }
  return "(Stopped: too many steps.)";
}

// ---------- 4. CHAT IN THE TERMINAL ----------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = [];

console.log(`日本語 tutor on Mistral (${MODEL}) — type a sentence, or 'quit' to exit.\n`);
while (true) {
  // question() throws once input ends (Ctrl-D, or a piped script finishing);
  // without this guard the loop asks again on a closed interface and crashes.
  let text;
  try {
    text = (await rl.question("You: ")).trim();
  } catch {
    break;
  }
  if (!text) continue;
  if (text === "quit") break;
  messages.push({ role: "user", content: text });
  try {
    console.log("\nTutor: " + (await runAgentTurn(messages)) + "\n");
  } catch (err) {
    console.error("\n" + err.message + "\n");
    messages.pop();
  }
  console.log(`  (tokens so far: ${totalIn} in / ${totalOut} out)\n`);
}
rl.close();
