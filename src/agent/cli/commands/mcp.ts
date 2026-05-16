// src/cli/commands/mcp.ts
import { Command } from 'commander';
import { runStdioServer } from '../../mcp/server';

export function mcpCommand(): Command {
  return new Command('mcp')
    .description('Run the kernelCAD MCP server (stdio transport).')
    .action(async () => {
      // The MCP protocol uses stdout for JSON-RPC. Errors and any non-protocol
      // logs go to stderr.
      try {
        await runStdioServer();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`MCP server failed: ${msg}\n`);
        process.exitCode = 1;
      }
    });
}
