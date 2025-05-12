import { logger } from '@openops/server-shared';
import { experimental_createMCPClient, tool } from 'ai';
import { spawn } from 'child_process';
import { z } from 'zod';

const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH;

export const mcpTools = {
  docsMcpClient: tool({
    description:
      'Search across the OpenOps Documentation documentation to fetch relevant context for a given query (via experimental_createMCPClient stdio)',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      let client;
      if (!MCP_SERVER_PATH) {
        throw new Error('MCP_SERVER_PATH not set');
      }

      try {
        // Custom MCPTransport for stdio
        const child = spawn('node', [MCP_SERVER_PATH]);
        let onmessage: ((msg: unknown) => void) | undefined;
        let onclose: (() => void) | undefined;
        let onerror: ((err: Error) => void) | undefined;
        let isClosed = false;

        child.stdout.on('data', (data) => {
          if (onmessage) {
            try {
              const lines = data.toString().split('\n');
              for (const line of lines) {
                if (line.trim().length > 0) {
                  onmessage(JSON.parse(line));
                }
              }
            } catch (err) {
              if (onerror)
                onerror(err instanceof Error ? err : new Error(String(err)));
            }
          }
        });
        child.stderr.on('data', (data) => {
          if (onerror) onerror(new Error(data.toString()));
        });
        child.on('close', () => {
          isClosed = true;
          if (onclose) onclose();
        });

        const transport = {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          start: async () => {},
          send: async (message: unknown) => {
            child.stdin.write(JSON.stringify(message) + '\n');
          },
          close: async () => {
            if (!isClosed) child.kill();
          },
          set onclose(fn: (() => void) | undefined) {
            onclose = fn;
          },
          set onerror(fn: ((err: Error) => void) | undefined) {
            onerror = fn;
          },
          set onmessage(fn: ((msg: unknown) => void) | undefined) {
            onmessage = fn;
          },
        };

        client = await experimental_createMCPClient({
          transport,
        });
        const tools = await client.tools();
        if (!tools['search'] || typeof tools['search'].execute !== 'function') {
          throw new Error('search tool not found on MCP server');
        }
        // Call the search tool with correct signature
        const result = await tools['search'].execute(
          { query },
          { toolCallId: '', messages: [] },
        );
        return result;
      } catch (error) {
        logger.error('searchMcpClient tool error:', error);
        throw new Error(
          `searchMcpClient failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        if (client) {
          await client.close();
        }
      }
    },
  }),
};
