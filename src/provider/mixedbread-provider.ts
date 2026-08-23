import {
  NoSuchModelError,
  type EmbeddingModelV3,
  type ImageModelV3,
  type LanguageModelV3,
  type ProviderV3,
} from "@ai-sdk/provider";
import { MixedbreadChatLanguageModel } from "./mixedbread-chat-language-model";
import type { MixedbreadChatModelId } from "./mixedbread-chat-options";
import { mixedbreadTools } from "./mixedbread-hosted-tools";
import {
  mixedbreadChatConfig,
  rejectConstructorCall,
  type MixedbreadProviderSettings,
} from "./mixedbread-provider-core";

export {
  DEFAULT_MIXEDBREAD_BASE_URL,
  type MixedbreadProviderSettings,
} from "./mixedbread-provider-core";

export interface MixedbreadProvider extends ProviderV3 {
  (modelId?: MixedbreadChatModelId): LanguageModelV3;

  languageModel(modelId: MixedbreadChatModelId): LanguageModelV3;

  chat(modelId: MixedbreadChatModelId): LanguageModelV3;

  tools: typeof mixedbreadTools;
}

export function createMixedbread(
  options: MixedbreadProviderSettings = {},
): MixedbreadProvider {
  const config = mixedbreadChatConfig(options);

  const createLanguageModel = (
    modelId: MixedbreadChatModelId = "toast-1",
  ): LanguageModelV3 => new MixedbreadChatLanguageModel(modelId, config);

  const provider = Object.assign(
    (modelId?: MixedbreadChatModelId): LanguageModelV3 => {
      if (new.target) {
        rejectConstructorCall();
      }
      return createLanguageModel(modelId);
    },
    {
      specificationVersion: "v3",
      languageModel: createLanguageModel,
      chat: createLanguageModel,
      tools: mixedbreadTools,
      embeddingModel: (modelId: string): EmbeddingModelV3 => {
        throw new NoSuchModelError({ modelId, modelType: "embeddingModel" });
      },
      imageModel: (modelId: string): ImageModelV3 => {
        throw new NoSuchModelError({ modelId, modelType: "imageModel" });
      },
    } as const,
  );

  return provider as unknown as MixedbreadProvider;
}

export const mixedbread = createMixedbread();
