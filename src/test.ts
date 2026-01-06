import { generateText, generateObject } from "ai";
import { searchTool, ingestTool } from "./index";

// Example usage - replace with your actual model and store configuration
async function main() {
  const storeId = process.env.MIXEDBREAD_STORE_ID;

  if (!storeId) {
    console.error("Please set MIXEDBREAD_STORE_ID environment variable");
    process.exit(1);
  }

  // Test search tool
  console.log("Testing search tool...");
  const search = searchTool({
    storeIdentifiers: [storeId],
    topK: 3,
  });

  // Manually execute the search tool for testing
  const searchResult = await search.execute(
    { query: "What are the key features?" },
    { toolCallId: "test", messages: [] }
  );
  console.log("Search results:", JSON.stringify(searchResult, null, 2));

  // Test ingest tool
  console.log("\nTesting ingest tool...");
  const ingest = ingestTool({
    storeIdentifier: storeId,
  });

  const ingestResult = await ingest.execute(
    {
      content: "This is a test document for the AI SDK integration.",
      filename: "test-document.txt",
      metadata: { source: "ai-sdk-test" },
    },
    { toolCallId: "test", messages: [] }
  );
  console.log("Ingest result:", JSON.stringify(ingestResult, null, 2));
}

main().catch(console.error);
