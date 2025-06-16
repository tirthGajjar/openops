import {
  isNil,
  McpConfig,
  openOpsId,
  SaveMcpConfigRequest,
} from '@openops/shared';
import { McpConfigEntity } from '../../ai/config/mcp-config.entity';
import { repoFactory } from '../../core/db/repo-factory';

const repo = repoFactory(McpConfigEntity);

export const mcpConfigService = {
  async save(params: {
    userId: string;
    projectId: string;
    request: SaveMcpConfigRequest;
  }): Promise<McpConfig> {
    const { projectId, request } = params;

    const existing = request.id
      ? await repo().findOneBy({ id: request.id, projectId })
      : null;

    const aiConfig: Partial<McpConfig> = {
      ...request,
      id: request?.id ?? openOpsId(),
      projectId,
      created: existing?.created ?? new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const config = await repo().save(aiConfig);

    //TODO: Uncomment this when we have a way to send events
    // sendAiConfigSavedEvent({
    //   id: config.id,
    //   userId: params.userId,
    //   projectId: params.projectId,
    //   provider: config.provider,
    //   enabled: config.enabled ?? false,
    // });

    return config;
  },

  async get(projectId: string): Promise<McpConfig | undefined> {
    return getOneBy({ projectId });
  },
  async delete(projectId: string): Promise<void> {
    await repo().delete({ projectId });
  },
};

async function getOneBy(
  where: Partial<Pick<McpConfig, 'id' | 'projectId'>>,
): Promise<McpConfig | undefined> {
  const config = await repo().findOneBy(where);

  if (isNil(config)) {
    return undefined;
  }

  return config;
}
