# Japanese tutor agent

A from-scratch AI agent (no framework) that corrects your Japanese, checks words
in the Jisho dictionary, and saves vocab to `vocab.json`.

## Run

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # from console.anthropic.com — never commit it
node agent/agent.mjs
```

Needs Node 18+. The 🔧 lines show each tool the model chose to call.
