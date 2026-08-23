import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider-v4";
import {
  MixedbreadChatLanguageModelBase,
  type MixedbreadChatConfig,
} from "../provider/mixedbread-chat-language-model";
import type { MixedbreadChatModelId } from "../provider/mixedbread-chat-options";

export class MixedbreadChatLanguageModelV4 implements LanguageModelV4 {
  readonly specificationVersion = "v4" as const;
  readonly supportedUrls = {};

  private readonly model: MixedbreadChatLanguageModelBase;

  constructor(modelId: MixedbreadChatModelId, config: MixedbreadChatConfig) {
    this.model = new MixedbreadChatLanguageModelBase(modelId, config);
  }

  get provider(): string {
    return this.model.provider;
  }

  get modelId(): string {
    return this.model.modelId;
  }

  async doGenerate(
    options: LanguageModelV4CallOptions,
  ): Promise<LanguageModelV4GenerateResult> {
    const result = await this.model.doGenerate(
      options as unknown as LanguageModelV3CallOptions,
    );
    return result as unknown as LanguageModelV4GenerateResult;
  }

  async doStream(
    options: LanguageModelV4CallOptions,
  ): Promise<LanguageModelV4StreamResult> {
    const result = await this.model.doStream(
      options as unknown as LanguageModelV3CallOptions,
    );
    return result as unknown as LanguageModelV4StreamResult;
  }
}
