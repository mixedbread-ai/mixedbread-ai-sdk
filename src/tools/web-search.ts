import { tool } from "ai";
import { z } from "zod";
import { Mixedbread } from "@mixedbread/sdk";

export type WebSearchToolOptions = {
  apiKey?: string;
  topK?: number;
};

export const webSearchTool = ({
  apiKey = process.env.MIXEDBREAD_API_KEY,
  topK = 5,
}: WebSearchToolOptions = {}) => {
  const client = new Mixedbread({ apiKey });

  return tool({
    description:
      "Search the internet using Mixedbread's web search. Returns relevant web pages and content that match the query.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information on the web"),
      topK: z
        .number()
        .optional()
        .describe("Number of results to return (default: 5)"),
    }),
    execute: async (params) => {
      const { query, topK: queryTopK } = params;

      const results = await client.stores.search({
        query,
        store_identifiers: ["mixedbread/web"],
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
            filename: chunk.filename,
            type: chunk.type,
          };
        }),
        totalResults: results.data.length,
      };
    },
  });
};
