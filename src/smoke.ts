import { generateText, streamText } from "ai";
import { mixedbread } from "./provider/mixedbread-provider";

const storeId = process.env.MIXEDBREAD_STORE_ID;

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

  if (storeId == null) {
    console.log("MIXEDBREAD_STORE_ID not set, skipping the hosted store search");
    return;
  }

  const grounded = await generateText({
    model: mixedbread("toast-1"),
    prompt: "What does this store contain? Cite your sources.",
    tools: {
      storeSearch: mixedbread.tools.storeSearch({
        storeIdentifiers: [storeId],
        maxNumResults: 5,
        citations: true,
      }),
    },
  });
  console.log("grounded:", grounded.text);
  for (const call of grounded.staticToolCalls) {
    console.log("hosted call:", call.toolName, JSON.stringify(call.input));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
