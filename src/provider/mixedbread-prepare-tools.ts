import type {
  LanguageModelV3CallOptions,
  SharedV3Warning,
} from "@ai-sdk/provider";
import { validateTypes } from "@ai-sdk/provider-utils";
import { z } from "zod/v4";

const storeScopedArgsSchema = z.object({
  storeIdentifiers: z.array(z.string()).optional(),
  maxNumResults: z.number().optional(),
  filters: z.unknown().optional(),
  citations: z.boolean().optional(),
});

const storeSearchArgsSchema = storeScopedArgsSchema.extend({
  scoreThreshold: z.number().optional(),
});

const metadataFacetsArgsSchema = z.object({
  storeIdentifiers: z.array(z.string()).optional(),
  filters: z.unknown().optional(),
  maxValuesPerField: z.number().optional(),
});

const listStoresArgsSchema = z.object({
  limit: z.number().optional(),
});

export type MixedbreadWireTool = Record<string, unknown>;

export type MixedbreadWireToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } }
  | { type: string };

const toolIdToChoiceType: Record<string, string> = {
  "mixedbread.store_search": "store_search",
  "mixedbread.store_grep": "store_grep",
  "mixedbread.store_list_chunks": "store_list_chunks",
  "mixedbread.store_metadata_facets": "store_metadata_facets",
  "mixedbread.list_stores": "list_stores",
};

export async function prepareTools({
  tools,
  toolChoice,
}: {
  tools: LanguageModelV3CallOptions["tools"];
  toolChoice: LanguageModelV3CallOptions["toolChoice"];
}): Promise<{
  tools: MixedbreadWireTool[] | undefined;
  toolChoice: MixedbreadWireToolChoice | undefined;
  toolWarnings: SharedV3Warning[];
}> {
  const toolWarnings: SharedV3Warning[] = [];

  if (tools == null || tools.length === 0) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const wireTools: MixedbreadWireTool[] = [];

  for (const tool of tools) {
    if (tool.type === "function") {
      wireTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: tool.strict,
        },
      });
      continue;
    }

    switch (tool.id) {
      case "mixedbread.store_search": {
        const args = await validateTypes({
          value: tool.args,
          schema: storeSearchArgsSchema,
        });
        wireTools.push({
          type: "store_search",
          store_identifiers: args.storeIdentifiers,
          max_num_results: args.maxNumResults,
          filters: args.filters,
          score_threshold: args.scoreThreshold,
          citations: args.citations,
        });
        break;
      }
      case "mixedbread.store_grep": {
        const args = await validateTypes({
          value: tool.args,
          schema: storeScopedArgsSchema,
        });
        wireTools.push({
          type: "store_grep",
          store_identifiers: args.storeIdentifiers,
          max_num_results: args.maxNumResults,
          filters: args.filters,
          citations: args.citations,
        });
        break;
      }
      case "mixedbread.store_list_chunks": {
        const args = await validateTypes({
          value: tool.args,
          schema: storeScopedArgsSchema,
        });
        wireTools.push({
          type: "store_list_chunks",
          store_identifiers: args.storeIdentifiers,
          max_num_results: args.maxNumResults,
          filters: args.filters,
          citations: args.citations,
        });
        break;
      }
      case "mixedbread.store_metadata_facets": {
        const args = await validateTypes({
          value: tool.args,
          schema: metadataFacetsArgsSchema,
        });
        wireTools.push({
          type: "store_metadata_facets",
          store_identifiers: args.storeIdentifiers,
          filters: args.filters,
          max_values_per_field: args.maxValuesPerField,
        });
        break;
      }
      case "mixedbread.list_stores": {
        const args = await validateTypes({
          value: tool.args,
          schema: listStoresArgsSchema,
        });
        wireTools.push({
          type: "list_stores",
          limit: args.limit,
        });
        break;
      }
      default: {
        toolWarnings.push({
          type: "unsupported",
          feature: `tool ${tool.id}`,
        });
      }
    }
  }

  if (toolChoice == null) {
    return {
      tools: wireTools.length > 0 ? wireTools : undefined,
      toolChoice: undefined,
      toolWarnings,
    };
  }

  switch (toolChoice.type) {
    case "auto":
    case "none":
    case "required":
      return {
        tools: wireTools.length > 0 ? wireTools : undefined,
        toolChoice: toolChoice.type,
        toolWarnings,
      };
    case "tool": {
      const selected = tools.find((tool) => tool.name === toolChoice.toolName);
      const choiceType =
        selected?.type === "provider" ? toolIdToChoiceType[selected.id] : undefined;
      return {
        tools: wireTools.length > 0 ? wireTools : undefined,
        toolChoice:
          choiceType != null
            ? { type: choiceType }
            : { type: "function", function: { name: toolChoice.toolName } },
        toolWarnings,
      };
    }
  }
}
