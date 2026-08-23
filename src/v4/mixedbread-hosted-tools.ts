import { createProviderExecutedToolFactory } from "@ai-sdk/provider-utils-v5";
import { z } from "zod/v4";
import type {
  MixedbreadListStoresArgs,
  MixedbreadStoreGrepArgs,
  MixedbreadStoreListChunksArgs,
  MixedbreadStoreMetadataFacetsArgs,
  MixedbreadStoreSearchArgs,
} from "../provider/mixedbread-hosted-tools";

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

const storeScopedInputSchema = z.looseObject({
  metadata_filters: z.array(z.unknown()).nullish(),
  filter_mode: z.enum(["all", "any"]).nullish(),
  store: z.string().nullish(),
});

const storeSearch = createProviderExecutedToolFactory<
  z.infer<typeof storeScopedInputSchema> & { queries?: string[] },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreSearchArgs
>({
  id: "mixedbread.store_search",
  inputSchema: storeScopedInputSchema.extend({
    queries: z.array(z.string()).optional(),
  }),
  outputSchema: hostedToolCallOutputSchema,
});

const storeGrep = createProviderExecutedToolFactory<
  z.infer<typeof storeScopedInputSchema> & {
    pattern?: string;
    case_sensitive?: boolean;
  },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreGrepArgs
>({
  id: "mixedbread.store_grep",
  inputSchema: storeScopedInputSchema.extend({
    pattern: z.string().optional(),
    case_sensitive: z.boolean().optional(),
  }),
  outputSchema: hostedToolCallOutputSchema,
});

const storeListChunks = createProviderExecutedToolFactory<
  z.infer<typeof storeScopedInputSchema> & {
    rank_by?: string;
    direction?: "asc" | "desc";
  },
  z.infer<typeof hostedToolCallOutputSchema>,
  MixedbreadStoreListChunksArgs
>({
  id: "mixedbread.store_list_chunks",
  inputSchema: storeScopedInputSchema.extend({
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
