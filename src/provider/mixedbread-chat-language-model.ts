import type {
  JSONObject,
  JSONValue,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  createToolNameMapping,
  generateId as generateIdDefault,
  isParsableJson,
  parseProviderOptions,
  postJsonToApi,
  type FetchFunction,
  type ParseResult,
  type ToolNameMapping,
} from "@ai-sdk/provider-utils";
import {
  mixedbreadChatChunkSchema,
  mixedbreadChatResponseSchema,
  type MixedbreadChatChunk,
  type MixedbreadHostedToolCall,
  type MixedbreadToolTicket,
} from "./mixedbread-api-types";
import { convertToMixedbreadMessages } from "./convert-to-mixedbread-messages";
import { getResponseMetadata } from "./get-response-metadata";
import {
  hostedToolTypeToToolName,
  mixedbreadProviderToolNames,
} from "./mixedbread-hosted-tools";
import { mixedbreadFailedResponseHandler } from "./mixedbread-error";
import {
  mixedbreadProviderOptions,
  type MixedbreadChatModelId,
} from "./mixedbread-chat-options";
import { mapMixedbreadFinishReason } from "./map-mixedbread-finish-reason";
import { prepareTools } from "./mixedbread-prepare-tools";

export type MixedbreadChatConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  generateId?: () => string;
};

const HOSTED_RESULT_FIELDS = [
  "type",
  "id",
  "status",
  "error",
  "reasoning_offset",
  "results",
  "stores",
  "facets",
  "has_more",
  "next_cursor",
];

function emptyUsage(): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: undefined,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
    raw: undefined,
  };
}

function convertUsage(
  usage: MixedbreadChatChunk["usage"] | undefined,
): LanguageModelV3Usage {
  if (usage == null) {
    return emptyUsage();
  }

  const promptTokens = usage.prompt_tokens ?? undefined;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? undefined;

  return {
    inputTokens: {
      total: promptTokens,
      noCache:
        promptTokens != null && cachedTokens != null
          ? promptTokens - cachedTokens
          : promptTokens,
      cacheRead: cachedTokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage.completion_tokens ?? undefined,
      text: usage.completion_tokens ?? undefined,
      reasoning: undefined,
    },
    raw: usage as unknown as JSONObject,
  };
}

function hostedToolCallInput(item: MixedbreadHostedToolCall): string {
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (HOSTED_RESULT_FIELDS.includes(key) || value == null) {
      continue;
    }
    input[key] = value;
  }
  return JSON.stringify(input);
}

function hostedToolName(
  item: MixedbreadHostedToolCall,
  toolNameMapping: ToolNameMapping,
): string {
  return toolNameMapping.toCustomToolName(
    hostedToolTypeToToolName[item.type] ?? item.type,
  );
}

export class MixedbreadChatLanguageModelBase {
  readonly modelId: MixedbreadChatModelId;
  readonly supportedUrls = {};

  private readonly config: MixedbreadChatConfig;

  constructor(modelId: MixedbreadChatModelId, config: MixedbreadChatConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private async getArgs(options: LanguageModelV3CallOptions): Promise<{
    args: Record<string, unknown>;
    warnings: SharedV3Warning[];
  }> {
    const warnings: SharedV3Warning[] = [];

    for (const setting of [
      "topK",
      "presencePenalty",
      "frequencyPenalty",
      "seed",
      "stopSequences",
    ] as const) {
      if (options[setting] != null) {
        warnings.push({ type: "unsupported", feature: setting });
      }
    }

    if (options.responseFormat?.type === "json") {
      warnings.push({
        type: "unsupported",
        feature: "responseFormat",
        details: "toast-1 does not support structured outputs",
      });
    }

    const providerOptions = await parseProviderOptions({
      provider: "mixedbread",
      providerOptions: options.providerOptions,
      schema: mixedbreadProviderOptions,
    });

    const {
      tools,
      toolChoice,
      toolWarnings,
    } = await prepareTools({
      tools: options.tools,
      toolChoice: options.toolChoice,
    });

    return {
      args: {
        model: this.modelId,
        messages: convertToMixedbreadMessages(options.prompt),
        temperature: options.temperature,
        top_p: options.topP,
        max_completion_tokens: options.maxOutputTokens,
        tools,
        tool_choice: toolChoice,
        store: providerOptions?.store,
        previous_completion_id: providerOptions?.previousCompletionId,
        terminal_tool_name: providerOptions?.terminalToolName,
        max_tool_calls: providerOptions?.maxToolCalls,
        parallel_tool_calls: providerOptions?.parallelToolCalls,
        metadata: providerOptions?.metadata,
        include: providerOptions?.include,
      },
      warnings: [...warnings, ...toolWarnings],
    };
  }

  private toolNameMapping(
    tools: LanguageModelV3CallOptions["tools"],
  ): ToolNameMapping {
    return createToolNameMapping({
      tools,
      providerToolNames: mixedbreadProviderToolNames,
    });
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const { args: body, warnings } = await this.getArgs(options);
    const toolNameMapping = this.toolNameMapping(options.tools);

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: mixedbreadFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        mixedbreadChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const choice = response.choices[0];
    const content: LanguageModelV3Content[] = [];

    const reasoning = choice?.message.reasoning_content ?? "";
    const hostedCalls = [...(response.hosted_tool_calls ?? [])].sort(
      (a, b) => (a.reasoning_offset ?? 0) - (b.reasoning_offset ?? 0),
    );

    let reasoningCursor = 0;
    for (const item of hostedCalls) {
      const offset = Math.min(
        Math.max(item.reasoning_offset ?? reasoning.length, reasoningCursor),
        reasoning.length,
      );
      if (offset > reasoningCursor) {
        content.push({
          type: "reasoning",
          text: reasoning.slice(reasoningCursor, offset),
        });
        reasoningCursor = offset;
      }

      const toolName = hostedToolName(item, toolNameMapping);
      content.push({
        type: "tool-call",
        toolCallId: item.id,
        toolName,
        input: hostedToolCallInput(item),
        providerExecuted: true,
      });
      content.push({
        type: "tool-result",
        toolCallId: item.id,
        toolName,
        result: item as unknown as JSONObject,
        isError: item.status === "failed",
      });
    }

    if (reasoningCursor < reasoning.length) {
      content.push({ type: "reasoning", text: reasoning.slice(reasoningCursor) });
    }

    if (choice?.message.content) {
      content.push({ type: "text", text: choice.message.content });
    }

    for (const toolCall of choice?.message.tool_calls ?? []) {
      content.push({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        input: toolCall.function.arguments,
      });
    }

    return {
      content,
      finishReason: mapMixedbreadFinishReason(choice?.finish_reason),
      usage: convertUsage(response.usage),
      providerMetadata: this.providerMetadata({
        completionId: response.id,
        title: response.title,
        toolTickets: response.tool_tickets,
      }),
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const { args, warnings } = await this.getArgs(options);
    const body = { ...args, stream: true };
    const toolNameMapping = this.toolNameMapping(options.tools);
    const providerMetadata = this.providerMetadata.bind(this);
    const generateId = this.config.generateId ?? generateIdDefault;

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: mixedbreadFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        mixedbreadChatChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    type StreamedToolCall = {
      id: string;
      name: string;
      arguments: string;
      hasFinished: boolean;
    };

    let finishReason: LanguageModelV3FinishReason = {
      unified: "other",
      raw: undefined,
    };
    let usage = emptyUsage();
    let isFirstChunk = true;
    let sawFinishReason = false;
    let isActiveText = false;
    let isActiveReasoning = false;
    let reasoningBlock = 0;
    let completionId: string | null | undefined;
    let title: string | null | undefined;
    let toolTickets: MixedbreadToolTicket[] | null | undefined;

    const toolCalls: StreamedToolCall[] = [];
    const hostedResults = new Set<string>();
    const hostedCalls = new Set<string>();

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<MixedbreadChatChunk>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings });
          },

          transform(chunk, controller) {
            if (options.includeRawChunks === true) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }

            if (!chunk.success) {
              finishReason = { unified: "error", raw: undefined };
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }

            const value = chunk.value;

            if (isFirstChunk) {
              isFirstChunk = false;
              completionId = value.id;
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value),
              });
            }

            if (value.title != null) {
              title = value.title;
            }

            if (value.tool_tickets != null) {
              toolTickets = value.tool_tickets;
            }

            if (value.usage != null) {
              usage = convertUsage(value.usage);
            }

            for (const item of value.hosted_tool_calls ?? []) {
              const toolName = hostedToolName(item, toolNameMapping);

              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: `reasoning-${reasoningBlock}`,
                });
                isActiveReasoning = false;
                reasoningBlock++;
              }

              if (!hostedCalls.has(item.id)) {
                hostedCalls.add(item.id);
                const input = hostedToolCallInput(item);
                controller.enqueue({
                  type: "tool-input-start",
                  id: item.id,
                  toolName,
                  providerExecuted: true,
                });
                controller.enqueue({
                  type: "tool-input-delta",
                  id: item.id,
                  delta: input,
                });
                controller.enqueue({ type: "tool-input-end", id: item.id });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: item.id,
                  toolName,
                  input,
                  providerExecuted: true,
                });
              }

              if (
                (item.status === "completed" || item.status === "failed") &&
                !hostedResults.has(item.id)
              ) {
                hostedResults.add(item.id);
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: item.id,
                  toolName,
                  result: item as unknown as JSONObject,
                  isError: item.status === "failed",
                });
              }
            }

            const choice = value.choices?.[0];
            if (choice == null) {
              return;
            }

            if (choice.finish_reason != null) {
              sawFinishReason = true;
              finishReason = mapMixedbreadFinishReason(choice.finish_reason);
            }

            const delta = choice.delta;
            if (delta == null) {
              return;
            }

            if (delta.reasoning_content) {
              if (!isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-start",
                  id: `reasoning-${reasoningBlock}`,
                });
                isActiveReasoning = true;
              }
              controller.enqueue({
                type: "reasoning-delta",
                id: `reasoning-${reasoningBlock}`,
                delta: delta.reasoning_content,
              });
            }

            if (delta.content) {
              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: `reasoning-${reasoningBlock}`,
                });
                isActiveReasoning = false;
                reasoningBlock++;
              }
              if (!isActiveText) {
                controller.enqueue({ type: "text-start", id: "txt-0" });
                isActiveText = true;
              }
              controller.enqueue({
                type: "text-delta",
                id: "txt-0",
                delta: delta.content,
              });
            }

            for (const toolCallDelta of delta.tool_calls ?? []) {
              const index = toolCallDelta.index;

              if (toolCalls[index] == null) {
                toolCalls[index] = {
                  id: toolCallDelta.id ?? generateId(),
                  name: toolCallDelta.function.name ?? "",
                  arguments: toolCallDelta.function.arguments ?? "",
                  hasFinished: false,
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: toolCalls[index].id,
                  toolName: toolCalls[index].name,
                });
                if (toolCalls[index].arguments.length > 0) {
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: toolCalls[index].id,
                    delta: toolCalls[index].arguments,
                  });
                }
              } else {
                const toolCall = toolCalls[index];
                if (toolCall.hasFinished) {
                  continue;
                }
                if (toolCallDelta.function.arguments != null) {
                  toolCall.arguments += toolCallDelta.function.arguments;
                  controller.enqueue({
                    type: "tool-input-delta",
                    id: toolCall.id,
                    delta: toolCallDelta.function.arguments,
                  });
                }
              }

              const toolCall = toolCalls[index];
              if (
                toolCall.name.length > 0 &&
                toolCall.arguments.length > 0 &&
                isParsableJson(toolCall.arguments)
              ) {
                controller.enqueue({ type: "tool-input-end", id: toolCall.id });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: toolCall.id,
                  toolName: toolCall.name,
                  input: toolCall.arguments,
                });
                toolCall.hasFinished = true;
              }
            }
          },

          flush(controller) {
            if (isActiveReasoning) {
              controller.enqueue({
                type: "reasoning-end",
                id: `reasoning-${reasoningBlock}`,
              });
            }

            if (isActiveText) {
              controller.enqueue({ type: "text-end", id: "txt-0" });
            }

            for (const toolCall of toolCalls.filter(
              (candidate) => candidate != null && !candidate.hasFinished,
            )) {
              controller.enqueue({ type: "tool-input-end", id: toolCall.id });
              controller.enqueue({
                type: "tool-call",
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                input: toolCall.arguments,
              });
            }

            if (!sawFinishReason && finishReason.unified !== "error") {
              finishReason = { unified: "error", raw: undefined };
              controller.enqueue({
                type: "error",
                error: new Error(
                  "Mixedbread completion stream ended before the model finished",
                ),
              });
            }

            controller.enqueue({
              type: "finish",
              finishReason,
              usage,
              providerMetadata: providerMetadata({
                completionId,
                title,
                toolTickets,
              }),
            });
          },
        }),
      ),
      request: { body },
      response: { headers: responseHeaders },
    };
  }

  private providerMetadata({
    completionId,
    title,
    toolTickets,
  }: {
    completionId?: string | null;
    title?: string | null;
    toolTickets?: MixedbreadToolTicket[] | null;
  }): SharedV3ProviderMetadata {
    return {
      mixedbread: {
        completionId: completionId ?? null,
        title: title ?? null,
        toolTickets: (toolTickets ?? null) as unknown as JSONValue,
      },
    };
  }
}

export class MixedbreadChatLanguageModel
  extends MixedbreadChatLanguageModelBase
  implements LanguageModelV3
{
  readonly specificationVersion = "v3" as const;
}
