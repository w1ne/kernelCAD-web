// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/cli/commands/mcp.ts
import { Command } from 'commander';
import { runStdioServer } from '../../mcp/server';

export function mcpCommand(): Command {
  return new Command('mcp')
    .description('Run the kernelCAD MCP server (stdio transport).')
    .option('--cloud', 'proxy MCP tools through the hosted kernelCAD cloud kernel')
    .option('--api-base-url <url>', 'kernelCAD API base URL', process.env.KERNELCAD_API_BASE_URL)
    .option('--token <token>', 'kernelCAD MCP token', process.env.KERNELCAD_API_TOKEN)
    .action(async (opts: { cloud?: boolean; apiBaseUrl?: string; token?: string }) => {
      // The MCP protocol uses stdout for JSON-RPC. Errors and any non-protocol
      // logs go to stderr.
      try {
        await runStdioServer({
          cloud: Boolean(opts.cloud),
          cloudOptions: {
            ...(opts.apiBaseUrl ? { apiBaseUrl: opts.apiBaseUrl } : {}),
            ...(opts.token ? { token: opts.token } : {}),
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`MCP server failed: ${msg}\n`);
        process.exitCode = 1;
      }
    });
}
