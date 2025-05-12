import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PrincipalType } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { callMcpTool } from './mcp-api';
import { mcpTools } from './mcp-tools';

const UseToolRequest = Type.Object({
  toolName: Type.String(),
  params: Type.Record(Type.String(), Type.Any()),
});

const UseToolOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'mcp-tools'],
    description: 'Use an MCP tool by name with parameters',
    body: UseToolRequest,
    response: {
      200: Type.Any(),
    },
  },
};

export const mcpToolsController: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/use-tool', UseToolOptions, async (request, reply) => {
    const { toolName, params } = request.body;
    try {
      const result = await callMcpTool(toolName, params);
      return await reply.code(200).send(result);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  app.get(
    '/list-tools',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER],
      },
      schema: {
        tags: ['ai', 'mcp-tools'],
        description: 'List available MCP tools',
        response: {
          200: Type.Array(
            Type.Object({
              name: Type.String(),
              description: Type.String(),
            }),
          ),
        },
      },
    },
    async (_request, reply) => {
      const tools = Object.entries(mcpTools).map(([name, tool]) => ({
        name,
        description: tool.description!,
      }));
      return reply.code(200).send(tools);
    },
  );
};
