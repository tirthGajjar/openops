import { api } from '@/app/lib/api';
import { McpConfig, SaveMcpConfigRequest } from '@openops/shared';

export const mcpSettingsApi = {
  saveMcpSettings(payload: SaveMcpConfigRequest): Promise<McpConfig> {
    return api.post<McpConfig>('/v1/mcp/config', payload);
  },
  deleteMcpSettings(): Promise<void> {
    return api.delete<void>('/v1/mcp/config');
  },
  getMcpSettings(): Promise<McpConfig> {
    return api.get<McpConfig>('/v1/mcp/config');
  },
};
