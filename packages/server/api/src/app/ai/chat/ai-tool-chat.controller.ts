import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { logger } from '@openops/server-shared';
import { PrincipalType } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { generateText, pipeDataStreamToResponse, streamText } from 'ai';
import { encryptUtils } from '../../helper/encryption';
import { aiConfigService } from '../config/ai-config.service';
import { callMcpTool } from '../mcp-client/mcp-api';
import { mcpTools } from '../mcp-client/mcp-tools';
import { getChatHistory, saveChatHistory } from './ai-chat.service';

const PersistentChatRequest = Type.Object({
  chatId: Type.String(),
  message: Type.String(),
  model: Type.Optional(Type.String()),
  system: Type.Optional(Type.String()),
});

const PersistentChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Persistent chat endpoint with tool calling support. LLM chooses and invokes MCP tools dynamically.',
    body: PersistentChatRequest,
    response: {
      200: Type.Any(),
    },
  },
};

export const aiToolChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/', PersistentChatOptions, async (request, reply) => {
    const { chatId, message, model, system } = request.body;
    const projectId = request.principal.projectId;

    if (!chatId || !message) {
      return reply.code(400).send({ error: 'Missing chatId or message.' });
    }

    const messages = await getChatHistory(chatId);
    messages.push({ role: 'user', content: message });

    try {
      const aiConfig = await aiConfigService.getActiveConfigWithApiKey(
        projectId,
      );
      if (!aiConfig) {
        return await reply
          .code(404)
          .send('No active AI configuration found for the project.');
      }
      const languageModel = await getAiProviderLanguageModel({
        apiKey: encryptUtils.decryptString(JSON.parse(aiConfig.apiKey)),
        model: model || aiConfig.model,
        provider: aiConfig.provider,
        providerSettings: aiConfig.providerSettings,
      });

      const toolChoiceResult = await generateText({
        model: languageModel,
        messages,
        tools: mcpTools,
        toolChoice: 'auto',
        ...aiConfig.modelSettings,
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

          messages.push({
            role: 'system',
            content: `Tool (${toolName}) result: ${JSON.stringify(toolResult)}`,
          });
        } catch (toolError) {
          return await reply.code(500).send({
            error: `Tool invocation failed: ${(toolError as Error).message}`,
          });
        }
      }

      await saveChatHistory(chatId, messages);

      pipeDataStreamToResponse(reply.raw, {
        execute: async (dataStreamWriter) => {
          const result = streamText({
            model: languageModel,
            messages,
            ...(system ? { system } : {}),
            ...aiConfig.modelSettings,
            async onFinish({ response }) {
              response.messages.forEach((r) => {
                messages.push(r);
              });
              await saveChatHistory(chatId, messages);
            },
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
