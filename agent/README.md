# Japanese tutor agent

A from-scratch AI agent (no framework) that corrects your Japanese, checks words
in the Jisho dictionary, and saves vocab to `vocab.json`.

## Run

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # from console.anthropic.com — never commit it
node agent/agent.mjs
```

Needs Node 18+. The 🔧 lines show each tool the model chose to call.

## Two providers, one loop

`agent.mjs` runs on Anthropic, `agent-mistral.mjs` on Mistral. The tools, the system
prompt and the agent loop are identical; only the API shapes differ, and every changed
line is marked `[DIFF]`. See **[PORTING.md](PORTING.md)** for what differs and why.

```bash
export MISTRAL_API_KEY="..."   # from console.mistral.ai
node agent/agent-mistral.mjs
```
