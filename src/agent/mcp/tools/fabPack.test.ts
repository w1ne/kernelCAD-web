// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { fabPackTool, quoteLinksFor, FAB_SERVICES } from './fabPack';

let dir: string;

describe('fab_pack', () => {
  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'fabpack-'));
  }, 60000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('writes STEP, STL, 3MF, drawing PDF and BOM plus a zip and quote links', async () => {
    const out = join(dir, 'bracket');
    const r = await fabPackTool({ code: 'return box(40, 30, 5).subtract(cylinder(5, 3).translate(20, 15, 0));', output_dir: out, name: 'bracket' });
    expect(r.files.map(f => [f.format, f.ok, f.error])).toEqual([
      ['step', true, undefined], ['stl', true, undefined], ['3mf', true, undefined],
      ['pdf-drawing', true, undefined], ['bom-csv', true, undefined],
    ]);
    expect(r.ok).toBe(true);
    for (const f of ['bracket.step', 'bracket.stl', 'bracket.3mf', 'bracket.pdf', 'bracket.bom.csv', 'manifest.json', 'README.txt']) {
      expect(existsSync(join(out, f))).toBe(true);
    }
    expect(readFileSync(join(out, 'bracket.pdf')).subarray(0, 4).toString()).toBe('%PDF');
    expect(readFileSync(join(out, 'bracket.step')).toString()).toMatch(/^ISO-10303-21;/);
    const bom = readFileSync(join(out, 'bracket.bom.csv'), 'utf8').trim().split('\n');
    expect(bom[0]).toMatch(/^item,name,quantity,/);
    expect(bom[1]).toMatch(/^1,bracket,1,fabricated,/);
    const zip = unzipSync(new Uint8Array(readFileSync(r.zip_path!)));
    expect(Object.keys(zip).sort()).toEqual(
      ['README.txt', 'bracket.3mf', 'bracket.bom.csv', 'bracket.pdf', 'bracket.step', 'bracket.stl', 'manifest.json'],
    );
    expect(r.quote_links).toHaveLength(FAB_SERVICES.length);
    const jlc = r.quote_links.find(q => q.service.startsWith('JLC3DP'))!;
    expect(jlc.url).toBe('https://jlc3dp.com/3d-printing-quote');
    expect(r.referral_disclosure).toBeUndefined();
    expect(jlc.upload_file).toBe('bracket.stl');
    expect(r.quote_links.find(q => q.service === 'SendCutSend')!.upload_file).toBe('bracket.step');
  }, 120000);

  it('filters links by process and adds a DXF for flat parts', async () => {
    const out = join(dir, 'plate');
    const r = await fabPackTool({ code: 'return box(50, 50, 3);', output_dir: out, formats: ['dxf', 'step'], processes: ['sheet-cut'] });
    expect(r.ok).toBe(true);
    expect(r.quote_links.every(q => q.processes.includes('sheet-cut'))).toBe(true);
    expect(r.quote_links.find(q => q.service === 'SendCutSend')!.upload_file).toBe('part.dxf');
  }, 120000);

  it('rejects bad input without writing', async () => {
    expect((await fabPackTool({ code: 'return box(1,1,1);', output_dir: '' })).ok).toBe(false);
    expect((await fabPackTool({ output_dir: join(dir, 'x') })).error).toMatch(/file|code/);
    expect((await fabPackTool({ code: 'return box(1,1,1);', output_dir: join(dir, 'x'), name: '../evil' })).ok).toBe(false);
    expect((await fabPackTool({ code: 'return box(1,1,1);', output_dir: '/tmp/../etc' })).ok).toBe(false);
    expect((await fabPackTool({ code: 'return box(1,1,1);', output_dir: join(dir, 'x'), formats: ['obj' as never] })).ok).toBe(false);
  });

  it('only lists https links and the upload file is one the pack wrote', () => {
    for (const s of FAB_SERVICES) expect(s.url).toMatch(/^https:\/\//);
    expect(quoteLinksFor([{ format: 'stl', ok: true, path: '/x/p.stl' }]).find(q => q.service === 'Xometry')!.upload_file).toBe('p.stl');
    expect(quoteLinksFor([]).every(q => q.upload_file === undefined)).toBe(true);
  });
});
