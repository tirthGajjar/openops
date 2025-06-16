import { McpConfig, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

export type McpConfigSchema = McpConfig & {
  project: Project;
};

export const McpConfigEntity = new EntitySchema<McpConfigSchema>({
  name: 'mcp_config',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: OpenOpsIdSchema,
    awsCost: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
      default: '{"enabled": false, "connectionName": ""}',
    },
  },
  relations: {
    project: {
      type: 'one-to-one',
      target: 'project',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        foreignKeyConstraintName: 'fk_mcp_config_project',
      },
    },
  },
  indices: [
    {
      name: 'idx_mcp_config_project_id',
      columns: ['projectId'],
      unique: true,
    },
  ],
});
