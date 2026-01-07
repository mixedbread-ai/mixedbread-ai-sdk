// This example shows how to use a persistent scratchpad agent to research the internet
// and the mixedbread store.

import { generateText, stepCountIs } from "ai";
import { searchTool, ingestTool, webSearchTool } from "@mixedbread/ai-sdk";

const storeIdentifier = "scratchpad";

const PROMPT = `
You are a helpful assistant that can search and ingest into the ${storeIdentifier}
Mixedbread store.

Your task is to deep research the internet and the mixedbread ${storeIdentifier} store
about the "advantages of the NVIDIA rubin platform compared to the blackwell
platform". Then ingest the information into the mixedbread ${storeIdentifier} store.

Use multiple sources and different pages and perspectives to answer the question.
Clearly cite the sources and pages you used to answer the question.
`;

const { text } = await generateText({
  model: "gpt-5.2",
  prompt: PROMPT,
  tools: {
    search: searchTool({
      storeIdentifiers: [storeIdentifier],
      topK: 5,
    }),
    ingest: ingestTool({
      storeIdentifier: storeIdentifier,
    }),
    webSearch: webSearchTool({
      topK: 5,
    }),
  },
  stopWhen: stepCountIs(30),
});

console.log(text);