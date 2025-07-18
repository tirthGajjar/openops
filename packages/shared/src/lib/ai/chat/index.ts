import { Static, Type } from '@sinclair/typebox';

export const BlockContext = Type.Object({
  chatId: Type.Optional(Type.String()),
  workflowId: Type.Optional(Type.String()),
  blockName: Type.Optional(Type.String()),
  stepName: Type.Optional(Type.String()),
  actionName: Type.Optional(Type.String()),
});

export const OpenChatMCPRequest = BlockContext;
export type OpenChatMCPRequest = Static<typeof OpenChatMCPRequest>;

export const OpenChatResponse = Type.Object({
  chatId: Type.String(),
  messages: Type.Optional(
    Type.Array(
      Type.Object({
        role: Type.String(),
        content: Type.Union([
          Type.String(),
          Type.Array(
            Type.Object({
              type: Type.Literal('text'),
              text: Type.String(),
            }),
          ),
        ]),
      }),
    ),
  ),
});

export type OpenChatResponse = Static<typeof OpenChatResponse>;

export const VariableContext = Type.Object({
  name: Type.String(),
  value: Type.Any(),
});
export type VariableContext = Static<typeof VariableContext>;

export const StepContext = Type.Object({
  id: Type.String(),
  stepName: Type.String(),
  variables: Type.Optional(Type.Array(VariableContext)),
});
export type StepContext = Static<typeof StepContext>;

export const ChatFlowContext = Type.Object({
  flowId: Type.String(),
  flowVersionId: Type.String(),
  steps: Type.Array(StepContext),
});

export type ChatFlowContext = Static<typeof ChatFlowContext>;

export const NewMessageRequest = Type.Object({
  chatId: Type.String(),
  message: Type.String(),
  additionalContext: Type.Optional(ChatFlowContext),
});

export type NewMessageRequest = Static<typeof NewMessageRequest>;

export const DeleteChatHistoryRequest = Type.Object({
  chatId: Type.String(),
});

export type DeleteChatHistoryRequest = Static<typeof DeleteChatHistoryRequest>;

export * from './code-output-structure';
