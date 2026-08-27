import {
  NoSuchModelError,
  type EmbeddingModelV4,
  type ImageModelV4,
  type LanguageModelV4,
  type ProviderV4,
} from "@ai-sdk/provider";
import { MixedbreadChatLanguageModel } from "./mixedbread-chat-language-model";
import type { MixedbreadChatModelId } from "./mixedbread-chat-options";
import {
  mixedbreadChatConfig,
  rejectConstructorCall,
  type MixedbreadProviderSettings,
} from "./mixedbread-provider-core";

export {
  DEFAULT_MIXEDBREAD_BASE_URL,
  type MixedbreadProviderSettings,
} from "./mixedbread-provider-core";

export interface MixedbreadProvider extends ProviderV4 {
  (modelId?: MixedbreadChatModelId): LanguageModelV4;

  languageModel(modelId: MixedbreadChatModelId): LanguageModelV4;

  chat(modelId: MixedbreadChatModelId): LanguageModelV4;
}

export function createMixedbread(
  options: MixedbreadProviderSettings = {},
): MixedbreadProvider {
  const config = mixedbreadChatConfig(options);

  const createLanguageModel = (
    modelId: MixedbreadChatModelId = "toast-1",
  ): LanguageModelV4 => new MixedbreadChatLanguageModel(modelId, config);

  const provider = Object.assign(
    (modelId?: MixedbreadChatModelId): LanguageModelV4 => {
      if (new.target) {
        rejectConstructorCall();
      }
      return createLanguageModel(modelId);
    },
    {
      specificationVersion: "v4",
      languageModel: createLanguageModel,
      chat: createLanguageModel,
      embeddingModel: (modelId: string): EmbeddingModelV4 => {
        throw new NoSuchModelError({ modelId, modelType: "embeddingModel" });
      },
      imageModel: (modelId: string): ImageModelV4 => {
        throw new NoSuchModelError({ modelId, modelType: "imageModel" });
      },
    } as const,
  );

  return provider as unknown as MixedbreadProvider;
}

export const mixedbread = createMixedbread();
