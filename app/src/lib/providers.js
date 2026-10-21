// Two providers, one agent loop.
//
// The tutor runs on either Claude (Anthropic) or Mistral, using the learner's own
// key. The loop in tutor.js does not know which: it speaks the neutral format
// described below, and each provider here translates that to and from its own wire
// format. Adding a third provider means adding one entry to PROVIDERS.
//
// This is the same port as agent/agent-mistral.mjs in the terminal version;
// agent/PORTING.md lists all six API differences side by side.
//
// ---------- the neutral conversation ----------
// What tutor.js keeps and what gets saved to localStorage. It holds no
// provider-specific shapes, so a chat survives switching provider halfway through.
//
//   { role: "user",      text }
//   { role: "assistant", text, calls: [{ id, name, input }] }
//   { role: "tool",      results: [{ id, name, output }] }

const MAX_TOKENS = 1024;
const KEY_REJECTED = "The API key was rejected. Check it in the Tutor settings.";

// Mistral's validator wants tool-call ids of exactly nine alphanumeric characters,
// while Anthropic's look like "toolu_01AbC…". So ids are renumbered for Mistral —
// consistently per request, because a call and its result must still agree.
function idShortener() {
  const seen = new Map();
  return (id) => {
    if (!seen.has(id)) seen.set(id, "c" + String(seen.size).padStart(8, "0"));
    return seen.get(id);
  };
}

async function readJson(res) {
  return res.json().catch(() => ({}));
}

export const PROVIDERS = {
  anthropic: {
    id: "anthropic",
    label: "Claude",
    vendor: "Anthropic",
    model: "claude-haiku-5-5",
    modelLabel: "Haiku 5.5",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    consoleLabel: "console.anthropic.com",
    placeholder: "sk-ant-…",
    // Haiku 5.5: $0.10 / $0.50 per million input / output tokens.
    price: { input: 0.1, output: 0.5 },
    looksLikeKey: (k) => k.startsWith("sk-ant-"),

    async send({ key, system, tools, convo }) {
      const messages = convo.map((m) => {
        if (m.role === "user") return { role: "user", content: m.text };
        if (m.role === "assistant")
          return {
            role: "assistant",
            content: [
              // An empty text block is rejected, so only include text when there is some.
              ...(m.text ? [{ type: "text", text: m.text }] : []),
              ...m.calls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.input ?? {} })),
            ],
          };
        // Every tool result goes back in ONE user message, as a list of blocks.
        return { role: "user", content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.output })) };
      });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          // Required to call the API straight from a web page. Safe here because the
          // key is the learner's own and stays in their browser.
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: this.model, max_tokens: MAX_TOKENS, system, tools, messages }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 401) throw new Error(KEY_REJECTED);
        throw new Error(`API error ${res.status}: ${data.error?.message ?? "unknown error"}`);
      }
      const blocks = data.content ?? [];
      return {
        text: blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim(),
        calls: blocks.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, name: b.name, input: b.input })),
        usage: { input: data.usage?.input_tokens ?? 0, output: data.usage?.output_tokens ?? 0 },
      };
    },
  },

  mistral: {
    id: "mistral",
    label: "Mistral",
    vendor: "Mistral AI",
    model: "mistral-small-latest",
    modelLabel: "Mistral Small",
    consoleUrl: "https://console.mistral.ai/api-keys",
    consoleLabel: "console.mistral.ai",
    placeholder: "your Mistral API key",
    // Mistral Small: $0.15 / $0.60 per million input / output tokens.
    price: { input: 0.15, output: 0.6 },
    // Deliberately loose: Mistral keys are a plain alphanumeric string with no
    // prefix to check, so this only rules out junk and a misplaced Claude key.
    looksLikeKey: (k) => k.length >= 20 && !k.startsWith("sk-ant-"),

    async send({ key, system, tools, convo }) {
      const shortId = idShortener();
      // The system prompt is the first message here, not a field of its own.
      const messages = [{ role: "system", content: system }];
      for (const m of convo) {
        if (m.role === "user") messages.push({ role: "user", content: m.text });
        else if (m.role === "assistant")
          messages.push({
            role: "assistant",
            content: m.text ?? "",
            ...(m.calls.length && {
              tool_calls: m.calls.map((c) => ({
                id: shortId(c.id),
                type: "function",
                function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) },
              })),
            }),
          });
        // One message per result, role "tool", each carrying its own tool_call_id.
        else for (const r of m.results) messages.push({ role: "tool", tool_call_id: shortId(r.id), name: r.name, content: r.output });
      }

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        // No browser-access opt-in header needed: api.mistral.ai allows direct
        // calls from a web page.
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_TOKENS,
          // Same JSON Schema as Anthropic's tools, wrapped, with input_schema renamed.
          tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })),
          messages,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 401) throw new Error(KEY_REJECTED);
        throw new Error(`API error ${res.status}: ${mistralError(data)}`);
      }
      const msg = data.choices?.[0]?.message ?? {};
      return {
        text: (msg.content ?? "").trim(),
        calls: (msg.tool_calls ?? []).map(readMistralCall),
        usage: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 },
      };
    },
  },
};

// Arguments arrive as a JSON *string* rather than an object, and a model can get
// that wrong, so a bad parse is flagged and handed back to the model as a tool
// error instead of breaking the turn.
function readMistralCall(c) {
  const call = { id: c.id, name: c.function?.name };
  try {
    call.input = typeof c.function?.arguments === "string" ? JSON.parse(c.function.arguments) : (c.function?.arguments ?? {});
  } catch {
    call.input = null;
    call.badArguments = String(c.function?.arguments).slice(0, 120);
  }
  return call;
}

// Mistral reports errors as `detail` — a string, or a list of validation objects.
function mistralError(data) {
  const d = data.detail ?? data.message;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg ?? JSON.stringify(x)).join("; ");
  return "unknown error";
}

export const PROVIDER_LIST = Object.values(PROVIDERS);
export const DEFAULT_PROVIDER = "anthropic";
export const providerOf = (id) => PROVIDERS[id] ?? PROVIDERS[DEFAULT_PROVIDER];

// Tokens are counted per provider, because a chat can span both and they are
// priced differently. `usage` is { [providerId]: { input, output } }.
export const totalTokens = (usage) => Object.values(usage ?? {}).reduce((n, u) => n + u.input + u.output, 0);

export const costOf = (usage) =>
  Object.entries(usage ?? {}).reduce((sum, [id, u]) => {
    const { price } = providerOf(id);
    return sum + (u.input * price.input + u.output * price.output) / 1e6;
  }, 0);
