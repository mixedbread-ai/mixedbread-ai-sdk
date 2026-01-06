import { tool } from "ai";
import { z } from "zod";
import { Mixedbread } from "@mixedbread/sdk";

export type IngestToolOptions = {
  apiKey?: string;
  storeIdentifier?: string;
};

export const ingestTool = ({
  apiKey = process.env.MIXEDBREAD_API_KEY,
  storeIdentifier,
}: IngestToolOptions = {}) => {
  const client = new Mixedbread({ apiKey });

  return tool({
    description:
      "Ingest text content into a Mixedbread knowledge base. The content will be processed and made searchable.",
    inputSchema: z.object({
      content: z
        .string()
        .describe("The text content to ingest into the knowledge base"),
      filename: z
        .string()
        .optional()
        .describe(
          "Optional filename for the content (default: 'content.txt')"
        ),
      storeIdentifier: z
        .string()
        .optional()
        .describe(
          "Optional store ID to ingest into. If not provided, uses the default store configured in the tool."
        ),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe("Optional metadata to attach to the ingested content"),
    }),
    execute: async (params) => {
      const {
        content,
        filename = "content.txt",
        storeIdentifier: queryStoreId,
        metadata,
      } = params;
      const store = queryStoreId ?? storeIdentifier;

      if (!store) {
        throw new Error(
          "No store identifier provided. Please provide storeIdentifier either in the tool configuration or in the query."
        );
      }

      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], filename, { type: "text/plain" });

      const result = await client.stores.files.uploadAndPoll({
        storeIdentifier: store,
        file,
        body: metadata ? { metadata } : undefined,
      });

      return {
        success: true,
        fileId: result.id,
        filename: result.filename,
        status: result.status,
        storeIdentifier: store,
      };
    },
  });
};
