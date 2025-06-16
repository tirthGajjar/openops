import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common/base-model';
import { AiProviderEnum } from '../providers/index';

const AmazonCostSettings = Type.Object({
  enabled: Type.Boolean(),
  connectionName: Type.String(),
});

export const AiConfig = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  provider: Type.Enum(AiProviderEnum),
  model: Type.String(),
  apiKey: Type.String(),
  providerSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  modelSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  enabled: Type.Optional(Type.Boolean()),
});

export type AiConfig = Static<typeof AiConfig>;

export const SaveAiConfigRequest = Type.Object({
  id: Type.Optional(Type.String()),
  provider: Type.Enum(AiProviderEnum),
  model: Type.String(),
  apiKey: Type.String(),
  providerSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  modelSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  enabled: Type.Optional(Type.Boolean()),
});

export type SaveAiConfigRequest = Static<typeof SaveAiConfigRequest>;

export const McpConfig = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  amazonCost: Type.Optional(AmazonCostSettings),
});

export type McpConfig = Static<typeof McpConfig>;

export const SaveMcpConfigRequest = Type.Object({
  id: Type.Optional(Type.String()),
  amazonCost: Type.Optional(AmazonCostSettings),
});

export type SaveMcpConfigRequest = Static<typeof SaveMcpConfigRequest>;
