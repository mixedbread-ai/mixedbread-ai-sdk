import type { FetchFunction } from "@ai-sdk/provider-utils";
import { generateText, streamText } from "ai";
import { describe, expect, it } from "vitest";
import { createMixedbread } from "./mixedbread-provider";

const completion = {
  id: "cmpl_1",
  created: 1_700_000_000,
  model: "toast-1",
  choices: [
    {
      message: {
        role: "assistant",
        content: "Sourdough.",
        reasoning_content: "Checking the store.",
      },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
  title: "Bread question",
  hosted_tool_calls: [
    {
      type: "store_search_call",
      id: "srch_1",
      status: "completed",
      queries: ["bread"],
      reasoning_offset: 19,
      results: [{ chunk_index: 0, text: "Sourdough is a bread." }],
    },
  ],
};

const jsonFetch: FetchFunction = async () =>
  new Response(JSON.stringify(completion), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function sseFetch(events: unknown[]): FetchFunction {
  return async () => {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const event of events) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  };
}

describe("ai@7 (spec v4)", () => {
  const mixedbread = createMixedbread({ apiKey: "test-key", fetch: jsonFetch });

  it("generates text through generateText", async () => {
    const result = await generateText({
      model: mixedbread("toast-1"),
      prompt: "Which bread?",
    });

    expect(mixedbread("toast-1").specificationVersion).toBe("v4");
    expect(result.text).toBe("Sourdough.");
    expect(result.reasoningText).toBe("Checking the store.");
    expect(result.usage.inputTokens).toBe(12);
    expect(result.dynamicToolCalls.map((call) => call.toolName)).toStrictEqual([
      "store_search",
    ]);
    expect(result.providerMetadata?.mixedbread.title).toBe("Bread question");
  });

  it("streams text through streamText", async () => {
    const streaming = createMixedbread({
      apiKey: "test-key",
      fetch: sseFetch([
        { id: "cmpl_1", model: "toast-1", choices: [{ index: 0, delta: { role: "assistant", content: "" } }] },
        { id: "cmpl_1", model: "toast-1", choices: [{ index: 0, delta: { content: "Sour" } }] },
        { id: "cmpl_1", model: "toast-1", choices: [{ index: 0, delta: { content: "dough." } }] },
        { id: "cmpl_1", model: "toast-1", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
        { id: "cmpl_1", model: "toast-1", choices: [], usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 } },
      ]),
    });

    const result = streamText({
      model: streaming("toast-1"),
      prompt: "Which bread?",
    });

    const chunks: string[] = [];
    for await (const delta of result.textStream) {
      chunks.push(delta);
    }

    expect(chunks.join("")).toBe("Sourdough.");
    expect(await result.finishReason).toBe("stop");
  });
});

describe("default tools", () => {
  it("sends no tools when none are declared", async () => {
    let body: Record<string, unknown> | undefined;
    const capture: FetchFunction = async (url, init) => {
      body = JSON.parse(String(init?.body));
      return jsonFetch(url, init);
    };
    const mixedbread = createMixedbread({ apiKey: "test-key", fetch: capture });

    await generateText({ model: mixedbread("toast-1"), prompt: "Which bread?" });

    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
  });
});

describe("toolTickets", () => {
  it("is null for both an empty array and an absent field", async () => {
    const empty: FetchFunction = async () =>
      new Response(JSON.stringify({ ...completion, tool_tickets: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const mixedbread = createMixedbread({ apiKey: "test-key", fetch: empty });
    const withEmpty = await generateText({
      model: mixedbread("toast-1"),
      prompt: "Which bread?",
    });
    expect(withEmpty.providerMetadata?.mixedbread.toolTickets).toBeNull();

    const absent = createMixedbread({ apiKey: "test-key", fetch: jsonFetch });
    const withAbsent = await generateText({
      model: absent("toast-1"),
      prompt: "Which bread?",
    });
    expect(withAbsent.providerMetadata?.mixedbread.toolTickets).toBeNull();
  });
});
