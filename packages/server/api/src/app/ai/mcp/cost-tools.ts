import { AwsAuth } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AppConnectionType, CustomAuthConnectionValue } from '@openops/shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { mcpConfigService } from '../../mcp/config/mcp-config.service';
import { MCPTool } from './mcp-tools';

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

async function getAwsCredentials(
  projectId: string,
): Promise<AwsCredentials | null> {
  const mcpConfig = await mcpConfigService.get(projectId);
  if (!mcpConfig?.amazonCost?.enabled) {
    logger.debug(
      'Amazon Cost is not enabled in MCP config, skipping AWS tools',
    );
    return null;
  }

  const connection = await appConnectionService.getOne({
    projectId,
    name: mcpConfig.amazonCost.connectionName,
  });

  if (!connection) {
    logger.debug('AWS connection not found, skipping AWS tools');
    return null;
  }

  if (connection.type !== AppConnectionType.CUSTOM_AUTH) {
    logger.debug('Connection is not a custom auth type, skipping AWS tools');
    return null;
  }

  const awsAuth = (connection.value as CustomAuthConnectionValue)
    .props as unknown as AwsAuth;
  const awsAccessKeyId = awsAuth.accessKeyId;
  const awsSecretAccessKey = awsAuth.secretAccessKey;
  const awsRegion = awsAuth.defaultRegion ?? 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    logger.debug('AWS credentials not found in connection, skipping AWS tools');
    return null;
  }

  return {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
  };
}

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

  const credentials = await getAwsCredentials(projectId);
  if (!credentials) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

  logger.debug('Initializing cost explorer MCP client with AWS credentials', {
    region: credentials.region,
    hasAccessKey: !!credentials.accessKeyId,
    hasSecretKey: !!credentials.secretAccessKey,
  });

  const costExplorerClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_REGION: credentials.region,
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

export async function getCostAnalysisTools(
  projectId: string,
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.COST_ANALYSIS_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(
    basePath,
    'awslabs',
    'cost_analysis_mcp_server',
    'server.py',
  );

  const credentials = await getAwsCredentials(projectId);
  if (!credentials) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

  logger.debug('Initializing cost analysis MCP client with AWS credentials', {
    region: credentials.region,
    hasAccessKey: !!credentials.accessKeyId,
    hasSecretKey: !!credentials.secretAccessKey,
  });

  const costAnalysisClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_REGION: credentials.region,
        COST_EXPLORER_MCP_SERVER_PATH: basePath,
        AWS_SDK_LOAD_CONFIG: '1',
      },
    }),
  });

  const tools = await costAnalysisClient.tools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolSet: Record<string, any> = {};
  for (const [key, tool] of Object.entries(tools)) {
    toolSet[key] = {
      ...tool,
      toolProvider: 'cost-analysis',
    };
  }

  return {
    client: costAnalysisClient,
    toolSet,
  };
}
