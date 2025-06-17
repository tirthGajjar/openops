import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  streamText,
  StreamTextResult,
  ToolSet,
} from 'ai';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { generateMessageId } from './ai-message-id-generator';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

export type StreamParams = {
  userId: string;
  chatId: string;
  projectId: string;
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  chatHistory: CoreMessage[];
  languageModel: LanguageModel;
  serverResponse: NodeJS.WritableStream;
};

export async function streamAIResponse(
  streamParams: StreamParams,
): Promise<CoreMessage[]> {
  const { aiConfig, chatId, serverResponse } = streamParams;
  const newMessages: CoreMessage[] = [];

  serverResponse.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  const { textStream } = await streamMessages(
    serverResponse,
    streamParams.languageModel,
    streamParams.systemPrompt,
    aiConfig,
    streamParams.chatHistory,
    newMessages,
    streamParams.tools,
  );

  try {
    for await (const textPart of textStream) {
      sendMessageToStream(serverResponse, textPart);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendAiChatFailureEvent({
      projectId: streamParams.projectId,
      userId: streamParams.userId,
      chatId,
      errorMessage: message,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    sendMessageToStream(serverResponse, message);
    logger.warn(message, error);
  }

  serverResponse.write(`d:{"finishReason":"stop"}\n`);
  serverResponse.end();

  return newMessages;
}

async function streamMessages(
  responseStream: NodeJS.WritableStream,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  chatHistory: CoreMessage[],
  newMessages: CoreMessage[],
  tools?: ToolSet,
): Promise<StreamTextResult<ToolSet, never>> {
  let stepCount = 0;

  const hasTools = tools && Object.keys(tools).length !== 0;
  const toolChoice = hasTools ? 'auto' : 'none';

  return streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: 1,
    maxSteps: maxRecursionDepth,
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
        const message = `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
        sendMessageToStream(responseStream, message);
        logger.warn(message);
      }
    },
    async onError({ error }): Promise<void> {
      throw error;
    },
    async onFinish({ response }): Promise<void> {
      newMessages.push(...response.messages);
    },
  });
}

function sendMessageToStream(
  responseStream: NodeJS.WritableStream,
  message: string,
): void {
  responseStream.write(`0:${JSON.stringify(message)}\n`);
}
