import { logger } from '@openops/server-shared';
import { experimental_createMCPClient, tool } from 'ai';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { z } from 'zod';

const DOCS_MCP_SERVER_PATH =
  process.env.DOCS_MCP_SERVER_PATH || '/root/.mcp/docs.openops.com';

// Singleton holder for the MCP process
let mcpProcess: ChildProcessWithoutNullStreams | null = null;
let clientPromise: Promise<
  ReturnType<typeof experimental_createMCPClient>
> | null = null;

const listeners: {
  onmessage?: (msg: unknown) => void;
  onerror?: (err: Error) => void;
  onclose?: () => void;
} = {};

function startMCPProcess(): ChildProcessWithoutNullStreams {
  if (mcpProcess && !mcpProcess.killed) {
    return mcpProcess;
  }

  logger.info('Starting MCP server...');
  mcpProcess = spawn('node', [DOCS_MCP_SERVER_PATH]);

  mcpProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          const msg = JSON.parse(line);
          listeners.onmessage?.(msg);
        } catch (err) {
          listeners.onerror?.(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    listeners.onerror?.(new Error(data.toString()));
  });

  mcpProcess.on('close', () => {
    logger.warn('MCP process closed');
    mcpProcess = null;
    clientPromise = null;
    listeners.onclose?.();
  });

  return mcpProcess;
}

function getTransport() {
  const process = startMCPProcess();
  return {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    start: async () => {},
    send: async (message: unknown) => {
      process.stdin.write(JSON.stringify(message) + '\n');
    },
    close: async () => {
      process.kill();
    },
    set onclose(fn: (() => void) | undefined) {
      listeners.onclose = fn;
    },
    set onerror(fn: ((err: Error) => void) | undefined) {
      listeners.onerror = fn;
    },
    set onmessage(fn: ((msg: unknown) => void) | undefined) {
      listeners.onmessage = fn;
    },
  };
}

async function getMCPClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve(
      experimental_createMCPClient({
        transport: getTransport(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as unknown as any,
    );
  }
  return clientPromise;
}

export const mcpTools = {
  docsMcpClient: tool({
    description:
      'Search OpenOps documentation using the MCP tool (persistent long-running process)',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      try {
        const client = await getMCPClient();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tools = await client!.tools();

        const searchTool = tools['search'];
        if (!searchTool || typeof searchTool.execute !== 'function') {
          throw new Error('search tool not available');
        }

        const result = await searchTool.execute(
          { query },
          { toolCallId: '', messages: [] },
        );
        return result;
      } catch (error) {
        logger.error('Persistent searchMcpClient tool error:', error);
        throw new Error(
          `Persistent searchMcpClient failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  }),
};
