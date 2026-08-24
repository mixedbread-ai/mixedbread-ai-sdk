import { UnsupportedFunctionalityError } from "@ai-sdk/provider";
import type {
  LanguageModelV4Prompt,
  LanguageModelV4ToolResultOutput,
} from "@ai-sdk/provider";

export type MixedbreadMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      reasoning_content?: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

function toolResultOutputToText(output: LanguageModelV4ToolResultOutput): string {
  switch (output.type) {
    case "text":
    case "error-text":
      return output.value;
    case "json":
    case "error-json":
      return JSON.stringify(output.value);
    case "execution-denied":
      return JSON.stringify({
        error: "execution denied",
        ...(output.reason != null ? { reason: output.reason } : {}),
      });
    case "content":
      return output.value
        .map((part) => (part.type === "text" ? part.text : JSON.stringify(part)))
        .join("\n");
  }
}

export function convertToMixedbreadMessages(
  prompt: LanguageModelV4Prompt,
): MixedbreadMessage[] {
  const messages: MixedbreadMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case "system": {
        messages.push({ role: "system", content: message.content });
        break;
      }

      case "user": {
        const text = message.content
          .map((part) => {
            if (part.type === "text") {
              return part.text;
            }
            throw new UnsupportedFunctionalityError({
              functionality: `file parts (${part.mediaType})`,
            });
          })
          .join("\n");
        messages.push({ role: "user", content: text });
        break;
      }

      case "assistant": {
        const text: string[] = [];
        const reasoning: string[] = [];
        const toolCalls: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }> = [];

        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              text.push(part.text);
              break;
            }
            case "reasoning": {
              reasoning.push(part.text);
              break;
            }
            case "tool-call": {
              if (part.providerExecuted === true) {
                break;
              }
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input ?? {}),
                },
              });
              break;
            }
            case "tool-result": {
              break;
            }
            case "file": {
              throw new UnsupportedFunctionalityError({
                functionality: `assistant file parts (${part.mediaType})`,
              });
            }
          }
        }

        const content = text.length > 0 ? text.join("") : null;
        if (content == null && reasoning.length === 0 && toolCalls.length === 0) {
          break;
        }

        messages.push({
          role: "assistant",
          content,
          ...(reasoning.length > 0 ? { reasoning_content: reasoning.join("") } : {}),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
        break;
      }

      case "tool": {
        for (const part of message.content) {
          if (part.type !== "tool-result") {
            throw new UnsupportedFunctionalityError({
              functionality: "tool approval responses",
            });
          }
          messages.push({
            role: "tool",
            tool_call_id: part.toolCallId,
            content: toolResultOutputToText(part.output),
          });
        }
        break;
      }
    }
  }

  return messages;
}
