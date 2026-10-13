// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { exportModelTool } from './exportModel';
import { importStepTool, detectFormat, isPrivateAddress, checkFetchUrl } from './importStep';

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
  afterEach(() => vi.unstubAllGlobals());

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

  it('downloads a ChatGPT upload reference (fetch mocked) and refuses redirects to private hosts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stepBytes, { status: 200 })));
    const r = await importStepTool({
      upload: { download_url: 'https://93.184.215.14/files/part.step', file_id: 'file-1', file_name: 'part.step' },
      output_dir: join(dir, 'c'),
    });
    expect(r.ok).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/x' } })));
    const bad = await importStepTool({ url: 'https://93.184.215.14/part.step', output_dir: join(dir, 'd') });
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/redirect refused/);
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
    for (const ip of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', 'fd00::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress('93.184.215.14')).toBe(false);
    expect(await checkFetchUrl('https://user:pw@93.184.215.14/a')).toMatch(/credentials/);
  });
});
