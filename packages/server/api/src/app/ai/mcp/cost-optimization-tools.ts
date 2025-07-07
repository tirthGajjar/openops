import { AppSystemProp, logger, system } from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';
import { MCPTool } from './mcp-tools';

export async function getCostOptimizationTools(
  projectId: string,
  costExplorerData: any,
  costAnalysisData: any
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'cost-optimization-server', 'server.py');

  logger.debug('Initializing cost optimization MCP client', {
    projectId,
    hasExplorerData: !!costExplorerData,
    hasAnalysisData: !!costAnalysisData,
  });

  try {
    const client = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          PROJECT_ID: projectId,
          COST_EXPLORER_DATA: JSON.stringify(costExplorerData),
          COST_ANALYSIS_DATA: JSON.stringify(costAnalysisData),
          OPENOPS_MCP_SERVER_PATH: basePath,
        },
      }),
    });

    const tools = await client.tools();
    const toolSet: Record<string, any> = {};
    for (const [key, tool] of Object.entries(tools)) {
      toolSet[key] = {
        ...tool,
        toolProvider: 'cost-optimization',
      };
    }

    logger.debug('Cost optimization tools loaded successfully', {
      toolCount: Object.keys(toolSet).length,
    });

    return {
      client,
      toolSet,
    };
  } catch (error) {
    logger.error('Failed to initialize cost optimization MCP client', error);
    return {
      client: undefined,
      toolSet: {},
    };
  }
}
