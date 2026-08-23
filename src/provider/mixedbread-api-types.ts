import { z } from "zod/v4";

export const mixedbreadUsageSchema = z
  .object({
    prompt_tokens: z.number().nullish(),
    completion_tokens: z.number().nullish(),
    total_tokens: z.number().nullish(),
    prompt_tokens_details: z
      .object({
        cached_tokens: z.number().nullish(),
      })
      .nullish(),
  })
  .nullish();

export const mixedbreadHostedToolCallSchema = z.looseObject({
  type: z.string(),
  id: z.string(),
  status: z.enum(["in_progress", "completed", "failed"]).nullish(),
  reasoning_offset: z.number().nullish(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullish(),
});

export type MixedbreadHostedToolCall = z.infer<typeof mixedbreadHostedToolCallSchema>;

export const mixedbreadToolTicketSchema = z.object({
  tool_call_id: z.string(),
  ticket: z.string(),
  expires_at: z.number(),
});

export type MixedbreadToolTicket = z.infer<typeof mixedbreadToolTicketSchema>;

export const mixedbreadChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal("assistant").nullish(),
        content: z.string().nullish(),
        reasoning_content: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
    }),
  ),
  usage: mixedbreadUsageSchema,
  title: z.string().nullish(),
  hosted_tool_calls: z.array(mixedbreadHostedToolCallSchema).nullish(),
  tool_tickets: z.array(mixedbreadToolTicketSchema).nullish(),
});

export type MixedbreadChatResponse = z.infer<typeof mixedbreadChatResponseSchema>;

export const mixedbreadChatChunkSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            role: z.literal("assistant").nullish(),
            content: z.string().nullish(),
            reasoning_content: z.string().nullish(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().nullish(),
                  function: z.object({
                    name: z.string().nullish(),
                    arguments: z.string().nullish(),
                  }),
                }),
              )
              .nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .nullish(),
  usage: mixedbreadUsageSchema,
  title: z.string().nullish(),
  hosted_tool_calls: z.array(mixedbreadHostedToolCallSchema).nullish(),
  tool_tickets: z.array(mixedbreadToolTicketSchema).nullish(),
});

export type MixedbreadChatChunk = z.infer<typeof mixedbreadChatChunkSchema>;
