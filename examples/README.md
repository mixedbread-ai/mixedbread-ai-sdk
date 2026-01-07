# AI SDK Mixedbread Tools

This folder contains code examples on how to use the mixedbread AI SDK tools
with the AI SDK.

- `search_store.ts`: The most basic example, earch a specific store with
  mixedbread.
- `web_search.ts`: Use the mixedbread web search store to search the internet.
- `persistent_scratchpad.ts`: A fully integrated AI scratchpad. The agent can
  search for previous entries and create new ones. Best for colaboration and
  preserving information across different sessions.

Run them via:

```bash
export MXBAI_API_KEY=API_KEY
node examples/search_store.ts
```
