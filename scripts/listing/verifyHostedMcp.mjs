#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Verifies the hosted MCP server the way a directory reviewer would, for the
// ChatGPT / Anthropic listing evidence: initialize, tools/list (titles and
// annotations), and the documented lookup_api discovery call. Anonymous use,
// so no credentials are needed.
//
// Usage: node scripts/listing/verifyHostedMcp.mjs [--url <mcp-url>] [--json]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://mcp.kernelcad.com/mcp';

function arg(name) {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
}

export async function verifyHostedMcp(url = MCP_URL) {
  const client = new Client({ name: 'kernelcad-listing-verify', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  try {
    await client.connect(transport);
    const server = client.getServerVersion();
    const { tools } = await client.listTools();
    const withoutTitle = tools.filter((t) => !t.title).map((t) => t.name);
    const withoutAnnotations = tools.filter((t) => !t.annotations).map((t) => t.name);
    const lookup = await client.callTool({ name: 'lookup_api', arguments: {} });
    const text = (lookup.content ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
    return {
      url,
      serverName: server?.name ?? null,
      serverVersion: server?.version ?? null,
      toolCount: tools.length,
      withTitle: tools.length - withoutTitle.length,
      withAnnotations: tools.length - withoutAnnotations.length,
      withoutTitle,
      withoutAnnotations,
      lookupApi: {
        isError: lookup.isError === true,
        bytes: text.length,
        prefix: text.slice(0, 120),
      },
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

function report(result) {
  console.log(`Hosted MCP verification — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`URL: ${result.url}`);
  console.log(`Server: ${result.serverName ?? '?'} ${result.serverVersion ?? ''}`.trim());
  console.log(`Tools: ${result.toolCount}`);
  console.log(`With title: ${result.withTitle}/${result.toolCount}`);
  console.log(`With annotations: ${result.withAnnotations}/${result.toolCount}`);
  console.log(`lookup_api: ${result.lookupApi.isError ? 'ERROR' : 'ok'}, ${result.lookupApi.bytes} chars`);
  console.log(`  response starts: ${JSON.stringify(result.lookupApi.prefix)}`);
  if (result.withoutTitle.length) console.log(`Missing titles: ${result.withoutTitle.join(', ')}`);
  if (result.withoutAnnotations.length) console.log(`Missing annotations: ${result.withoutAnnotations.join(', ')}`);
}

function hasFailures(result) {
  return (
    result.toolCount === 0 ||
    result.withoutTitle.length > 0 ||
    result.withoutAnnotations.length > 0 ||
    result.lookupApi.isError ||
    result.lookupApi.bytes === 0
  );
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  const result = await verifyHostedMcp(arg('--url') ?? MCP_URL);
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else report(result);
  process.exit(hasFailures(result) ? 1 : 0);
}
