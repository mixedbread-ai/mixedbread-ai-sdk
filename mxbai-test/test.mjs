import { generateText } from "ai";
import { mixedbread } from "@mixedbread/ai-sdk-provider";

const { text, steps } = await generateText({
  model: mixedbread("toast-1"),
  prompt:
    "Find the SOC 2 Type 2 renewal thread in my Gmail. " +
    "Who sent it and what is the subject line?",
  tools: {
    // let the model discover which store to use...
    listStores: mixedbread.tools.listStores({ limit: 20 }),
    // ...then search it server-side
    storeSearch: mixedbread.tools.storeSearch({
      maxNumResults: 5,
      citations: true,
    }),
  },
});

// hosted tools execute inside the completion — they arrive as normal
// AI SDK tool calls marked providerExecuted: true
for (const step of steps ?? []) {
  for (const part of step.content ?? []) {
    if (part.type === "tool-call") {
      console.log(`→ ${part.toolName}`, JSON.stringify(part.input));
    }
  }
}

console.log("\n" + text);