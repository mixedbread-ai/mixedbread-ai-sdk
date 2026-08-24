import type { LanguageModelV4FinishReason } from "@ai-sdk/provider";

export function mapMixedbreadFinishReason(
  finishReason: string | null | undefined,
): LanguageModelV4FinishReason {
  switch (finishReason) {
    case "stop":
      return { unified: "stop", raw: finishReason };
    case "length":
      return { unified: "length", raw: finishReason };
    case "tool_calls":
      return { unified: "tool-calls", raw: finishReason };
    default:
      return { unified: "other", raw: finishReason ?? undefined };
  }
}
