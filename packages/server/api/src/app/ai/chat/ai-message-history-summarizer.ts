import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { APICallError, CoreMessage, generateText, LanguageModel } from 'ai';
import { appendMessagesToSummarizedChatHistory } from './ai-chat.service';

function getHistoryMaxTokens(aiConfig: AiConfig): number {
  const modelMax = aiConfig.modelSettings?.maxTokens;
  if (typeof modelMax === 'number') {
    return modelMax;
  }
  //
  // return system.getNumberOrThrow(AppSystemProp.MAX_TOKENS_IN_LLM_HISTORY);

  return 2000;
}

export async function saasdg(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  chatId: string,
  retryIndex: number,
  errorMessage: string,
): Promise<CoreMessage[] | null> {
  if (errorMessage.includes('tokens') && retryIndex < 2) {
    logger.error('Call Summarize');

    const chatHistory = await sdgsd(languageModel, aiConfig, chatId);

    logger.error('Summarize result', chatHistory);

    return chatHistory;
  }

  return null;
}

export async function sdgsd(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  chatId: string,
): Promise<CoreMessage[]> {
  return appendMessagesToSummarizedChatHistory(
    chatId,
    [],
    async (existingMessages) => {
      let reAdd = false;
      let lastMessage = existingMessages.at(-1);
      if (lastMessage && lastMessage.role === 'user') {
        if (existingMessages.length === 1) {
          return existingMessages;
        }
        lastMessage = existingMessages.pop();
        reAdd = true;
      }

      try {
        const summary = await summarizeMessages(
          languageModel,
          aiConfig,
          existingMessages,
        );

        if (lastMessage && reAdd) {
          summary.push(lastMessage);
        }

        return summary;
      } catch (error) {
        logger.error('error', error);
        return existingMessages;
      }
    },
  );
}

async function summarizeMessages(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  retry: { currentIteration: number } = { currentIteration: 0 },
): Promise<CoreMessage[]> {
  try {
    const systemPrompt =
      'You are an expert at creating extremely concise conversation summaries. ' +
      'Focus only on the most important information, decisions, and context. ' +
      'Omit pleasantries, redundant information, and unnecessary details. ' +
      'Your summary should be as brief as possible while preserving all critical information.';

    const { text } = await generateText({
      model: languageModel,
      system: systemPrompt,
      messages,
      ...aiConfig.modelSettings,
      maxTokens: getHistoryMaxTokens(aiConfig),
    });

    return [
      {
        role: 'system',
        content: `The following is a summary of the previous conversation: ${text}`,
      },
    ];
  } catch (error) {
    if (retry.currentIteration < 1 && APICallError.isInstance(error)) {
      const truncated = truncateToLastTwoUserInteractions(messages);
      retry.currentIteration += 1;
      return summarizeMessages(languageModel, aiConfig, truncated, retry);
    }

    throw error;
  }
}

function truncateToLastTwoUserInteractions(
  messages: CoreMessage[],
): CoreMessage[] {
  const result: CoreMessage[] = [];
  let userCount = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    result.unshift(msg);

    if (msg.role === 'user') {
      userCount++;
      if (userCount === 2) {
        break;
      }
    }
  }

  return result;
}
