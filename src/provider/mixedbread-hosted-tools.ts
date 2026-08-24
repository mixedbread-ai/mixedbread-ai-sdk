import { createProviderExecutedToolFactory } from "@ai-sdk/provider-utils";
import { z } from "zod/v4";

const hostedToolCallOutputSchema = z.looseObject({
  type: z.string(),
  id: z.string(),
  status: z.enum(["in_progress", "completed", "failed"]).nullish(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullish(),
});

const metadataFilterInputSchema = z.looseObject({
  metadata_filters: z.array(z.unknown()).nullish(),
  filter_mode: z.enum(["all", "any"]).nullish(),
  store: z.string().nullish(),
});

export type MixedbreadStoreSearchArgs = {
  storeIdentifiers?: string[];
  maxNumResults?: number;
  filters?: unknown;
  scoreThreshold?: number;
  citations?: boolean;
};

export type MixedbreadStoreGrepArgs = {
  storeIdentifiers?: string[];
  maxNumResults?: number;
  filters?: unknown;
  citations?: boolean;
};

export type MixedbreadStoreListChunksArgs = {
  storeIdentifiers?: string[];
  maxNumResults?: number;
  filters?: unknown;
  citations?: boolean;
};

export type MixedbreadStoreMetadataFacetsArgs = {
  storeIdentifiers?: string[];
  filters?: unknown;
  maxValuesPerField?: number;
};

export type MixedbreadListStoresArgs = {
  limit?: number;
};

const storeSearch = createProviderExecutedToolFactory<
  z.infer<typeof metadataFilterInputSchema> & { queries?: string[] },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreSearchArgs
>({
  id: "mixedbread.store_search",
  inputSchema: metadataFilterInputSchema.extend({
    queries: z.array(z.string()).optional(),
  }),
  outputSchema: hostedToolCallOutputSchema,
});

const storeGrep = createProviderExecutedToolFactory<
  z.infer<typeof metadataFilterInputSchema> & {
    pattern?: string;
    case_sensitive?: boolean;
  },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreGrepArgs
>({
  id: "mixedbread.store_grep",
  inputSchema: metadataFilterInputSchema.extend({
    pattern: z.string().optional(),
    case_sensitive: z.boolean().optional(),
  }),
  outputSchema: hostedToolCallOutputSchema,
});

const storeListChunks = createProviderExecutedToolFactory<
  z.infer<typeof metadataFilterInputSchema> & {
    rank_by?: string;
    direction?: "asc" | "desc";
  },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreListChunksArgs
>({
  id: "mixedbread.store_list_chunks",
  inputSchema: metadataFilterInputSchema.extend({
    rank_by: z.string().optional(),
    direction: z.enum(["asc", "desc"]).optional(),
  }),
  outputSchema: hostedToolCallOutputSchema,
});

const storeMetadataFacets = createProviderExecutedToolFactory<
  { store?: string | null },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreMetadataFacetsArgs
>({
  id: "mixedbread.store_metadata_facets",
  inputSchema: z.looseObject({ store: z.string().nullish() }),
  outputSchema: hostedToolCallOutputSchema,
});

const listStores = createProviderExecutedToolFactory<
  { cursor?: string | null },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadListStoresArgs
>({
  id: "mixedbread.list_stores",
  inputSchema: z.looseObject({ cursor: z.string().nullish() }),
  outputSchema: hostedToolCallOutputSchema,
});

export const mixedbreadTools = {
  storeSearch,
  storeGrep,
  storeListChunks,
  storeMetadataFacets,
  listStores,
};

export const mixedbreadProviderToolNames = {
  "mixedbread.store_search": "store_search",
  "mixedbread.store_grep": "store_grep",
  "mixedbread.store_list_chunks": "store_list_chunks",
  "mixedbread.store_metadata_facets": "store_metadata_facets",
  "mixedbread.list_stores": "list_stores",
} as const;

export const hostedToolTypeToToolId: Record<string, `${string}.${string}`> = {
  store_search_call: "mixedbread.store_search",
  store_grep_call: "mixedbread.store_grep",
  store_list_chunks_call: "mixedbread.store_list_chunks",
  store_metadata_facets_call: "mixedbread.store_metadata_facets",
  list_stores_call: "mixedbread.list_stores",
};

export const hostedToolTypeToToolName: Record<string, string> = {
  store_search_call: "store_search",
  store_grep_call: "store_grep",
  store_list_chunks_call: "store_list_chunks",
  store_metadata_facets_call: "store_metadata_facets",
  list_stores_call: "list_stores",
};
