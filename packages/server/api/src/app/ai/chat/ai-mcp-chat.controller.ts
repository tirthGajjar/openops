import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { encryptUtils, logger } from '@openops/server-shared';
import {
  AiConfig,
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import { CoreMessage, LanguageModel, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { sendAiChatMessageSendEvent } from '../../telemetry/event-models';
import { aiConfigService } from '../config/ai-config.service';
import { getMCPTools } from '../mcp/mcp-tools';
import {
  appendMessagesToChatHistory,
  createChatContext,
  deleteChatHistory,
  generateChatIdForMCP,
  getChatContext,
  getChatHistory,
} from './ai-chat.service';
import { streamAIResponse } from './ai-stream-handler';
import { getMcpSystemPrompt } from './prompts.service';
import { selectRelevantTools } from './tools.service';

export const aiMCPChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const { chatId: inputChatId } = request.body;
      const { id: userId } = request.principal;

      if (inputChatId) {
        const existingContext = await getChatContext(inputChatId);

        if (existingContext) {
          const messages = await getChatHistory(inputChatId);
          return reply.code(200).send({
            chatId: inputChatId,
            messages,
          });
        }
      }

      const newChatId = openOpsId();
      const chatId = generateChatIdForMCP({ chatId: newChatId, userId });
      const chatContext = { chatId: newChatId };

      await createChatContext(chatId, chatContext);
      const messages = await getChatHistory(chatId);

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );
  app.post('/', NewMessageOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;
    const chatContext = await getChatContext(chatId);
    if (!chatContext) {
      return reply
        .code(404)
        .send('No chat session found for the provided chat ID.');
    }

    const aiConfig = await aiConfigService.getActiveConfigWithApiKey(projectId);
    if (!aiConfig) {
      return reply
        .code(404)
        .send('No active AI configuration found for the project.');
    }

    const apiKey = encryptUtils.decryptString(JSON.parse(aiConfig.apiKey));
    const languageModel = await getAiProviderLanguageModel({
      apiKey,
      model: aiConfig.model,
      provider: aiConfig.provider,
      providerSettings: aiConfig.providerSettings,
    });

    const messages = await getChatHistory(chatId);
    messages.push({
      role: 'user',
      content: request.body.message,
    });

    const authToken =
      request.headers.authorization?.replace('Bearer ', '') ?? '';
    const { mcpClients, filteredTools, systemPrompt } =
      await getMCPToolsContext(
        app,
        authToken,
        aiConfig,
        messages,
        languageModel,
      );

    sendAiChatMessageSendEvent({
      projectId,
      userId: request.principal.id,
      chatId,
      provider: aiConfig.provider,
    });

    try {
      const newMessages = await streamAIResponse({
        userId,
        chatId,
        projectId,
        aiConfig,
        systemPrompt,
        languageModel,
        tools: filteredTools,
        chatHistory: messages,
        serverResponse: reply.raw,
      });

      await appendMessagesToChatHistory(chatId, [
        {
          role: 'user',
          content: request.body.message,
        },
        ...newMessages,
      ]);
    } finally {
      await closeMCPClients(mcpClients);
    }
  });

  app.delete('/:chatId', DeleteChatOptions, async (request, reply) => {
    const { chatId } = request.params;

    try {
      await deleteChatHistory(chatId);
      return await reply.code(StatusCodes.OK).send();
    } catch (error) {
      logger.error('Failed to delete chat history with error: ', error);
      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        message: 'Failed to delete chat history',
      });
    }
  });
};

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Initialize a new MCP chat session or resume an existing one. This endpoint creates a unique chat ID and context for the conversation, supporting integration with MCP tools and services.',
    body: OpenChatMCPRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Send a message to the MCP chat session and receive a streaming response. This endpoint processes the user message, generates an AI response using the configured language model, and maintains the conversation history while integrating with MCP tools.',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Delete an MCP chat session and its associated history. This endpoint removes all messages, context data, and MCP tool states for the specified chat ID, effectively ending the conversation.',
    params: DeleteChatHistoryRequest,
  },
};

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  try {
    for (const mcpClient of mcpClients) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mcpClient as any)?.close();
    }
  } catch (error) {
    logger.warn('Failed to close mcp client.', error);
  }
}

function collectToolsByProvider(
  tools: ToolSet | undefined,
  provider: string,
): ToolSet {
  const result: ToolSet = {};
  for (const [key, tool] of Object.entries(tools ?? {})) {
    if ((tool as { toolProvider?: string }).toolProvider === provider) {
      result[key] = tool;
    }
  }
  return result;
}

export function hasToolProvider(
  tools: ToolSet | undefined,
  provider: string,
): boolean {
  return Object.values(tools ?? {}).some(
    (tool) => (tool as { toolProvider?: string }).toolProvider === provider,
  );
}

async function getMCPToolsContext(
  app: FastifyInstance,
  authToken: string,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  languageModel: LanguageModel,
): Promise<{
  mcpClients: unknown[];
  systemPrompt: string;
  filteredTools?: ToolSet;
}> {
  const { mcpClients, tools } = await getMCPTools(app, authToken);

  const filteredTools = await selectRelevantTools({
    messages,
    tools,
    languageModel,
    aiConfig,
  });

  const isAnalyticsLoaded = hasToolProvider(filteredTools, 'superset');
  const isTablesLoaded = hasToolProvider(filteredTools, 'tables');
  const isOpenOpsMCPEnabled = hasToolProvider(filteredTools, 'openops');

  let systemPrompt = await getMcpSystemPrompt({
    isAnalyticsLoaded,
    isTablesLoaded,
    isOpenOpsMCPEnabled,
  });

  if (!filteredTools || Object.keys(filteredTools).length === 0) {
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  return {
    mcpClients,
    systemPrompt,
    filteredTools: {
      ...filteredTools,
      ...(isOpenOpsMCPEnabled ? collectToolsByProvider(tools, 'openops') : {}),
    },
  };
}
