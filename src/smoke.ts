import { generateText, streamText } from "ai";
import { mixedbread } from "./provider/mixedbread-provider";

async function main() {
  const basic = await generateText({
    model: mixedbread("toast-1"),
    prompt: "In one sentence: what is a sourdough starter?",
  });
  console.log("generateText:", basic.text);
  console.log("usage:", basic.usage);
  console.log("providerMetadata:", basic.providerMetadata?.mixedbread);

  const streamed = streamText({
    model: mixedbread("toast-1"),
    prompt: "Count from one to five.",
  });
  process.stdout.write("streamText: ");
  for await (const delta of streamed.textStream) {
    process.stdout.write(delta);
  }
  process.stdout.write("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
