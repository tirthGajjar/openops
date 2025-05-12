import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { aiChatStatelessController } from './chat/ai-chat-stateless.controller';
import { aiChatController } from './chat/ai-chat.controller';
import { aiConfigController } from './config/ai-config.controller';
import { mcpToolsController } from './mcp-client/mcp-tools.controller';
import { aiProvidersController } from './providers/ai-providers.controller';

export const aiModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(aiProvidersController, {
    prefix: '/v1/ai/providers',
  });

  await app.register(aiConfigController, {
    prefix: '/v1/ai/config',
  });

  await app.register(aiChatController, {
    prefix: '/v1/ai/chat',
  });

  await app.register(mcpToolsController, {
    prefix: '/v1/ai/mcp-tools',
  });

  await app.register(aiChatStatelessController, {
    prefix: '/v1/ai/chat-stateless',
  });
};
