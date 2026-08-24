import type { LanguageModelV4ResponseMetadata } from "@ai-sdk/provider";

export function getResponseMetadata({
  id,
  model,
  created,
}: {
  id?: string | null;
  created?: number | null;
  model?: string | null;
}): LanguageModelV4ResponseMetadata {
  return {
    id: id ?? undefined,
    modelId: model ?? undefined,
    timestamp: created != null ? new Date(created * 1000) : undefined,
  };
}
