// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, symlinkSync, mkdirSync } from 'node:fs';
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

  it('refuses symlinked manifest, README, zip and BOM destinations without touching the target', async () => {
    for (const victim of ['manifest.json', 'README.txt', 'part-fab-pack.zip', 'part.bom.csv']) {
      const out = join(dir, `sym-${victim}`);
      mkdirSync(out, { recursive: true });
      const target = join(dir, `target-${victim}`);
      writeFileSync(target, 'precious');
      symlinkSync(target, join(out, victim));
      const r = await fabPackTool({ code: 'return box(10, 10, 2);', output_dir: out, formats: ['step', 'bom-csv'] });
      expect(r.ok).toBe(false);
      expect(JSON.stringify(r)).toMatch(/symbolic link/);
      expect(readFileSync(target, 'utf8')).toBe('precious');
    }
  }, 120000);

  it('does not turn a failed build into a successful BOM', async () => {
    const r = await fabPackTool({
      code: 'dfmSpec({ minWall: 5 });\nreturn box(10, 10, 1);', output_dir: join(dir, 'badbom'), formats: ['bom-csv'],
    });
    expect(r.ok).toBe(false);
    expect(r.files[0].ok).toBe(false);
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  }, 120000);

  it('ships every per-part DXF of a multi-part model in the zip and manifest', async () => {
    const out = join(dir, 'cutlist');
    const code = `const a = assembly('cut');
a.part('left', box(20, 20, 3));
a.part('right', box(10, 10, 3).translate(40, 0, 0));
return a.model();`;
    const r = await fabPackTool({ code, output_dir: out, formats: ['dxf'] });
    expect(r.files[0].ok).toBe(true);
    expect(r.files[0].part_files?.length).toBe(2);
    const zip = unzipSync(new Uint8Array(readFileSync(r.zip_path!)));
    expect(Object.keys(zip).filter(k => k.startsWith('parts/')).sort()).toEqual(['parts/left.dxf', 'parts/right.dxf']);
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(manifest.files[0].part_files.sort()).toEqual(['parts/left.dxf', 'parts/right.dxf']);
  }, 120000);

  it('rejects inherited property names as formats and returns structured errors for filesystem failures', async () => {
    for (const f of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      expect((await fabPackTool({ code: 'return box(1,1,1);', output_dir: join(dir, 'y'), formats: [f as never] })).ok).toBe(false);
    }
    const file = join(dir, 'not-a-dir');
    writeFileSync(file, 'x');
    const r = await fabPackTool({ code: 'return box(1,1,1);', output_dir: file });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Cannot create/);
  });

  it('only lists https links and the upload file is one the pack wrote', () => {
    for (const s of FAB_SERVICES) expect(s.url).toMatch(/^https:\/\//);
    expect(quoteLinksFor([{ format: 'stl', ok: true, path: '/x/p.stl' }]).find(q => q.service === 'Xometry')!.upload_file).toBe('p.stl');
    expect(quoteLinksFor([]).every(q => q.upload_file === undefined)).toBe(true);
  });
});
