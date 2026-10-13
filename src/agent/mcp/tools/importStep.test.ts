// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, symlinkSync, mkdirSync, chmodSync, linkSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ClientRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { exportModelTool } from './exportModel';
import { importStepTool, detectFormat, isPrivateAddress, checkFetchUrl, IMPORT_MAX_BYTES } from './importStep';
import { setFetchDepsForTest, type FetchDeps, type Resolver } from './importStepFetch';

interface FakeReply { status: number; headers?: Record<string, string>; body?: Buffer[]; hang?: boolean; error?: string }
let currentNet: Partial<FetchDeps> | undefined;

/** In-memory network: a DNS table plus a responder; records which IP each connection was pinned to. */
function fakeNet(dns: Record<string, string[]>, reply: (url: string) => FakeReply, resolve?: Resolver) {
  const connected: { host: string; ip: string; servername?: string }[] = [];
  let sent = 0;
  const deps: Partial<FetchDeps> = {
    resolve: resolve ?? (async host => (dns[host] ?? []).map(address => ({ address, family: 4 as const }))),
    request: (opts, cb) => {
      const req = new EventEmitter() as ClientRequest;
      let destroyed = false;
      req.destroy = () => { destroyed = true; return req; };
      req.end = () => {
        // Ask the pinned lookup where to connect, exactly as net.connect would.
        (opts.lookup as unknown as (h: string, o: object, c: (e: null, a: string) => void) => void)(String(opts.hostname), {}, (_e, ip) => {
          connected.push({ host: String(opts.hostname), ip, servername: opts.servername });
        });
        const r = reply(`https://${opts.hostname}${opts.path}`);
        setImmediate(() => {
          if (r.error !== undefined) { req.emit('error', new Error(r.error)); return; }
          const res = new PassThrough() as unknown as IncomingMessage;
          res.statusCode = r.status;
          res.headers = r.headers ?? {};
          cb(res);
          if (r.hang === true) return;
          const pump = (i: number): void => {
            const body = r.body ?? [];
            if (destroyed || i >= body.length) { if (!destroyed) (res as unknown as PassThrough).end(); return; }
            sent++;
            (res as unknown as PassThrough).write(body[i]);
            setImmediate(() => pump(i + 1));
          };
          pump(0);
        });
        return req;
      };
      return req;
    },
  };
  currentNet = deps;
  setFetchDepsForTest(deps);
  return { connected, chunksSent: () => sent };
}

let dir: string;
let stepBytes: Buffer;
let stlBytes: Buffer;

describe('import_step', () => {
  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'import-step-'));
    const code = 'return box(30, 20, 10);';
    expect((await exportModelTool({ code, output_path: join(dir, 'src.step'), format: 'step' })).ok).toBe(true);
    expect((await exportModelTool({ code, output_path: join(dir, 'src.stl'), format: 'stl' })).ok).toBe(true);
    stepBytes = readFileSync(join(dir, 'src.step'));
    stlBytes = readFileSync(join(dir, 'src.stl'));
  }, 60000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  afterEach(() => { vi.unstubAllGlobals(); setFetchDepsForTest(); currentNet = undefined; });

  it('imports STEP bytes as the base body of a starter script', async () => {
    const r = await importStepTool({ content_base64: stepBytes.toString('base64'), output_dir: join(dir, 'a'), name: 'bracket' });
    expect(r.error).toBeUndefined();
    expect(r.ok).toBe(true);
    expect(r.format).toBe('step');
    expect(r.script_path).toBe(join(dir, 'a', 'bracket.kcad.ts'));
    expect(r.code).toContain("await lib.fromSTEP('./bracket.step')");
    for (let i = 0; i < 3; i++) expect(r.bbox!.size[i]).toBeCloseTo([30, 20, 10][i], 3);
  }, 60000);

  it('imports a binary STL', async () => {
    const r = await importStepTool({ content_base64: stlBytes.toString('base64'), output_dir: join(dir, 'b') });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('stl');
    expect(r.code).toContain("lib.fromSTL('./imported.stl')");
    expect(r.bbox!.size[0]).toBeCloseTo(30, 3);
  }, 60000);

  it('downloads a ChatGPT upload reference through the pinned connection', async () => {
    const net = fakeNet({ 'files.example.com': ['93.184.215.14'] }, () => ({ status: 200, body: [stepBytes] }));
    const r = await importStepTool({
      upload: { download_url: 'https://files.example.com/files/part.step', file_id: 'file-1', file_name: 'part.step' },
      output_dir: join(dir, 'c'),
    });
    expect(r.error).toBeUndefined();
    expect(r.ok).toBe(true);
    expect(net.connected).toEqual([{ host: 'files.example.com', ip: '93.184.215.14', servername: 'files.example.com' }]);
  }, 60000);

  it('defeats DNS rebinding: resolves once per hop and connects only to the checked IP', async () => {
    let calls = 0;
    const answers = ['93.184.215.14', '127.0.0.1'];
    const net = fakeNet({}, () => ({ status: 200, body: [stepBytes] }), async () => [{ address: answers[Math.min(calls++, 1)], family: 4 }]);
    const r = await importStepTool({ url: 'https://rebind.example.com/a.step', output_dir: join(dir, 'rb') });
    expect(r.ok).toBe(true);
    expect(calls).toBe(1);
    expect(net.connected.map(c => c.ip)).toEqual(['93.184.215.14']);
  }, 60000);

  it('re-validates and re-pins every redirect hop', async () => {
    const net = fakeNet({ 'a.example.com': ['93.184.215.14'], 'b.example.com': ['93.184.215.15'], 'evil.example.com': ['169.254.169.254'] }, url =>
      url.startsWith('https://a.') ? { status: 302, headers: { location: 'https://b.example.com/x.step' } }
        : url.startsWith('https://b.') ? { status: 200, body: [stepBytes] } : { status: 500 });
    const ok = await importStepTool({ url: 'https://a.example.com/a.step', output_dir: join(dir, 'rd') });
    expect(ok.ok).toBe(true);
    expect(net.connected.map(c => c.ip)).toEqual(['93.184.215.14', '93.184.215.15']);
    fakeNet({ 'a.example.com': ['93.184.215.14'], 'evil.example.com': ['169.254.169.254'] }, () => ({ status: 301, headers: { location: 'https://evil.example.com/meta' } }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step', output_dir: join(dir, 'rd2') })).error).toMatch(/redirect refused: url host is not public/);
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 302, headers: { location: 'http://a.example.com/a' } }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/redirect refused: url must use https/);
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 302, headers: { location: '/again' } }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/more than 5 redirects/);
  });

  it('caps the streamed body: Content-Length, chunked without length, and compressed responses', async () => {
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 200, headers: { 'content-length': String(IMPORT_MAX_BYTES + 1) }, body: [Buffer.alloc(10)] }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/larger than 50 MB/);
    const chunk = Buffer.alloc(8 * 1024 * 1024);
    const net = fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 200, body: Array.from({ length: 20 }, () => chunk) }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/larger than 50 MB/);
    expect(net.chunksSent()).toBeLessThan(20);
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 200, headers: { 'content-encoding': 'gzip' }, body: [Buffer.alloc(10)] }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/content-encoding/);
  });

  it('has DNS and overall deadlines, and turns transport errors into structured results', async () => {
    setFetchDepsForTest({ resolve: () => new Promise(() => undefined), dnsTimeoutMs: 20 });
    expect((await importStepTool({ url: 'https://slow.example.com/a.step' })).error).toMatch(/DNS lookup .* timed out/);
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 200, hang: true }));
    setFetchDepsForTest({ ...currentNet!, totalTimeoutMs: 50 });
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/download timed out/);
    fakeNet({ 'a.example.com': ['93.184.215.14'] }, () => ({ status: 200, error: 'ECONNRESET' }));
    expect((await importStepTool({ url: 'https://a.example.com/a.step' })).error).toMatch(/download failed: ECONNRESET/);
    expect((await importStepTool({ upload: { download_url: 'not a url', file_id: 'f' } })).error).toMatch(/not a valid URL/);
  });

  it('enforces the base64 cap on the decoded size', async () => {
    const exact = Buffer.alloc(IMPORT_MAX_BYTES, 0x20).toString('base64');
    const over = Buffer.alloc(IMPORT_MAX_BYTES + 1, 0x20).toString('base64');
    expect((await importStepTool({ content_base64: over, output_dir: join(dir, 'cap') })).error).toMatch(/larger than 50 MB/);
    expect((await importStepTool({ content_base64: exact, output_dir: join(dir, 'cap') })).error).toMatch(/STEP or STL/);
  }, 60000);

  it('refuses symlinked destination files and leaves the target untouched', async () => {
    for (const victim of ['imported.step', 'imported.kcad.ts']) {
      const out = join(dir, `sym-${victim}`);
      mkdirSync(out, { recursive: true });
      const target = join(dir, `target-${victim}`);
      writeFileSync(target, 'precious');
      symlinkSync(target, join(out, victim));
      const r = await importStepTool({ content_base64: stepBytes.toString('base64'), output_dir: out });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/symbolic link/);
      expect(readFileSync(target, 'utf8')).toBe('precious');
    }
    const out = join(dir, 'dirclash');
    mkdirSync(join(out, 'imported.step'), { recursive: true });
    expect((await importStepTool({ content_base64: stepBytes.toString('base64'), output_dir: out })).error).toMatch(/not a regular file/);
  });

  it('a failed write never deletes or truncates files that already existed', async () => {
    const out = join(dir, 'readonly');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'imported.kcad.ts'), 'existing script');
    chmodSync(out, 0o555);
    try {
      const r = await importStepTool({ content_base64: stepBytes.toString('base64'), output_dir: out });
      expect(r.ok).toBe(false);
      expect(readFileSync(join(out, 'imported.kcad.ts'), 'utf8')).toBe('existing script');
    } finally {
      chmodSync(out, 0o755);
    }
    const linked = join(dir, 'hardlinked');
    mkdirSync(linked, { recursive: true });
    writeFileSync(join(dir, 'hl-victim'), 'precious');
    linkSync(join(dir, 'hl-victim'), join(linked, 'imported.step'));
    const r2 = await importStepTool({ content_base64: stepBytes.toString('base64'), output_dir: linked });
    expect(r2.ok).toBe(true);
    expect(readFileSync(join(dir, 'hl-victim'), 'utf8')).toBe('precious');
  }, 60000);

  it('rejects unsafe or ambiguous input', async () => {
    expect((await importStepTool({})).error).toMatch(/exactly one/);
    expect((await importStepTool({ url: 'http://example.com/a.step' })).error).toMatch(/https/);
    expect((await importStepTool({ url: 'https://127.0.0.1/a.step' })).error).toMatch(/not public/);
    expect((await importStepTool({ url: 'https://localhost/a.step' })).error).toMatch(/not public/);
    expect((await importStepTool({ content_base64: 'aGVsbG8=', output_dir: join(dir, 'e') })).error).toMatch(/STEP or STL/);
    expect((await importStepTool({ content_base64: stepBytes.toString('base64'), name: '../x' })).ok).toBe(false);
  });

  it('detects formats and private addresses', async () => {
    expect(detectFormat(new Uint8Array(stepBytes))).toBe('step');
    expect(detectFormat(new Uint8Array(stlBytes))).toBe('stl');
    expect(detectFormat(new TextEncoder().encode('solid x\n facet normal 0 0 1'))).toBe('stl');
    expect(detectFormat(new Uint8Array([1, 2, 3]), 'a.STP')).toBe('step');
    for (const ip of [
      '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '198.18.0.1', '198.19.255.255',
      '192.0.0.8', '192.0.2.1', '198.51.100.1', '203.0.113.1', '192.88.99.1', '224.0.0.1', '240.0.0.1', '255.255.255.255',
      '::', '::1', 'fd00::1', 'fc00::1', 'fe80::1', 'ff02::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1', '::ffff:93.184.215.14', '::7f00:1',
      '::a9fe:a9fe', '64:ff9b::a9fe:a9fe', '64:ff9b::7f00:1', '64:ff9b:1::1', '100::1', '2001::1', '2001:db8::1', '2002:7f00:1::1', 'not-an-ip',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress('93.184.215.14')).toBe(false);
    expect(isPrivateAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
    expect(await checkFetchUrl('https://user:pw@93.184.215.14/a')).toMatch(/credentials/);
  });
});
