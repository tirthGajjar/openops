import { createOpenAI } from '@ai-sdk/openai';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import { PrincipalType } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import {
  CoreMessage,
  generateText,
  pipeDataStreamToResponse,
  streamText,
} from 'ai';
import { callMcpTool } from '../mcp-client/mcp-api';
import { mcpTools } from '../mcp-client/mcp-tools';

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
});

const StatelessChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Stateless chat endpoint with tool calling support. LLM chooses and invokes MCP tools dynamically.',
    body: StatelessChatRequest,
    response: {
      200: Type.Any(),
    },
  },
};

export const aiChatStatelessController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/', StatelessChatOptions, async (request, reply) => {
    const { messages: rawMessages, model, apiKey, system } = request.body;

    const allowedRoles = ['user', 'assistant', 'system', 'tool'] as const;
    const coreMessages: CoreMessage[] = (
      rawMessages as Array<{ role: string; content: string }>
    )
      .filter((msg: { role: string; content: string }) =>
        allowedRoles.includes(msg.role as (typeof allowedRoles)[number]),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as CoreMessage[];

    if (
      !coreMessages ||
      !Array.isArray(coreMessages) ||
      coreMessages.length === 0
    ) {
      return reply
        .code(400)
        .send({ error: 'Missing or invalid messages array.' });
    }

    try {
      const usedApiKey = apiKey || process.env.OPENAI_API_KEY;
      const usedModel = model || process.env.OPENAI_MODEL || 'gpt-4o';
      if (!usedApiKey) {
        return await reply
          .code(400)
          .send({ error: 'No API key provided or configured.' });
      }

      const languageModel = createOpenAI({ apiKey: usedApiKey })(usedModel);

      const toolChoiceResult = await generateText({
        model: languageModel,
        messages: coreMessages,
        tools: mcpTools,
        toolChoice: 'auto',
      });

      const toolCalls = toolChoiceResult.toolCalls;
      logger.info(toolCalls, `toolCalls`);
      if (toolCalls && toolCalls.length > 0) {
        const { toolName, args: parameters } = toolCalls[0];

        try {
          logger.info(`toolName ${toolName}`);
          logger.info(parameters, `parameters`);
          const toolResult = await callMcpTool(toolName, parameters);
          logger.info(toolResult, `toolResult`);

          coreMessages.unshift({
            role: 'system',
            content: `Tool (${toolName}) result: ${JSON.stringify(toolResult)}`,
          });
        } catch (toolError) {
          return await reply.code(500).send({
            error: `Tool invocation failed: ${(toolError as Error).message}`,
          });
        }
      } else {
        // simply send the text without an extra LLM call - need to check if it will not break the FE
        // logger.info(toolChoiceResult.text, 'no toolCalls');
        // return await reply.code(200).send(toolChoiceResult);
      }

      pipeDataStreamToResponse(reply.raw, {
        execute: async (dataStreamWriter) => {
          const result = streamText({
            model: languageModel,
            messages: coreMessages,
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
