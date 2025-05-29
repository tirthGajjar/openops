import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import {
  AppSystemProp,
  encryptUtils,
  logger,
  system,
} from '@openops/server-shared';
import {
  AiConfig,
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import {
  CoreMessage,
  DataStreamWriter,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  ToolSet,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import { aiConfigService } from '../config/ai-config.service';
import { getMCPTools } from '../mcp/mcp-tools';
import {
  appendMessagesToChatHistory,
  appendMessagesToSummarizedChatHistory,
  createChatContext,
  deleteChatHistory,
  deleteSummarizedChatHistory,
  generateChatIdForMCP,
  getChatContext,
  getChatHistory,
} from './ai-chat.service';
import { saasdg, sdgsd } from './ai-message-history-summarizer';
import { generateMessageId } from './ai-message-id-generator';
import { getMcpSystemPrompt } from './prompts.service';
import { selectRelevantTools } from './tools.service';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

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

    const newMessage: CoreMessage = {
      role: 'user',
      content: request.body.message,
    };

    await appendMessagesToChatHistory(chatId, [newMessage]);
    const chatHistory = await appendMessagesToSummarizedChatHistory(chatId, [
      newMessage,
    ]);

    const { mcpClients, tools } = await getMCPTools();
    const filteredTools = await selectRelevantTools({
      chatId,
      messages: chatHistory,
      languageModel,
      aiConfig,
      tools,
      retryIndex: 0,
    });

    const isAnalyticsLoaded = Object.keys(filteredTools ?? {}).some((key) =>
      key.includes('superset'),
    );
    const isTablesLoaded = Object.keys(filteredTools ?? {}).some((key) =>
      key.includes('table'),
    );

    const systemPrompt = await getMcpSystemPrompt({
      isAnalyticsLoaded,
      isTablesLoaded,
    });

    const retryObj = {
      handledError: false,
      retryIndex: 0,
    };

    pipeDataStreamToResponse(reply.raw, {
      execute: async (dataStreamWriter) => {
        logger.debug('Send user message to LLM.');
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          chatId,
          chatHistory,
          retryObj,
          mcpClients,
          filteredTools,
        );
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (retryObj.handledError) {
          return '';
        }

        sdgsd(languageModel, aiConfig, chatId).catch((e) =>
          logger.warn('Failed to summarize message history.', e),
        );

        const message = `${errorMessage}. \\nPlease try again.`;
        endStreamWithErrorMessage(reply.raw, message);
        logger.warn(message);

        sendAiChatFailureEvent({
          projectId,
          userId: request.principal.id,
          chatId,
          errorMessage: message,
          provider: aiConfig.provider,
          model: aiConfig.model,
        });

        closeMCPClients(mcpClients).catch((e) =>
          logger.warn('Failed to close mcp client.', e),
        );
        
        return '';
      },
    });

    sendAiChatMessageSendEvent({
      projectId,
      userId: request.principal.id,
      chatId,
      provider: aiConfig.provider,
    });
  });

  app.delete('/:chatId', DeleteChatOptions, async (request, reply) => {
    const { chatId } = request.params;

    try {
      await deleteChatHistory(chatId);
      await deleteSummarizedChatHistory(chatId);
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
      'Opens a chat session, either starting fresh or resuming prior messages if the conversation has history.',
    body: OpenChatMCPRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Sends a message to the chat session',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Deletes chat history by chat ID.',
    params: DeleteChatHistoryRequest,
  },
};

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  chatId: string,
  messages: CoreMessage[],
  retryObj: { retryIndex: number; handledError: boolean },
  mcpClients: unknown[],
  tools?: ToolSet,
): Promise<void> {
  retryObj.handledError = false;
  let stepCount = 0;
  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    tools,
    toolChoice: 'auto',
    maxRetries: 1,
    maxSteps: maxRecursionDepth,
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
        const message = `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
        logger.warn(message);
        return;
      }
    },
    async onError(error) {
      retryObj.handledError = true;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      retryObj.retryIndex = retryObj.retryIndex + 1;

      const newHistory = await saasdg(
        languageModel,
        aiConfig,
        chatId,
        retryObj.retryIndex,
        errorMessage,
      );

      if (newHistory !== null) {
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          chatId,
          newHistory,
          retryObj,
          mcpClients,
          tools,
        );
      }

      endStreamWithErrorMessage(dataStreamWriter, errorMessage);
      logger.debug(errorMessage, error);
    },
    async onFinish(result): Promise<void> {
      await appendMessagesToChatHistory(chatId, result.response.messages);
      await appendMessagesToSummarizedChatHistory(
        chatId,
        result.response.messages,
      );

      if (result.finishReason === 'length') {
        await sdgsd(languageModel, aiConfig, chatId);
        const message = `\\n\\nThe message was truncated because the maximum tokens for the context window was reached. Please try again.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
      }


      await closeMCPClients(mcpClients);
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

function endStreamWithErrorMessage(
  dataStreamWriter: NodeJS.WritableStream | DataStreamWriter,
  message: string,
): void {
  dataStreamWriter.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  dataStreamWriter.write(`0:"${message}"\n`);

  dataStreamWriter.write(
    `e:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null},"isContinued":false}\n`,
  );
  dataStreamWriter.write(
    `d:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null}}\n`,
  );
}

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  for (const mcpClient of mcpClients) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (mcpClient as any)?.close();
  }
}
