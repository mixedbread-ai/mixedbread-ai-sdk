import { generateText } from "ai";
import { mixedbread } from "@mixedbread/ai-sdk-provider";

const { text, usage, providerMetadata } = await generateText({
  model: mixedbread("toast-1"),
  prompt: "In one sentence: what is a sourdough starter?",
});

console.log(text);
console.log("usage:", usage);
console.log("providerMetadata:", providerMetadata?.mixedbread);
