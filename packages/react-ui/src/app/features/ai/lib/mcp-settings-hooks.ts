import { QueryKeys } from '@/app/constants/query-keys';
import { McpConfig } from '@openops/shared';
import { MutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import { mcpSettingsApi } from './mcp-settings-api';

export const mcpSettingsHooks = {
  useMcpSettings: () => {
    return useQuery<McpConfig, Error>({
      queryKey: [QueryKeys.mcpSettings],
      queryFn: () => mcpSettingsApi.getMcpSettings(),
    });
  },
  useDeleteMcpSettings: (
    mutationOption?: Omit<MutationOptions, 'mutationFn'>,
  ) => {
    return useMutation({
      mutationFn: () => mcpSettingsApi.deleteMcpSettings(),
      ...mutationOption,
    });
  },
};
