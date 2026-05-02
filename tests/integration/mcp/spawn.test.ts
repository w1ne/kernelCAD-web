// tests/integration/mcp/spawn.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolvePath(__dirname, '../../../dist/cli/index.js');

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

async function callTool(toolName: string, args: object): Promise<unknown> {
  if (!existsSync(CLI_BIN)) {
    throw new Error(`CLI binary not found at ${CLI_BIN} — run 'npm run build:cli' first.`);
  }

  const child = spawn('node', [CLI_BIN, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });

  let stdoutBuf = '';
  let stderrBuf = '';
  child.stdout!.on('data', (chunk) => { stdoutBuf += chunk.toString(); });
  child.stderr!.on('data', (chunk) => { stderrBuf += chunk.toString(); });

  const initReq = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' },
    },
  }) + '\n';
  const callReq = JSON.stringify({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: toolName, arguments: args },
  }) + '\n';

  child.stdin!.write(initReq);
  child.stdin!.write(callReq);

  // Wait for two complete JSON responses on stdout
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP timed out. stdout=${stdoutBuf.slice(0, 500)} stderr=${stderrBuf.slice(0, 500)}`));
    }, 60000);

    const checkComplete = () => {
      const lines = stdoutBuf.split('\n').filter(l => l.trim().length > 0);
      if (lines.length >= 2) {
        // Try parsing — if both succeed, we have two responses
        try {
          JSON.parse(lines[0]);
          JSON.parse(lines[1]);
          clearTimeout(timer);
          resolve();
        } catch { /* keep waiting */ }
      }
    };

    child.stdout!.on('data', checkComplete);
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    checkComplete(); // in case data already arrived
  });

  child.kill();

  const lines = stdoutBuf.split('\n').filter(l => l.trim().length > 0);
  const callResp: JsonRpcResponse = JSON.parse(lines[1]);
  if (callResp.error) throw new Error(`tools/call failed: ${callResp.error.message}`);
  return callResp.result;
}

// Skip the suite when the CLI bundle isn't built. As of rc.12, `npm run qc`
// runs `npm run build:cli` BEFORE vitest, so the bundle is always present in
// the pre-merge gate. The skipIf only triggers for inner-loop developer runs
// (e.g. `npm test` directly without a prior build) — that case is non-failing
// because the dedicated bundle-startup sentinel at
// `tests/integration/cli-bundle/startup.test.ts` enforces presence at the gate.
const SKIP = !existsSync(CLI_BIN);

describe.skipIf(SKIP)('MCP server (spawn)', () => {
  it('responds to evaluate_script with success on a valid box script', async () => {
    const result = await callTool('evaluate_script', { code: 'return box(10, 10, 10);' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.featureCount).toBe(1);
  }, 90000);

  it('responds to list_features with feature kinds', async () => {
    const result = await callTool('list_features', {
      code: 'return box(10, 10, 10).fillet(2);',
    });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.features.map((f: { kind: string }) => f.kind)).toEqual(['box', 'fillet']);
  }, 90000);

  it('responds to list_topology with canonical box face names', async () => {
    const result = await callTool('list_topology', { code: 'return box(10, 10, 10);' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.faceNames).toEqual(expect.arrayContaining(['top', 'bottom']));
  }, 90000);

  it('responds to get_edges_of with 4 edges of the top face of a box', async () => {
    const result = await callTool('get_edges_of', { code: 'return box(20, 20, 20);', face_name: 'top' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.edges).toHaveLength(4);
  }, 90000);

  it('responds to why_did_this_fail with healthy on a clean script', async () => {
    const result = await callTool('why_did_this_fail', { code: 'return box(10, 10, 10);' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.health).toBe('healthy');
  }, 90000);

  it('responds to set_param_value with edited code + diagnostics', async () => {
    const result = await callTool('set_param_value', {
      code: `const w = param('Width', 60, { unit: 'mm' });\nreturn box(w, 20, 5);`,
      param_name: 'Width',
      new_value: 120,
    });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.new_code).toContain(`param('Width', 120,`);
  }, 90000);

  it('responds to add_feature with edited code + diagnostics', async () => {
    const result = await callTool('add_feature', {
      code: `const base = box(20, 20, 5);\nreturn base;`,
      feature_code: `const hole = cylinder(5, 2).translate(10, 10, -1);`,
    });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.new_code).toContain(`const hole = cylinder(5, 2)`);
  }, 90000);

  it('responds to remove_feature with edited code + diagnostics', async () => {
    const result = await callTool('remove_feature', {
      code: `const base = box(20, 20, 5);\nconst hole = cylinder(5, 2);\nreturn base;`,
      match: `cylinder(5, 2)`,
    });
    const text = (result as { content: { text: string }[] }).content[0].text;
    const payload = JSON.parse(text);
    expect(payload.ok).toBe(true);
    expect(payload.new_code).not.toContain(`cylinder(5, 2)`);
  }, 90000);
});
