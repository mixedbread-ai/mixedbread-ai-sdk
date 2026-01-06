# @mixedbread/ai-sdk

Mixedbread AI SDK tools for the [Vercel AI SDK](https://ai-sdk.dev). Provides tools for web search, semantic search, and document ingestion.

## Installation

```bash
pnpm install @mixedbread/ai-sdk
```

## Setup

Add your Mixedbread API key to your environment:

```bash
MIXEDBREAD_API_KEY=your_api_key_here
```

Get your API key from the [Mixedbread Dashboard](https://mixedbread.com/dashboard).

## Tools

### Search Tool

Search through documents in a Mixedbread knowledge base.

```typescript
import { generateText } from "ai";
import { searchTool } from "@mixedbread/ai-sdk";

const { text } = await generateText({
  model: yourModel,
  prompt: "What are the key features of our product?",
  tools: {
    search: searchTool({
      storeIdentifiers: ["your-store-id"],
      topK: 5,
    }),
  },
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | Mixedbread API key (defaults to `MIXEDBREAD_API_KEY` env var) |
| `storeIdentifiers` | `string[]` | Array of store IDs to search in |
| `topK` | `number` | Number of results to return (default: 5) |

### Web Search Tool

Search the internet using Mixedbread's web search capabilities.

```typescript
import { generateText } from "ai";
import { webSearchTool } from "@mixedbread/ai-sdk";

const { text } = await generateText({
  model: yourModel,
  prompt: "What are the latest developments in AI?",
  tools: {
    webSearch: webSearchTool({
      topK: 5,
    }),
  },
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | Mixedbread API key (defaults to `MIXEDBREAD_API_KEY` env var) |
| `topK` | `number` | Number of results to return (default: 5) |

### Ingest Tool

Ingest text content into a Mixedbread knowledge base.

```typescript
import { generateText } from "ai";
import { ingestTool } from "@mixedbread/ai-sdk";

const { text } = await generateText({
  model: yourModel,
  prompt: "Save this meeting summary to our knowledge base: ...",
  tools: {
    ingest: ingestTool({
      storeIdentifier: "your-store-id",
    }),
  },
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | Mixedbread API key (defaults to `MIXEDBREAD_API_KEY` env var) |
| `storeIdentifier` | `string` | Store ID to ingest content into |

## Full Example

```typescript
import { generateText } from "ai";
import { searchTool, webSearchTool, ingestTool } from "@mixedbread/ai-sdk";

const storeId = "your-store-id";

const { text } = await generateText({
  model: yourModel,
  prompt: "Search for information about our API and summarize it",
  tools: {
    search: searchTool({
      storeIdentifiers: [storeId],
      topK: 5,
    }),
    webSearch: webSearchTool({
      topK: 5,
    }),
    ingest: ingestTool({
      storeIdentifier: storeId,
    }),
  },
  maxSteps: 3,
});

console.log(text);
```

## Resources

- [Mixedbread Documentation](https://mixedbread.com/docs)
- [Mixedbread API Reference](https://mixedbread.com/api-reference)
- [Vercel AI SDK Documentation](https://ai-sdk.dev)

## License

MIT
