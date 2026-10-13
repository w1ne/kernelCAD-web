// Actual stdio MCP calls; never launches a browser. Reuse an existing Chrome
// session to inspect the printed link before typing `next`, then `close`.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const directory = new URL('.', import.meta.url);
const client = new Client({ name: 'viewer-link-demo', version: '1' });
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/cli/index.js', 'mcp'], env: { ...process.env, KERNELCAD_TELEMETRY: '0' }, stderr: 'pipe' });
const input = createInterface({ input: process.stdin });
let cleanupTimer;
let lifetimeTimer;
async function close() { clearTimeout(cleanupTimer); clearTimeout(lifetimeTimer); input.close(); await client.close(); }
function idle() { clearTimeout(cleanupTimer); cleanupTimer = setTimeout(() => { void close(); }, 180_000); }
lifetimeTimer = setTimeout(() => { void close(); }, 600_000);
await client.connect(transport);
const code = await readFile(new URL('model.kcad.ts', directory), 'utf8');
async function call(name, args, output) {
  const wire = await client.callTool({ name, arguments: args });
  const result = JSON.parse(wire.content[0].text);
  if (!result.ok || !result.viewerUrl) throw new Error(JSON.stringify(result));
  const url = new URL(result.viewerUrl);
  url.pathname = '/__kernelcad/mesh';
  const mesh = await (await fetch(url)).json();
  const sourceUrl = new URL(result.viewerUrl);
  sourceUrl.pathname = '/__kernelcad/source';
  const source = await (await fetch(sourceUrl)).json();
  const evidence = { capturedAt: new Date().toISOString(), name, args, result, source, mesh };
  await writeFile(new URL(output, directory), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ step: output, result, bounds: mesh.bounds, volume: mesh.features.at(-1).volume }));
  return result;
}
const first = await call('evaluate_script', { code }, 'first.json');
console.log('Open viewerUrl in the existing Chrome session. Type next to update the same link.');
idle();
for await (const line of input) {
  idle();
  if (line.trim() === 'next') {
    const second = await call('set_param', { code, param_name: 'width', new_value: 40 }, 'second.json');
    if (second.viewerUrl !== first.viewerUrl) throw new Error('Viewer link changed');
    console.log('Same link verified. Inspect the already-open Studio tab; type close when done.');
  } else if (line.trim() === 'close') { await close(); break; }
}
