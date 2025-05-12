import { mcpTools } from './mcp-tools';

export async function callMcpTool(
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const tool = mcpTools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found.`);
  }

  const baseUrl = process.env.MCP_API_BASE_URL || 'http://localhost:4001'; // Adjust as needed
  const url = baseUrl + tool.endpoint;

  const response = await fetch(url, {
    method: tool.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `MCP tool call failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
