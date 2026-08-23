import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod/v4";

export const mixedbreadErrorSchema = z.object({
  type: z.string().nullish(),
  code: z.string().nullish(),
  message: z.unknown().nullish(),
});

export type MixedbreadErrorData = z.infer<typeof mixedbreadErrorSchema>;

export const mixedbreadFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: mixedbreadErrorSchema,
  errorToMessage: (data) => {
    if (typeof data.message === "string") {
      return data.message;
    }
    if (data.message != null) {
      return JSON.stringify(data.message);
    }
    return data.code ?? data.type ?? "unknown error";
  },
});
