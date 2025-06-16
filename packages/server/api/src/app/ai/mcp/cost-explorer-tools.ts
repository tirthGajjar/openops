import { AwsAuth } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AppConnectionType, CustomAuthConnectionValue } from '@openops/shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { mcpConfigService } from '../../mcp/config/mcp-config.service';
import { MCPTool } from './mcp-tools';

export async function getCostExplorerTools(
  projectId: string,
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.COST_EXPLORER_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(
    basePath,
    'awslabs',
    'cost_explorer_mcp_server',
    'server.py',
  );

  const mcpConfig = await mcpConfigService.get(projectId);
  if (!mcpConfig?.amazonCost?.enabled) {
    logger.debug(
      'Amazon Cost is not enabled in MCP config, skipping cost explorer tools',
    );
    return {
      client: undefined,
      toolSet: {},
    };
  }
  const connection = await appConnectionService.getOne({
    projectId,
    name: mcpConfig.amazonCost.connectionName,
  });

  if (!connection) {
    logger.debug('AWS connection not found, skipping cost explorer tools');
    logger.debug('projectId: ' + projectId);
    return {
      client: undefined,
      toolSet: {},
    };
  }

  if (connection.type !== AppConnectionType.CUSTOM_AUTH) {
    logger.debug(
      'Connection is not a custom auth type, skipping cost explorer tools',
    );
    return {
      client: undefined,
      toolSet: {},
    };
  }

  const awsAuth = (connection.value as CustomAuthConnectionValue)
    .props as unknown as AwsAuth;
  const awsAccessKeyId = awsAuth.accessKeyId;
  const awsSecretAccessKey = awsAuth.secretAccessKey;
  const awsRegion = awsAuth.defaultRegion ?? 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    logger.debug(
      'AWS credentials not found in connection, skipping cost explorer tools',
    );
    return {
      client: undefined,
      toolSet: {},
    };
  }

  logger.debug('Initializing cost explorer MCP client with AWS credentials', {
    region: awsRegion,
    hasAccessKey: !!awsAccessKeyId,
    hasSecretKey: !!awsSecretAccessKey,
    connectionName: mcpConfig.amazonCost.connectionName,
  });

  const costExplorerClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_REGION: awsRegion,
        COST_EXPLORER_MCP_SERVER_PATH: basePath,
        AWS_SDK_LOAD_CONFIG: '1',
      },
    }),
  });

  const tools = await costExplorerClient.tools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolSet: Record<string, any> = {};
  for (const [key, tool] of Object.entries(tools)) {
    toolSet[key] = {
      ...tool,
      toolProvider: 'cost-explorer',
    };
  }

  return {
    client: costExplorerClient,
    toolSet,
  };
}
