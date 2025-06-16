import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import { Resolver } from 'react-hook-form';

export const MCP_SETTINGS_FORM_SCHEMA = Type.Object({
  amazonCost: Type.Optional(
    Type.Object({
      enabled: Type.Boolean(),
      connectionName: Type.String({
        minLength: 1,
        errorMessage: 'Connection name is required when Amazon Cost is enabled',
      }),
    }),
  ),
});

export type McpSettingsFormSchema = Static<typeof MCP_SETTINGS_FORM_SCHEMA>;

export const mcpFormSchemaResolver: Resolver<McpSettingsFormSchema> = async (
  data,
  context,
  options,
) => {
  const errors: Record<string, any> = {};

  if (data?.amazonCost?.enabled && !data.amazonCost.connectionName) {
    errors['amazonCost.connectionName'] = {
      message: 'Connection name is required when Amazon Cost is enabled',
    };
  }

  const typeboxValidation = await typeboxResolver(MCP_SETTINGS_FORM_SCHEMA)(
    data,
    context,
    options,
  );

  return {
    ...typeboxValidation,
    errors: { ...typeboxValidation.errors, ...errors },
  };
};
