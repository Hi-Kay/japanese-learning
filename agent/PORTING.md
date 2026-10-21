# Porting the agent from Anthropic to Mistral

Two files in this folder run the same Japanese tutor agent against two different
providers:

| File | Provider | API |
|---|---|---|
| `agent.mjs` | Anthropic | Messages API |
| `agent-mistral.mjs` | Mistral | Chat Completions (OpenAI-compatible) |

The tools, the system prompt, the step cap and the loop itself are unchanged. Every
line that had to change is marked `[DIFF]` in `agent-mistral.mjs`. This file explains
why.

```bash
export MISTRAL_API_KEY="..."        # console.mistral.ai
node agent/agent-mistral.mjs
# optional: MISTRAL_MODEL=mistral-large-latest
```

---

## What stayed the same

The agent loop. Send the conversation plus the tool definitions; if the model asks for
a tool, run it and send the result back; repeat until it answers, with a cap so a
confused agent cannot loop forever. That shape is provider-independent, which is the
main thing this port demonstrates.

The three tools (`lookup_word`, `save_vocab`, `list_vocab`) are untouched — they know
nothing about which model is calling them. The JSON Schema describing each tool's
arguments is also identical; only the envelope around it differs.

---

## What had to change

### 1. Endpoint and auth

| | Anthropic | Mistral |
|---|---|---|
| URL | `api.anthropic.com/v1/messages` | `api.mistral.ai/v1/chat/completions` |
| Auth | `x-api-key: <key>` | `authorization: Bearer <key>` |
| Version | `anthropic-version: 2023-06-01` required | none |

### 2. The system prompt moves into the message list

Anthropic takes `system` as its own top-level field. Mistral has no such field: the
system prompt is the first message, with `role: "system"`. Keeping it out of the
stored history and prepending it per request means the conversation array stays the
same in both versions.

### 3. Tool definitions gain an envelope

```jsonc
// Anthropic
{ "name": "lookup_word", "description": "…", "input_schema": { … } }

// Mistral
{ "type": "function",
  "function": { "name": "lookup_word", "description": "…", "parameters": { … } } }
```

Same schema, different wrapper, and `input_schema` is called `parameters`.

### 4. Reading the reply

Anthropic returns a list of content blocks, where text and tool calls are mixed
together and each tool call carries its arguments as a parsed object. Mistral returns
one message in a `choices` array, with the text in `message.content` and tool calls in
a separate `message.tool_calls` array.

| | Anthropic | Mistral |
|---|---|---|
| Reply | `response.content[]` blocks | `response.choices[0].message` |
| Wants a tool? | `stop_reason === "tool_use"` | `finish_reason === "tool_calls"` |
| Call id | `block.id` | `call.id` |
| Arguments | `block.input` — already an object | `call.function.arguments` — **a JSON string** |

That last row is the one real trap. Arguments arrive as text and have to be parsed,
and a model can emit malformed JSON, so the parse needs its own error path — in this
port a failed parse is reported back to the model as a tool error rather than crashing
the turn.

### 5. Sending results back

Anthropic collects every result into a **single `user` message** holding one
`tool_result` block per call. Mistral wants **one message per result**, with
`role: "tool"` and the `tool_call_id` it was given:

```jsonc
// Anthropic — one message, many blocks
{ "role": "user", "content": [ { "type": "tool_result", "tool_use_id": "…", "content": "…" } ] }

// Mistral — one message per call
{ "role": "tool", "tool_call_id": "…", "name": "lookup_word", "content": "…" }
```

If `tool_call_id` does not match, the model cannot connect the result to its request.

### 6. Token accounting

`usage.input_tokens` / `output_tokens` become `usage.prompt_tokens` /
`completion_tokens`. Errors also differ: Mistral returns `{ "detail": … }`, Anthropic
`{ "error": { … } }`.

---

## How it was tested without burning a key

The endpoint is overridable via `MISTRAL_API_URL`, so the loop can be driven against a
local stub that returns Mistral-shaped responses — one turn requesting a tool, one
turn answering. That verifies the parts that actually changed:

- the system prompt is the first message
- message roles run `system → user → assistant → tool`
- the tool result carries the right `tool_call_id`, name and content
- tools are sent in the `{ type: "function", function: { … parameters } }` envelope
- the auth header is `Bearer …`
- tokens accumulate across turns

The tool itself is not stubbed: the test run performed a real Jisho lookup for ねこ and
got 猫 / cat / JLPT N5 back, so the full round trip is exercised.

## One bug this surfaced

Both agents ended the chat loop with `while (true) { await rl.question(…) }`. When
input ends — Ctrl-D, or a piped script finishing — readline closes and the next
`question()` throws `ERR_USE_AFTER_CLOSE`, so the process dies with a stack trace
instead of exiting. Invisible while a human is typing, obvious the moment anything is
piped in. `agent-mistral.mjs` catches it and breaks; `agent.mjs` has the same issue and
the same one-line fix applies.

---

## What this does not make it

A prototype, not a production system. There is no evaluation of whether the tutor's
corrections are actually correct, no guardrails beyond the prompt, no retries or
backoff, and the key lives in an environment variable. Those are the things that would
need to exist before calling it production-ready.
