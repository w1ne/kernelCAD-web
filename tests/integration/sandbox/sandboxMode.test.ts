// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// End-to-end sandbox mode through the real CLI entry point (tsx, no build
// needed): KERNELCAD_SANDBOX=1 and the --sandbox / --workspace flags, for
// both `kernelcad <command>` and the stdio MCP server.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const TSX = join(ROOT, 'node_modules/.bin/tsx');
const CLI = join(ROOT, 'src/agent/cli/index.ts');
const PLATE = 'return box(40, 20, 4).subtract(cylinder(6, 3).translate(20, 10, -1));\n';

let base: string;
let ws: string;
let outside: string;

function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env, ...extra };
  delete env.KERNELCAD_SANDBOX;
  delete env.KERNELCAD_WORKSPACE;
  Object.assign(env, extra);
  return env;
}

function cli(args: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const r = spawnSync(TSX, [CLI, ...args], { cwd: opts.cwd ?? ws, env: cleanEnv(opts.env), encoding: 'utf8', timeout: 120_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

interface RpcMsg { id?: number; result?: Record<string, unknown>; error?: unknown }

async function mcp(args: string[], calls: Array<{ name: string; arguments: Record<string, unknown> }>, env: Record<string, string> = {}): Promise<RpcMsg[]> {
  const child = spawn(TSX, [CLI, 'mcp', ...args], { cwd: ws, env: cleanEnv(env), stdio: ['pipe', 'pipe', 'pipe'] });
  const want = calls.length + 2;
  let buf = '';
  const done = new Promise<RpcMsg[]>((res, rej) => {
    const timer = setTimeout(() => { child.kill(); rej(new Error(`mcp timeout: ${buf.slice(0, 400)}`)); }, 110_000);
    child.stdout.on('data', d => {
      buf += String(d);
      // Only complete lines: tools/list arrives in several chunks.
      const lines = buf.split('\n').slice(0, -1).filter(l => l.trim() !== '');
      if (lines.length >= want) { clearTimeout(timer); child.kill(); res(lines.map(l => JSON.parse(l) as RpcMsg)); }
    });
  });
  const send = (m: object): void => { child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...m })}\n`); };
  send({ id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'sandbox-test', version: '1' } } });
  send({ id: 1, method: 'tools/list', params: {} });
  calls.forEach((c, i) => send({ id: i + 2, method: 'tools/call', params: c }));
  const msgs = await done;
  return msgs.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

function toolText(m: RpcMsg): Record<string, unknown> {
  const content = (m.result?.content as Array<{ text: string }>)[0]!;
  return JSON.parse(content.text) as Record<string, unknown>;
}

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-e2e-')));
  ws = join(base, 'ws');
  outside = join(base, 'outside');
  mkdirSync(ws, { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(ws, 'plate.kcad.ts'), PLATE);
  writeFileSync(join(outside, 'plate.kcad.ts'), PLATE);
  symlinkSync(outside, join(ws, 'escape'));
});

afterAll(() => rmSync(base, { recursive: true, force: true }));

describe('kernelcad CLI in sandbox mode', () => {
  it('KERNELCAD_SANDBOX=1: in-workspace export succeeds; escapes are refused with the registered code', () => {
    const env = { KERNELCAD_SANDBOX: '1' };
    const ok = cli(['export', 'stl', 'plate.kcad.ts', '-o', 'plate.stl', '--no-verify'], { env });
    expect(ok.code, ok.err + ok.out).toBe(0);
    expect(existsSync(join(ws, 'plate.stl'))).toBe(true);

    for (const out of ['../outside/plate.stl', join(outside, 'plate.stl'), 'escape/plate.stl']) {
      const r = cli(['export', 'stl', 'plate.kcad.ts', '-o', out], { env });
      expect(r.code, out).toBe(2);
      expect(r.err).toContain('[cli.sandbox-path-denied]');
    }
    const read = cli(['export', 'stl', '../outside/plate.kcad.ts', '-o', 'out/x.stl'], { env });
    expect(read.code).toBe(2);
    expect(read.err).toContain('[cli.sandbox-path-denied]');
    expect(existsSync(join(outside, 'plate.stl'))).toBe(false);
  }, 180_000);

  it('--sandbox --workspace flag form, sandbox status and the online-only refusals', () => {
    const status = cli(['--sandbox', '--workspace', ws, 'sandbox', 'status', '--json'], { cwd: base });
    expect(status.code, status.err).toBe(0);
    const s = JSON.parse(status.out) as { enabled: boolean; workspaceRoot: string; network: { outbound: string }; telemetry: string };
    expect(s).toMatchObject({ enabled: true, workspaceRoot: ws, network: { outbound: 'refused' }, telemetry: 'forced-off' });

    const off = cli(['sandbox', 'status', '--json']);
    expect(JSON.parse(off.out)).toMatchObject({ enabled: false });

    const stats = cli(['stats', '--sandbox']);
    expect(stats.code).toBe(2);
    expect(stats.err).toContain('[cli.sandbox-command-refused]');

    const check = cli(['sandbox', 'check', '../outside/plate.kcad.ts', '--sandbox']);
    expect(check.code).toBe(2);
    expect(check.out).toContain('REFUSED');
  }, 120_000);

  it('a script reading a STEP file outside the workspace gets cli.sandbox-path-denied', () => {
    writeFileSync(join(ws, 'reads-out.kcad.ts'), `return await lib.fromSTEP(${JSON.stringify(join(outside, 'part.step'))});\n`);
    const r = cli(['evaluate', 'reads-out.kcad.ts', '--json', '--sandbox']);
    expect(r.out + r.err).toContain('cli.sandbox-path-denied');
  }, 120_000);
});

describe('kernelcad mcp in sandbox mode', () => {
  it('flag form: initialize reports the sandbox, tools enforce it', async () => {
    const msgs = await mcp(['--sandbox'], [
      { name: 'export', arguments: { target: 'model', file: 'plate.kcad.ts', format: 'stl', output_path: 'out/mcp.stl' } },
      { name: 'export', arguments: { target: 'model', file: 'plate.kcad.ts', format: 'stl', output_path: 'escape/mcp.stl' } },
      { name: 'import_step', arguments: { url: 'https://example.com/bracket.step' } },
      { name: 'fetch_part', arguments: { id: 'bearing-608', partsBaseUrl: 'https://parts.example.com' } },
    ]);
    const init = msgs[0]!.result!;
    expect((init.serverInfo as { title?: string }).title).toBe('kernelCAD (sandbox mode)');
    expect(String(init.instructions)).toContain('SANDBOX MODE is ON');
    expect(String(init.instructions)).toContain(ws);
    const tools = (msgs[1]!.result!.tools as Array<{ name: string; description: string }>);
    expect(tools.find(t => t.name === 'send_to_printer')!.description).toContain('SANDBOX MODE: unavailable');

    expect(toolText(msgs[2]!)).toMatchObject({ ok: true });
    expect(existsSync(join(ws, 'out/mcp.stl'))).toBe(true);
    expect(msgs[3]!.result!.isError).toBe(true);
    expect(toolText(msgs[3]!)).toMatchObject({ ok: false, errorCode: 'cli.sandbox-path-denied' });
    expect(toolText(msgs[4]!)).toMatchObject({ errorCode: 'cli.sandbox-network-denied' });
    expect(toolText(msgs[5]!)).toMatchObject({ errorCode: 'cli.sandbox-network-denied' });
    expect(existsSync(join(outside, 'mcp.stl'))).toBe(false);
  }, 120_000);

  it('env form: KERNELCAD_SANDBOX=1 + KERNELCAD_WORKSPACE', async () => {
    const msgs = await mcp([], [
      { name: 'evaluate_script', arguments: { file: join(outside, 'plate.kcad.ts') } },
    ], { KERNELCAD_SANDBOX: '1', KERNELCAD_WORKSPACE: ws });
    expect(String(msgs[0]!.result!.instructions)).toContain(ws);
    expect(toolText(msgs[2]!)).toMatchObject({ errorCode: 'cli.sandbox-path-denied' });
  }, 120_000);

  it('without the sandbox, no instructions are sent', async () => {
    const msgs = await mcp([], []);
    expect(msgs[0]!.result!.instructions).toBeUndefined();
  }, 120_000);
});
