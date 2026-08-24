# @mixedbread/ai-sdk-provider

Mixedbread provider for the [Vercel AI SDK](https://ai-sdk.dev). Gives you the
`toast-1` language model with server-side retrieval over your Stores.

## Installation

```bash
pnpm add @mixedbread/ai-sdk-provider ai
```

## Setup

```bash
MXBAI_API_KEY=your_api_key_here
```

Get your API key from the [Mixedbread Platform](https://platform.mixedbread.com/).

## Provider

```typescript
import { generateText } from "ai";
import { mixedbread } from "@mixedbread/ai-sdk-provider";

const { text } = await generateText({
  model: mixedbread("toast-1"),
  prompt: "What is a sourdough starter?",
});
```

`mixedbread()` defaults to `toast-1`, so `mixedbread()` and
`mixedbread("toast-1")` are the same model.

### AI SDK version

This package implements Language Model Specification **V4**, which is what
`ai@7` (the current `latest`) uses.

| Your `ai` version | Install |
|-------------------|---------|
| `ai@7` (spec v4)  | `@mixedbread/ai-sdk-provider` |
| `ai@6` (spec v3)  | `@mixedbread/ai-sdk-provider@ai-v6` |

```bash
# ai@7, the default
pnpm add @mixedbread/ai-sdk-provider ai

# still on ai@6
pnpm add @mixedbread/ai-sdk-provider@ai-v6 ai@6
```

Both lines expose the same `createMixedbread`, `mixedbread` and
`mixedbread.tools` API and hit the same endpoint; only the specification
version differs. The `ai-v6` line is maintenance-only.

### Custom instance

```typescript
import { createMixedbread } from "@mixedbread/ai-sdk-provider";

const mixedbread = createMixedbread({
  apiKey: process.env.MXBAI_API_KEY,
  baseURL: "https://api.mixedbread.com/v1",
  headers: { "X-Team": "search" },
});
```

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | API key. Defaults to `MXBAI_API_KEY`, then `MIXEDBREAD_API_KEY` |
| `baseURL` | `string` | API base URL (default: `https://api.mixedbread.com/v1`) |
| `headers` | `Record<string, string>` | Extra headers sent with every request |
| `fetch` | `FetchFunction` | Custom fetch, e.g. for testing or proxying |
| `generateId` | `() => string` | ID generator for tool calls that arrive without one |

## Hosted store tools

`toast-1` can search your Stores server-side: you declare the tool, Mixedbread
runs it inside the completion and streams the calls and results back. There is
no `execute` to write and no extra round trip.

```typescript
import { generateText } from "ai";
import { mixedbread } from "@mixedbread/ai-sdk-provider";

const { text, staticToolCalls } = await generateText({
  model: mixedbread("toast-1"),
  prompt: "What does our handbook say about on-call? Cite your sources.",
  tools: {
    storeSearch: mixedbread.tools.storeSearch({
      storeIdentifiers: ["handbook"],
      maxNumResults: 10,
      citations: true,
    }),
  },
});
```

| Tool | Purpose | Options |
|------|---------|---------|
| `storeSearch` | Semantic search over stores | `storeIdentifiers`, `maxNumResults`, `filters`, `scoreThreshold`, `citations` |
| `storeGrep` | Regex match over chunk text | `storeIdentifiers`, `maxNumResults`, `filters`, `citations` |
| `storeListChunks` | Metadata-driven chunk listing | `storeIdentifiers`, `maxNumResults`, `filters`, `citations` |
| `storeMetadataFacets` | Which metadata fields and values exist | `storeIdentifiers`, `filters`, `maxValuesPerField` |
| `listStores` | Paginated listing of your stores | `limit` |

Leave `storeIdentifiers` off to let the model pick a store per call — pair that
with `listStores` so it can discover what it may name.

Hosted executions arrive as regular AI SDK tool calls and tool results marked
`providerExecuted: true`, interleaved with the model's reasoning in the order
they ran.

## Function tools

Client-executed tools work as they do with any other provider. The completion
ends with `finish_reason: "tool_calls"`; run the functions and send the results
back on the next call.

```typescript
import { generateText, tool } from "ai";
import { z } from "zod";
import { mixedbread } from "@mixedbread/ai-sdk-provider";

await generateText({
  model: mixedbread("toast-1"),
  prompt: "What is the weather in Berlin?",
  tools: {
    getWeather: tool({
      description: "Get the weather for a city",
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ city, celsius: 21 }),
    }),
  },
});
```

## Provider options

Mixedbread extensions to the Chat Completions API are passed per call under
`providerOptions.mixedbread`.

```typescript
await generateText({
  model: mixedbread("toast-1"),
  prompt: "And what about the escalation path?",
  providerOptions: {
    mixedbread: {
      previousCompletionId: "cmpl_abc123",
      store: true,
      include: ["store_search_call.results"],
    },
  },
});
```

| Option | Type | Description |
|--------|------|-------------|
| `store` | `boolean` | Persist the completion for later retrieval (API default: `true`) |
| `previousCompletionId` | `string` | Continue a stored conversation and restore its full model context |
| `terminalToolName` | `string` | Function tool whose answer argument closes the stored transcript |
| `maxToolCalls` | `number` | Cap on hosted retrieval calls in one completion |
| `parallelToolCalls` | `boolean` | Allow several tool calls per turn (default `true`) |
| `metadata` | `Record<string, string>` | Arbitrary string metadata stored with the completion |
| `include` | `string[]` | Extra response fields, e.g. `store_search_call.results` |

### Provider metadata

Every result carries `providerMetadata.mixedbread`:

| Field | Description |
|-------|-------------|
| `completionId` | ID to pass as `previousCompletionId` on the next turn |
| `title` | Short display title generated for the conversation |
| `toolTickets` | One short-lived ticket per client-executed tool call; send it as the `X-Mxbai-Tool-Ticket` header on the store search or grep you run for that call to bill at the discounted agent rate |

## Unsupported settings

`toast-1` ignores `topK`, `seed`, `stopSequences`, `presencePenalty`,
`frequencyPenalty`, and JSON `responseFormat`. Passing them produces a warning
on the result rather than an error. Image and file prompt parts are rejected —
`toast-1` is text-in, text-out.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test          # unit tests against a mocked transport
pnpm build
pnpm smoke         # live check, needs .env with MXBAI_API_KEY
```

## Releasing

Releases are published to npm by GitHub Actions when a `v*.*.*` tag is pushed.

```bash
# 1. bump the version on main
npm version patch   # or minor / major

# 2. push the commit and the tag
git push origin main --follow-tags
```

The [release workflow](.github/workflows/release.yml) refuses to publish unless
the tagged commit is on `main` and the tag matches the `version` in
`package.json`. It then runs typecheck, tests and the build before
`npm publish --access public --provenance`, and opens a GitHub release with
generated notes.

Every push and pull request against `main` runs
[CI](.github/workflows/ci.yml) (typecheck, tests, build) on Node 20, 22 and 24.

### npm authentication

Releases authenticate with npm over OIDC
[trusted publishing](https://docs.npmjs.com/trusted-publishers/), configured for
this package at npmjs.com against the `mixedbread-ai/mixedbread-ai-sdk`
repository and the `release.yml` workflow. There is no long-lived npm token, and
the workflow needs none.

Do not add an `NPM_TOKEN` secret back or reintroduce `NODE_AUTH_TOKEN` in the
publish step. An unset secret resolves to an empty string, which `setup-node`
writes into `.npmrc` as the auth token; npm then prefers that over OIDC and
fails with `E401`.

Provenance is independent of this. It comes from `--provenance` plus
`id-token: write` on a public repository, and worked the same way when the first
release still used a token.

Trusted publishing requires npm >= 11.5.1, which is why the release workflow
runs Node 24.

### Spec version dist-tags

`latest` always points at the newest Language Model Specification the package
supports. Older specifications stay installable on a dist-tag rather than a
subpath, which is how `@ai-sdk/*` and most community providers handle it:

| Tag | Spec | `ai` version |
|-----|------|--------------|
| `latest` | v4 | `ai@7` |
| `ai-v6` | v3 | `ai@6` |

The `ai-v6` tag is pinned to `0.1.0` and must not be moved by a normal release —
`npm version` and the release workflow only ever update `latest`. Repointing it
would hand spec-v4 code to `ai@6` users.

Dist-tags are set by hand, not by CI, so they need npm credentials on your own
machine. Publishing runs on `NPM_TOKEN` inside Actions, which does not log you
in locally — `npm dist-tag add` fails with `E401` until you run `npm login`:

```bash
npm login
npm dist-tag add @mixedbread/ai-sdk-provider@0.1.0 ai-v6
```

## Resources

- [Mixedbread Documentation](https://mixedbread.com/docs)
- [Mixedbread API Reference](https://mixedbread.com/api-reference)
- [Vercel AI SDK Documentation](https://ai-sdk.dev)

## License

MIT
