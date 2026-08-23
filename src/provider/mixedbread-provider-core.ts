import { loadApiKey, withoutTrailingSlash, type FetchFunction } from "@ai-sdk/provider-utils";
import type { MixedbreadChatConfig } from "./mixedbread-chat-language-model";

export const DEFAULT_MIXEDBREAD_BASE_URL = "https://api.mixedbread.com/v1";

export interface MixedbreadProviderSettings {
  baseURL?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  generateId?: () => string;
}

function readEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

export function mixedbreadChatConfig(
  options: MixedbreadProviderSettings,
): MixedbreadChatConfig {
  return {
    provider: "mixedbread.chat",
    baseURL:
      withoutTrailingSlash(options.baseURL) ?? DEFAULT_MIXEDBREAD_BASE_URL,
    headers: () => ({
      Authorization: `Bearer ${loadApiKey({
        apiKey:
          options.apiKey ??
          readEnv("MXBAI_API_KEY") ??
          readEnv("MIXEDBREAD_API_KEY"),
        environmentVariableName: "MXBAI_API_KEY",
        description: "Mixedbread",
      })}`,
      ...options.headers,
    }),
    fetch: options.fetch,
    generateId: options.generateId,
  };
}

export function rejectConstructorCall(): never {
  throw new Error(
    "The Mixedbread model factory function cannot be called with the new keyword.",
  );
}
