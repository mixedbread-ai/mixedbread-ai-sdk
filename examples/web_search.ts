// This example shows how to use the web search tool to search the internet.

import { generateText, stepCountIs } from "ai";
import { webSearchTool } from "@mixedbread/ai-sdk";

const PROMPT = `
Search for information about the "advantages of the NVIDIA rubin platform compared to the blackwell platform".
`;

const { text } = await generateText({
  model: "gpt-5.2",
  prompt: PROMPT,
  tools: {
    webSearch: webSearchTool({
      topK: 5,
    }),
  },
  stopWhen: stepCountIs(30),
});

console.log(text);
