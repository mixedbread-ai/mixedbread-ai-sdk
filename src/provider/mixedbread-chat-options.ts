import { z } from "zod/v4";

export type MixedbreadChatModelId = "toast-1" | (string & {});

export const mixedbreadProviderOptions = z.object({
  store: z.boolean().optional(),
  previousCompletionId: z.string().optional(),
  terminalToolName: z.string().optional(),
  maxToolCalls: z.number().int().min(1).optional(),
  parallelToolCalls: z.boolean().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  include: z.array(z.string()).optional(),
});

export type MixedbreadProviderOptions = z.infer<typeof mixedbreadProviderOptions>;
