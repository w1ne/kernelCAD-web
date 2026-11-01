// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/server.ts
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, TOOLS } from './toolRegistry';
import {
  callCloudTool,
  listCloudTools,
  listCloudResources,
  readCloudResource,
  type CloudMcpOptions,
} from './cloudClient';
import { closeMcpViewer } from './liveViewer';
import { recordToolCall, maybeShowFirstRunNotice, flushTelemetry } from '../../shared/telemetry';
import { isSandboxEnabled } from '../../shared/sandbox/config';
import { isSandboxError, sandboxCommandRefused } from '../../shared/sandbox/errors';
import { sandboxAgentInstructions, sandboxStatus } from '../../shared/sandbox/status';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { sandboxToolDefinition } from './sandboxArgs';

const requireFromHere = createRequire(import.meta.url);
// At source: src/agent/mcp/server.ts → ../../../package.json (3 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const pkg = loadPkg();
const SESSION_ID = randomUUID();

export { TOOLS };

export interface McpServerOptions {
  cloud?: boolean;
  cloudOptions?: CloudMcpOptions;
}

export function createMcpServer(options: McpServerOptions = {}): Server {
  // Slice C (2026-05-24): in cloud mode the bridge proxies resources/* to
  // the hosted gateway so Claude Desktop can read the kernelcad-authoring
  // SKILL.md on connection. Local-only mode has no resources to expose.
  const capabilities: { tools: object; resources?: object } = { tools: {} };
  if (options.cloud) {
    capabilities.resources = {};
  }

  const sandboxed = isSandboxEnabled();
  if (sandboxed && options.cloud) {
    throw sandboxCommandRefused('kernelcad mcp --cloud', 'cloud mode proxies every tool call to the hosted kernelCAD API');
  }
  const instructions = sandboxAgentInstructions();
  const server = new Server(
    { name: 'kernelcad', version: pkg.version, ...(sandboxed ? { title: 'kernelCAD (sandbox mode)' } : {}) },
    { capabilities, ...(instructions !== '' ? { instructions } : {}) },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: options.cloud ? await listCloudTools(options.cloudOptions) : TOOLS.map(sandboxToolDefinition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const input = (args ?? {}) as Record<string, unknown>;
    const mode = options.cloud ? 'cloud' : 'local';
    const startedAt = Date.now();
    try {
      const result = options.cloud
        ? await callCloudTool(name, input, options.cloudOptions)
        : await callMcpTool(name, input);
      recordToolCall({ toolName: name, mode, outcome: 'ok', durationMs: Date.now() - startedAt, sessionId: SESSION_ID });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        // Current MCP clients validate advertised outputSchema against this field.
        ...(result !== null && typeof result === 'object' && !Array.isArray(result)
          ? { structuredContent: result as Record<string, unknown> }
          : {}),
      };
    } catch (err) {
      recordToolCall({ toolName: name, mode, outcome: 'error', durationMs: Date.now() - startedAt, sessionId: SESSION_ID });
      if (isSandboxError(err)) return sandboxRefusalResult(err);
      throw err;
    }
  });

  if (options.cloud) {
    // Proxy the local stdio client's resources/list to the hosted gateway.
    // A 404 from the gateway is mapped by listCloudResources() to an empty
    // list so Claude Desktop tolerates servers that haven't shipped the
    // resources endpoints yet.
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: await listCloudResources(options.cloudOptions),
    }));

    // Proxy resources/read to the hosted gateway. The hosted gateway returns
    // the MCP contract shape ({ contents: [{ uri, mimeType, text }] }) so we
    // pass the array through unchanged.
    server.setRequestHandler(ReadResourceRequestSchema, async (req) => ({
      contents: await readCloudResource(req.params.uri, options.cloudOptions),
    }));
  }

  if (!options.cloud) server.onclose = () => { void closeMcpViewer(); };
  return server;
}

/** A sandbox refusal as a structured MCP tool error (isError results skip outputSchema validation). */
function sandboxRefusalResult(err: Error & { code: keyof typeof NEXT_ACTIONS; hint?: string }) {
  const status = sandboxStatus();
  const body = {
    ok: false,
    error: err.message,
    errorCode: err.code,
    hint: err.hint,
    nextAction: NEXT_ACTIONS[err.code],
    sandbox: { workspaceRoot: status.workspaceRoot, network: status.network, docs: status.docs },
  };
  return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(body, null, 2) }] };
}

export async function runStdioServer(options: McpServerOptions = {}): Promise<void> {
  maybeShowFirstRunNotice();
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  // A client that dies mid-session (agent killed, quota pause, transport
  // proxy torn down) closes our stdio pipes. Without handlers, the next write
  // raises an unhandled 'error' event (EPIPE) and the process dies with a
  // stack trace — which surfaces to agents as "Transport closed". Exit
  // quietly instead; the client is gone either way.
  const onPipeClosed = (e: NodeJS.ErrnoException): void => {
    if (e?.code === 'EPIPE' || e?.code === 'ERR_STREAM_DESTROYED' || e?.code === 'ECONNRESET') process.exit(0);
  };
  process.stdout.on('error', onPipeClosed);
  process.stdin.on('error', () => process.exit(0));
  process.stderr.on('error', () => undefined);
  process.once('beforeExit', () => { void flushTelemetry(); });
  process.once('SIGINT', () => { void flushTelemetry().finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void flushTelemetry().finally(() => process.exit(0)); });
  await server.connect(transport);
}
