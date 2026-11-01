// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The two sandbox chokepoints, installed for real: node:fs (sync, callback,
// promise, ESM named imports, streams) and outbound network (fetch, http,
// https, raw net/tls sockets, DNS, UDP), plus the loopback policy.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fsNs from 'node:fs';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, realpathSync, rmSync, symlinkSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { disableSandboxForTest, enableSandbox } from '../../../../src/shared/sandbox/enable';
import { isSandboxError } from '../../../../src/shared/sandbox/errors';
import { isLoopbackHost } from '../../../../src/shared/sandbox/networkGuard';
import { isTelemetryEnabled } from '../../../../src/shared/telemetry/config';
import { resolveScriptRelativePath } from '../../../../src/shared/runtime/scriptRelativePath';

let base: string;
let ws: string;
let outside: string;
let savedEnv: NodeJS.ProcessEnv;

function expectSandboxCode(e: unknown, code: string): void {
  expect(isSandboxError(e), String(e)).toBe(true);
  expect((e as { code: string }).code).toBe(code);
}

async function caught(p: Promise<unknown> | (() => unknown)): Promise<unknown> {
  try {
    if (typeof p === 'function') p(); else await p;
  } catch (e) {
    return e;
  }
  throw new Error('expected a sandbox refusal');
}

beforeEach(() => {
  savedEnv = { ...process.env };
  base = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-guard-')));
  ws = join(base, 'ws');
  outside = join(base, 'outside');
  mkdirSync(ws, { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(outside, 'secret.txt'), 'secret');
  symlinkSync(outside, join(ws, 'escape'));
});

afterEach(() => {
  disableSandboxForTest();
  // Restore key by key: the real environ (read by os.tmpdir()) only follows
  // mutations of the live process.env object, not a replacement object.
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
  rmSync(base, { recursive: true, force: true });
});

describe('fs chokepoint', () => {
  it('refuses reads and writes outside the workspace through every API style', async () => {
    enableSandbox({ workspace: ws, env: process.env });
    expectSandboxCode(await caught(() => readFileSync(join(outside, 'secret.txt'))), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(() => fsNs.writeFileSync(join(outside, 'x'), 'x')), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(readFile(join(outside, 'secret.txt'))), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(writeFile(join(ws, 'escape', 'y'), 'y')), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(fsNs.promises.readFile('../outside/secret.txt')), 'cli.sandbox-path-denied');
    const cbErr = await new Promise(res => fsNs.readFile(join(outside, 'secret.txt'), err => res(err)));
    expectSandboxCode(cbErr, 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(() => fsNs.createWriteStream(join(outside, 's'))), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(() => fsNs.copyFileSync(join(outside, 'secret.txt'), join(ws, 'copy'))), 'cli.sandbox-path-denied');
    expectSandboxCode(await caught(() => fsNs.renameSync(join(ws, 'escape'), join(outside, 'moved'))), 'cli.sandbox-path-denied');
    expect((await caught(() => readFileSync('/etc/hostname')) as { errno?: string }).errno).toBe('EACCES');
  });

  it('existsSync reports refused paths as absent, workspace paths normally', () => {
    enableSandbox({ workspace: ws, env: process.env });
    writeFileSync(join(ws, 'in.txt'), 'ok');
    expect(existsSync(join(ws, 'in.txt'))).toBe(true);
    expect(existsSync(join(outside, 'secret.txt'))).toBe(false);
    expect(readFileSync(join(ws, 'in.txt'), 'utf8')).toBe('ok');
  });

  it('redirects tmp/cache/config into the workspace and forces telemetry off', async () => {
    const cfg = enableSandbox({ workspace: ws, env: process.env });
    const { tmpdir: tmp } = await import('node:os');
    expect(tmp()).toBe(cfg.scratch.tmp);
    expect(process.env.KERNELCAD_CACHE_DIR).toBe(cfg.scratch.cache);
    expect(process.env.KERNELCAD_SANDBOX).toBe('1');
    expect(isTelemetryEnabled()).toBe(false);
    const dir = fsNs.mkdtempSync(join(tmp(), 'kernelcad-x-'));
    expect(dir.startsWith(ws)).toBe(true);
  });

  it('script asset paths (lib.fromSTEP etc.) are refused at the resolver', async () => {
    enableSandbox({ workspace: ws, env: process.env });
    expect(resolveScriptRelativePath(ws, 'part.step')).toBe(join(ws, 'part.step'));
    expectSandboxCode(await caught(() => resolveScriptRelativePath(ws, '../outside/secret.txt')), 'cli.sandbox-path-denied');
  });

  it('is fully inert once disabled', () => {
    enableSandbox({ workspace: ws, env: process.env });
    disableSandboxForTest();
    expect(readFileSync(join(outside, 'secret.txt'), 'utf8')).toBe('secret');
  });
});

describe('network chokepoint', () => {
  it('refuses fetch, http(s).request and raw sockets to remote hosts', async () => {
    enableSandbox({ workspace: ws, env: process.env });
    expectSandboxCode(await caught(fetch('https://example.com/catalog.json')), 'cli.sandbox-network-denied');
    expectSandboxCode(await caught(() => https.request('https://example.com/')), 'cli.sandbox-network-denied');
    expectSandboxCode(await caught(() => http.get({ host: '93.184.216.34', port: 80 })), 'cli.sandbox-network-denied');
    const sockErr = await new Promise(res => net.connect(443, 'example.com').on('error', res));
    expectSandboxCode(sockErr, 'cli.sandbox-network-denied');
    const tlsErr = await new Promise(res => tls.connect(443, '1.1.1.1').on('error', res));
    expectSandboxCode(tlsErr, 'cli.sandbox-network-denied');
    const dnsErr = await new Promise(res => dns.lookup('example.com', err => res(err)));
    expectSandboxCode(dnsErr, 'cli.sandbox-network-denied');
    expectSandboxCode(await caught(dns.promises.resolve4('example.com')), 'cli.sandbox-network-denied');
  });

  it('fails fast (no hang) and before any DNS lookup', async () => {
    enableSandbox({ workspace: ws, env: process.env });
    const t0 = Date.now();
    await caught(fetch('https://10.255.255.1/never-routes'));
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('refuses loopback by default, allows it with KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1', async () => {
    const server = createServer((_req, res) => res.end('pong'));
    await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as net.AddressInfo).port;
    try {
      enableSandbox({ workspace: ws, env: process.env });
      expectSandboxCode(await caught(fetch(`http://127.0.0.1:${port}/`)), 'cli.sandbox-network-denied');
      const err = await new Promise(res => net.connect(port, '127.0.0.1').on('error', res));
      expectSandboxCode(err, 'cli.sandbox-network-denied');
      disableSandboxForTest();
      enableSandbox({ workspace: ws, env: { ...process.env, KERNELCAD_SANDBOX_ALLOW_LOOPBACK: '1' } });
      expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toBe('pong');
      expectSandboxCode(await caught(fetch('https://example.com/')), 'cli.sandbox-network-denied');
    } finally {
      disableSandboxForTest();
      await new Promise(r => server.close(r));
    }
  });

  it('listening servers (inbound) are unaffected', async () => {
    enableSandbox({ workspace: ws, env: process.env });
    const server = createServer((_req, res) => res.end('ok'));
    await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
    expect((server.address() as net.AddressInfo).port).toBeGreaterThan(0);
    await new Promise(r => server.close(r));
  });

  it('classifies loopback hosts', () => {
    for (const h of ['localhost', '127.0.0.1', '127.8.9.1', '::1', '[::1]', '::ffff:127.0.0.1', 'app.localhost']) expect(isLoopbackHost(h), h).toBe(true);
    for (const h of ['example.com', '10.0.0.1', '0.0.0.0', '128.0.0.1', '::ffff:8.8.8.8']) expect(isLoopbackHost(h), h).toBe(false);
  });
});
