import { createOpenAI } from '@ai-sdk/openai';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PrincipalType } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { CoreMessage, pipeDataStreamToResponse, streamText } from 'ai';
import { callMcpTool } from '../mcp-client/mcp-api';

const StatelessChatRequest = Type.Object({
  messages: Type.Array(
    Type.Object({
      role: Type.String(),
      content: Type.String(),
    }),
  ),
  model: Type.Optional(Type.String()),
  apiKey: Type.Optional(Type.String()),
  system: Type.Optional(Type.String()),
  tool: Type.Optional(Type.String()), // MCP tool name
  toolParams: Type.Optional(Type.Record(Type.String(), Type.Any())), // MCP tool params
});

const StatelessChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Stateless chat endpoint using Vercel AI SDK. Streams response, does not store history. Optionally calls an MCP tool and injects its result into the conversation.',
    body: StatelessChatRequest,
    response: {
      200: Type.Any(),
    },
  },
};

export const aiChatStatelessController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/stateless', StatelessChatOptions, async (request, reply) => {
    let { messages } = request.body;
    const { model, apiKey, system, tool, toolParams } = request.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply
        .code(400)
        .send({ error: 'Missing or invalid messages array.' });
    }
    try {
      // If a tool is specified, call it and inject the result
      if (tool) {
        try {
          const toolResult = await callMcpTool(tool, toolParams || {});
          // Inject as a system message (or you could use a tool message if your AI model supports it)
          messages = [
            {
              role: 'system',
              content: `Tool (${tool}) result: ${JSON.stringify(toolResult)}`,
            },
            ...messages,
          ];
        } catch (toolErr) {
          return await reply.code(400).send({
            error: `MCP tool call failed: ${(toolErr as Error).message}`,
          });
        }
      }
      const usedApiKey = apiKey || process.env.OPENAI_API_KEY;
      const usedModel = model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      if (!usedApiKey) {
        return await reply
          .code(400)
          .send({ error: 'No API key provided or configured.' });
      }
      const languageModel = createOpenAI({ apiKey: usedApiKey })(usedModel);
      pipeDataStreamToResponse(reply.raw, {
        execute: async (dataStreamWriter) => {
          const result = streamText({
            model: languageModel,
            messages: messages as CoreMessage[],
            ...(system ? { system } : {}),
          });
          result.mergeIntoDataStream(dataStreamWriter);
        },
        onError: (error) => {
          return error instanceof Error ? error.message : String(error);
        },
      });
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
};
