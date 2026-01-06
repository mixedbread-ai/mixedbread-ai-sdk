import { tool } from "ai";
import { z } from "zod";
import { Mixedbread } from "@mixedbread/sdk";

export type SearchToolOptions = {
  apiKey?: string;
  storeIdentifiers?: string[];
  topK?: number;
};

export const searchTool = ({
  apiKey = process.env.MIXEDBREAD_API_KEY,
  storeIdentifiers,
  topK = 5,
}: SearchToolOptions = {}) => {
  const client = new Mixedbread({ apiKey });

  return tool({
    description:
      "Search through documents in a Mixedbread knowledge base. Returns relevant chunks of text that match the query.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant documents"),
      storeIdentifiers: z
        .array(z.string())
        .optional()
        .describe(
          "Optional array of store IDs to search in. If not provided, uses the default stores configured in the tool."
        ),
      topK: z
        .number()
        .optional()
        .describe("Number of results to return (default: 5)"),
    }),
    execute: async (params) => {
      const { query, storeIdentifiers: queryStoreIds, topK: queryTopK } = params;
      const stores = queryStoreIds ?? storeIdentifiers;

      if (!stores || stores.length === 0) {
        throw new Error(
          "No store identifiers provided. Please provide storeIdentifiers either in the tool configuration or in the query."
        );
      }

      const results = await client.stores.search({
        query,
        store_identifiers: stores,
        top_k: queryTopK ?? topK,
      });

      return {
        query,
        results: results.data.map((chunk) => {
          let content: string;
          if ("text" in chunk && chunk.text) {
            content = chunk.text;
          } else if ("ocr_text" in chunk && chunk.ocr_text) {
            content = chunk.ocr_text;
          } else if ("summary" in chunk && chunk.summary) {
            content = chunk.summary;
          } else {
            content = `[${chunk.type ?? "unknown"} content]`;
          }
          return {
            content,
            score: chunk.score,
            metadata: chunk.metadata,
            fileId: chunk.file_id,
            filename: chunk.filename,
            type: chunk.type,
          };
        }),
        totalResults: results.data.length,
      };
    },
  });
};
