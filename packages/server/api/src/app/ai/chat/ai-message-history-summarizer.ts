import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { CoreMessage, generateText, LanguageModel } from 'ai';

function getHistoryMaxTokens(aiConfig: AiConfig): number {
  const modelMax = aiConfig.modelSettings?.maxTokens;
  if (typeof modelMax === 'number') {
    return modelMax;
  }
  //
  // return system.getNumberOrThrow(AppSystemProp.MAX_TOKENS_IN_LLM_HISTORY);

  return 2000;
}

// const historyMaxMessages = getHistoryMaxMessages();
// function getHistoryMaxMessages(): number {
//   return system.getNumberOrThrow(AppSystemProp.MAX_MESSAGES_IN_LLM_HISTORY);
// }

// async function getSummaryMessage(
//   languageModel: LanguageModel,
//   aiConfig: AiConfig,
//   messages: CoreMessage[],
//   maxTokens: number,
// ): Promise<{ text: string }> {
//   const systemPrompt =
//     'You are a helpful assistant tasked with summarizing conversations. Create concise summaries that preserve key context.';
//
//   return generateText({
//     model: languageModel,
//     system: systemPrompt,
//     messages,
//     ...aiConfig.modelSettings,
//     maxTokens,
//   });
// }
//
// export async function summarizeMessages(
//   languageModel: LanguageModel,
//   aiConfig: AiConfig,
//   messages: CoreMessage[],
//   totalTokens: number,
// ): Promise<CoreMessage[]> {
//   const maxTokens = getHistoryMaxTokens(aiConfig);
//   let debugMessage = `Token count ${totalTokens}, which exceeds the configured limit of ${maxTokens}. Summarizing messages.`;
//
//   if (isNaN(totalTokens)) {
//     debugMessage = `Message count is ${messages.length}, which exceeds the configured limit of ${historyMaxMessages}. Summarizing messages.`;
//     logger.debug(
//       `The model is not providing token usage. Checking if the number of messages exceeds ${historyMaxMessages}.`,
//     );
//
//     if (messages.length < historyMaxMessages) {
//       return messages;
//     }
//   } else if (totalTokens < maxTokens) {
//     return messages;
//   }
//
//   logger.info(debugMessage);
//
//   const summaryMaxTokens = maxTokens / 2;
//   // const { text } = await getSummaryMessage(
//   //   languageModel,
//   //   aiConfig,
//   //   messages,
//   //   summaryMaxTokens,
//   // );
//   //
//   // return [
//   //   {
//   //     role: 'system',
//   //     content: `The following is a summary of the previous conversation: ${text}`,
//   //   },
//   // ];
//
//   return requestSummaryMessage(
//     languageModel,
//     aiConfig,
//     messages,
//     summaryMaxTokens,
//   );
// }

export async function summarizeMessages(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  messages: CoreMessage[],
): Promise<CoreMessage[]> {
  // const { text } = await getSummaryMessage(
  //   languageModel,
  //   aiConfig,
  //   messages,
  //   summaryMaxTokens,
  // );

  const systemPrompt =
    'You are a helpful assistant tasked with summarizing conversations. Create concise summaries that preserve key context.';

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
}
