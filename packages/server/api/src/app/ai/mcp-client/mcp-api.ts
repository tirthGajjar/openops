import { ToolExecutionOptions } from 'ai';
import { mcpTools } from './mcp-tools';

export async function callMcpTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  options: ToolExecutionOptions = {
    toolCallId: '',
    messages: [],
  },
): Promise<unknown> {
  const tool = mcpTools[toolName as keyof typeof mcpTools];
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found.`);
  }

  return tool.execute(params, options);
}
