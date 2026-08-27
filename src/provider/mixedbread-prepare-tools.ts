import type {
  LanguageModelV4CallOptions,
  SharedV4Warning,
} from "@ai-sdk/provider";

export type MixedbreadWireTool = Record<string, unknown>;

export type MixedbreadWireToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

export function prepareTools({
  tools,
  toolChoice,
}: {
  tools: LanguageModelV4CallOptions["tools"];
  toolChoice: LanguageModelV4CallOptions["toolChoice"];
}): {
  tools: MixedbreadWireTool[] | undefined;
  toolChoice: MixedbreadWireToolChoice | undefined;
  toolWarnings: SharedV4Warning[];
} {
  const toolWarnings: SharedV4Warning[] = [];

  if (tools == null || tools.length === 0) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const wireTools: MixedbreadWireTool[] = [];

  for (const tool of tools) {
    if (tool.type === "function") {
      wireTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: tool.strict,
        },
      });
      continue;
    }

    toolWarnings.push({
      type: "unsupported",
      feature: `tool ${tool.id}`,
    });
  }

  if (toolChoice == null) {
    return {
      tools: wireTools.length > 0 ? wireTools : undefined,
      toolChoice: undefined,
      toolWarnings,
    };
  }

  switch (toolChoice.type) {
    case "auto":
    case "none":
    case "required":
      return {
        tools: wireTools.length > 0 ? wireTools : undefined,
        toolChoice: toolChoice.type,
        toolWarnings,
      };
    case "tool":
      return {
        tools: wireTools.length > 0 ? wireTools : undefined,
        toolChoice: { type: "function", function: { name: toolChoice.toolName } },
        toolWarnings,
      };
  }
}
