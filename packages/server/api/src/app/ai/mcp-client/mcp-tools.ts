export type McpTool = {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
};

export const mcpTools: McpTool[] = [
  {
    name: 'search',
    description:
      'Search across the OpenOps Documentation documentation to fetch relevant context for a given query',
    method: 'POST',
    endpoint: '/tools/docs.openops.com/search',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
];
