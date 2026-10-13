// SPDX-License-Identifier: MIT
// Local validation adapter: reuse the existing Playwright extension tab.
// Run: PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx docs/demos/mcp-step-snapshots/capture.ts
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { getActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { captureStepState, createStepEvidence } from '../../../src/agent/mcp/tools/stepEvidence';
import { meshForHeadlessRender } from '../../../src/agent/render/headlessRender';
import { resolveRenderBaseUrl } from '../../../src/agent/render/playerServer';

const out = resolve('docs/demos/mcp-step-snapshots/evidence');
await mkdir(out, { recursive: true });
const beforeCode = 'return box(60, 40, 20);';
const afterCode = "return box(90, 40, 20).hole('top', { u: 0, v: 0, diameter: 12, depth: 'through' });";
await writeFile(`${out}/before-source.kcad.ts`, beforeCode);
await writeFile(`${out}/after-source.kcad.ts`, afterCode);
const first = await evaluateScriptTool({ code: beforeCode });
const before = captureStepState(getActiveMcpSession()?.rootShape);
const second = await evaluateScriptTool({ code: afterCode });
const after = captureStepState(getActiveMcpSession()?.rootShape);
const base = await resolveRenderBaseUrl();
let job: unknown;
let resolveImage: ((image: Buffer) => void) | undefined;
let idle: ReturnType<typeof setTimeout>;
const resetIdle = () => { clearTimeout(idle); idle = setTimeout(() => { void close(); }, 60_000); };
const server = createServer(async (req, res) => {
  resetIdle();
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.end(); return; }
  if (req.url === '/job') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(job ?? null)); return; }
  if (req.url === '/image' && req.method === 'POST') {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    resolveImage?.(Buffer.concat(chunks)); resolveImage = undefined; job = undefined;
    res.end('ok'); return;
  }
  res.statusCode = 404; res.end();
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const address = server.address() as { port: number };
const url = `http://127.0.0.1:${address.port}`;
async function close() { clearTimeout(idle); clearTimeout(lifetime); server.closeAllConnections(); server.close(); await base.close(); }
const lifetime = setTimeout(() => { void close(); }, 300_000);
resetIdle();
console.log(JSON.stringify({ jobUrl: url, playerUrl: `${base.baseUrl}/?headless=1&nowatermark=1` }));
try {
  const step = await createStepEvidence(before, after, second.ok, second.featureHealth, async (scriptPath, frame) => {
    const { serialized } = await meshForHeadlessRender({ scriptPath, viewportWidth: frame.width, viewportHeight: frame.height });
    const image = new Promise<Buffer>(r => { resolveImage = r; });
    job = { meshes: serialized, frame };
    const raw = await image;
    // Same central square crop / tile resize as the engineering renderer.
    return sharp(raw).extract({ left: 420, top: 0, width: 1080, height: 1080 }).resize(512, 512).png().toBuffer();
  });
  await writeFile(`${out}/result.json`, JSON.stringify({ provenance: 'Local validation: real kernel builds, existing Chrome extension adapter; not deployed or hardware accepted.', before: first, after: second, step }, null, 2));
  if (step.snapshots.status !== 'captured') throw new Error(step.snapshots.error);
  for (const side of ['before', 'after'] as const) {
    const image = await sharp(step.snapshots[side]!).toBuffer();
    await writeFile(`${out}/${side}.png`, image);
  }
  console.log('Local validation pair captured.');
} finally { await close(); }
