import type {
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createMixedbread } from "./mixedbread-provider";

const prompt: LanguageModelV4Prompt = [
  { role: "user", content: [{ type: "text", text: "What is in the store?" }] },
];

let lastRequest: { url: string; body: any; headers: Record<string, string> };

function jsonFetch(body: unknown, status = 200): FetchFunction {
  return async (input, init) => {
    lastRequest = {
      url: String(input),
      body: JSON.parse(String(init?.body)),
      headers: init?.headers as Record<string, string>,
    };
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

function sseFetch(events: unknown[]): FetchFunction {
  return async (input, init) => {
    lastRequest = {
      url: String(input),
      body: JSON.parse(String(init?.body)),
      headers: init?.headers as Record<string, string>,
    };
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
}

async function collect(
  stream: ReadableStream<LanguageModelV4StreamPart>,
): Promise<LanguageModelV4StreamPart[]> {
  const parts: LanguageModelV4StreamPart[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    parts.push(value);
  }
  return parts;
}

function provider(fetch: FetchFunction) {
  return createMixedbread({ apiKey: "test-key", fetch });
}

beforeEach(() => {
  lastRequest = undefined as never;
});

describe("doGenerate", () => {
  it("posts to the chat completions endpoint with the model and messages", async () => {
    const model = provider(
      jsonFetch({
        id: "cmpl_1",
        created: 1_700_000_000,
        model: "toast-1",
        choices: [
          { message: { role: "assistant", content: "Hello" }, finish_reason: "stop" },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
          prompt_tokens_details: { cached_tokens: 6 },
        },
      }),
    )("toast-1");

    const result = await model.doGenerate({ prompt, temperature: 0.2 });

    expect(lastRequest.url).toBe("https://api.mixedbread.com/v1/chat/completions");
    expect(lastRequest.headers.authorization).toBe("Bearer test-key");
    expect(lastRequest.body).toStrictEqual({
      model: "toast-1",
      messages: [{ role: "user", content: "What is in the store?" }],
      temperature: 0.2,
    });

    expect(result.content).toStrictEqual([{ type: "text", text: "Hello" }]);
    expect(result.finishReason).toStrictEqual({ unified: "stop", raw: "stop" });
    expect(result.usage.inputTokens).toStrictEqual({
      total: 10,
      noCache: 4,
      cacheRead: 6,
      cacheWrite: undefined,
    });
    expect(result.usage.outputTokens.total).toBe(4);
    expect(result.response?.id).toBe("cmpl_1");
    expect(result.response?.timestamp).toStrictEqual(new Date(1_700_000_000_000));
  });

  it("defaults the model id to toast-1", async () => {
    const model = provider(
      jsonFetch({ choices: [{ message: { content: "hi" }, finish_reason: "stop" }] }),
    )();

    await model.doGenerate({ prompt });

    expect(model.modelId).toBe("toast-1");
    expect(lastRequest.body.model).toBe("toast-1");
  });

  it("maps mixedbread provider options onto the request", async () => {
    const model = provider(
      jsonFetch({ choices: [{ message: { content: "hi" }, finish_reason: "stop" }] }),
    )("toast-1");

    await model.doGenerate({
      prompt,
      maxOutputTokens: 256,
      topP: 0.9,
      providerOptions: {
        mixedbread: {
          store: false,
          previousCompletionId: "cmpl_prev",
          maxToolCalls: 3,
          parallelToolCalls: false,
          include: ["store_search_call.results"],
          metadata: { thread: "abc" },
          terminalToolName: "submit",
        },
      },
    });

    expect(lastRequest.body).toMatchObject({
      max_completion_tokens: 256,
      top_p: 0.9,
      store: false,
      previous_completion_id: "cmpl_prev",
      max_tool_calls: 3,
      parallel_tool_calls: false,
      include: ["store_search_call.results"],
      metadata: { thread: "abc" },
      terminal_tool_name: "submit",
    });
  });

  it("warns about settings toast-1 does not support", async () => {
    const model = provider(
      jsonFetch({ choices: [{ message: { content: "hi" }, finish_reason: "stop" }] }),
    )("toast-1");

    const result = await model.doGenerate({ prompt, topK: 5, seed: 1 });

    expect(result.warnings).toStrictEqual([
      { type: "unsupported", feature: "topK" },
      { type: "unsupported", feature: "seed" },
    ]);
  });

  it("sends function tools and returns tool calls", async () => {
    const model = provider(
      jsonFetch({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  function: { name: "getWeather", arguments: '{"city":"Berlin"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        tool_tickets: [
          { tool_call_id: "call_1", ticket: "tkt_1", expires_at: 1_700_000_100 },
        ],
      }),
    )("toast-1");

    const result = await model.doGenerate({
      prompt,
      tools: [
        {
          type: "function",
          name: "getWeather",
          description: "Get the weather",
          inputSchema: { type: "object", properties: { city: { type: "string" } } },
        },
      ],
      toolChoice: { type: "tool", toolName: "getWeather" },
    });

    expect(lastRequest.body.tools).toStrictEqual([
      {
        type: "function",
        function: {
          name: "getWeather",
          description: "Get the weather",
          parameters: { type: "object", properties: { city: { type: "string" } } },
        },
      },
    ]);
    expect(lastRequest.body.tool_choice).toStrictEqual({
      type: "function",
      function: { name: "getWeather" },
    });
    expect(result.content).toStrictEqual([
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "getWeather",
        input: '{"city":"Berlin"}',
      },
    ]);
    expect(result.finishReason).toStrictEqual({
      unified: "tool-calls",
      raw: "tool_calls",
    });
    expect(result.providerMetadata?.mixedbread.toolTickets).toStrictEqual([
      { tool_call_id: "call_1", ticket: "tkt_1", expires_at: 1_700_000_100 },
    ]);
  });

  it("declares hosted store tools and reports their executions", async () => {
    const mixedbread = provider(
      jsonFetch({
        choices: [
          {
            message: {
              content: "It has three files.",
              reasoning_content: "Let me look.Found them.",
            },
            finish_reason: "stop",
          },
        ],
        hosted_tool_calls: [
          {
            type: "store_search_call",
            id: "srch_1",
            status: "completed",
            queries: ["files"],
            store: "docs",
            reasoning_offset: 12,
            results: [{ chunk_index: 0 }],
          },
        ],
      }),
    );

    const result = await mixedbread("toast-1").doGenerate({
      prompt,
      tools: [
        {
          type: "provider",
          id: "mixedbread.store_search",
          name: "storeSearch",
          args: { storeIdentifiers: ["docs"], maxNumResults: 5, citations: true },
        },
      ],
      toolChoice: { type: "tool", toolName: "storeSearch" },
    });

    expect(lastRequest.body.tools).toStrictEqual([
      {
        type: "store_search",
        store_identifiers: ["docs"],
        max_num_results: 5,
        citations: true,
      },
    ]);
    expect(lastRequest.body.tool_choice).toStrictEqual({ type: "store_search" });

    expect(result.content).toStrictEqual([
      { type: "reasoning", text: "Let me look." },
      {
        type: "tool-call",
        toolCallId: "srch_1",
        toolName: "storeSearch",
        input: '{"queries":["files"],"store":"docs"}',
        providerExecuted: true,
      },
      {
        type: "tool-result",
        toolCallId: "srch_1",
        toolName: "storeSearch",
        result: expect.objectContaining({ id: "srch_1", status: "completed" }),
        isError: false,
      },
      { type: "reasoning", text: "Found them." },
      { type: "text", text: "It has three files." },
    ]);
  });

  it("rejects file parts", async () => {
    const model = provider(jsonFetch({ choices: [] }))("toast-1");

    await expect(
      model.doGenerate({
        prompt: [
          {
            role: "user",
            content: [
              { type: "file", data: "aGk=", mediaType: "image/png" } as never,
            ],
          },
        ],
      }),
    ).rejects.toThrow(/file parts/);
  });

  it("surfaces api errors", async () => {
    const model = provider(
      jsonFetch(
        { type: "unprocessable_entity_error", code: "invalid_content", message: "bad" },
        422,
      ),
    )("toast-1");

    await expect(model.doGenerate({ prompt })).rejects.toThrow("bad");
  });
});

describe("doStream", () => {
  it("maps reasoning, hosted calls, text and usage", async () => {
    const model = provider(
      sseFetch([
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [{ index: 0, delta: { role: "assistant", content: "" } }],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [{ index: 0, delta: { reasoning_content: "Searching" } }],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          hosted_tool_calls: [
            {
              type: "store_search_call",
              id: "srch_1",
              status: "in_progress",
              queries: ["files"],
            },
          ],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          hosted_tool_calls: [
            {
              type: "store_search_call",
              id: "srch_1",
              status: "completed",
              queries: ["files"],
              results: [],
            },
          ],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [{ index: 0, delta: { content: "Three" } }],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [{ index: 0, delta: { content: " files." } }],
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          title: "Store contents",
        },
        {
          id: "cmpl_1",
          created: 1_700_000_000,
          model: "toast-1",
          choices: [],
          usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
        },
      ]),
    )("toast-1");

    const { stream } = await model.doStream({
      prompt,
      tools: [
        {
          type: "provider",
          id: "mixedbread.store_search",
          name: "store_search",
          args: {},
        },
      ],
    });
    const parts = await collect(stream);

    expect(lastRequest.body.stream).toBe(true);
    expect(parts.map((part) => part.type)).toStrictEqual([
      "stream-start",
      "response-metadata",
      "reasoning-start",
      "reasoning-delta",
      "reasoning-end",
      "tool-input-start",
      "tool-input-delta",
      "tool-input-end",
      "tool-call",
      "tool-result",
      "text-start",
      "text-delta",
      "text-delta",
      "text-end",
      "finish",
    ]);

    const finish = parts.at(-1) as Extract<
      LanguageModelV4StreamPart,
      { type: "finish" }
    >;
    expect(finish.finishReason).toStrictEqual({ unified: "stop", raw: "stop" });
    expect(finish.usage.inputTokens.total).toBe(8);
    expect(finish.providerMetadata?.mixedbread).toStrictEqual({
      completionId: "cmpl_1",
      title: "Store contents",
      toolTickets: null,
    });
  });

  it("emits a tool call once the arguments are complete", async () => {
    const model = provider(
      sseFetch([
        {
          id: "cmpl_2",
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_1",
                    type: "function",
                    function: { name: "getWeather", arguments: '{"city":"Berlin"}' },
                  },
                ],
              },
            },
          ],
          tool_tickets: [
            { tool_call_id: "call_1", ticket: "tkt_1", expires_at: 1 },
          ],
        },
        { id: "cmpl_2", choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
      ]),
    )("toast-1");

    const { stream } = await model.doStream({ prompt });
    const parts = await collect(stream);

    expect(parts.map((part) => part.type)).toStrictEqual([
      "stream-start",
      "response-metadata",
      "tool-input-start",
      "tool-input-delta",
      "tool-input-end",
      "tool-call",
      "finish",
    ]);
    expect(parts[5]).toStrictEqual({
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "getWeather",
      input: '{"city":"Berlin"}',
    });
  });
  it("reports a stream that ends before the model finished", async () => {
    const model = provider(
      sseFetch([
        { id: "cmpl_3", choices: [{ index: 0, delta: { content: "Half" } }] },
      ]),
    )("toast-1");

    const { stream } = await model.doStream({ prompt });
    const parts = await collect(stream);

    expect(parts.map((part) => part.type)).toStrictEqual([
      "stream-start",
      "response-metadata",
      "text-start",
      "text-delta",
      "text-end",
      "error",
      "finish",
    ]);
    const finish = parts.at(-1) as Extract<
      LanguageModelV4StreamPart,
      { type: "finish" }
    >;
    expect(finish.finishReason.unified).toBe("error");
  });
});
