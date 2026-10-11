import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportScript } from '../../../src/agent/cli/commands/export';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { bendTableFileNames } from '../../../src/agent/script-runtime/exportBendTable';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const ONE_LINE = 'tests/fixtures/tube/one-line.kcad.ts';
const TIGHT = 'tests/fixtures/tube/one-line-tight-bend.kcad.ts';

async function outDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'bend-'));
}

describe('bend-table export', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('CLI writes one CSV per tube into the out directory', async () => {
    const out = await outDir();
    const r = await exportScript({ file: ONE_LINE, format: 'bend-table', out });
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect((r.tableFiles ?? []).map((f) => basename(f))).toEqual(['fuel-1.csv']);
    expect(dirname(r.tableFiles![0])).toBe(out);
    const csv = await readFile(r.tableFiles![0], 'utf8');
    expect(csv.split('\n')[0]).toBe('name,fuel-1');
    expect(csv).toContain('bend,l_mm,r_deg,a_deg');
    expect(r.bytesWritten).toBe(Buffer.byteLength(csv));
  }, 120_000);

  it('MCP export writes the same files and lists them in table_files', async () => {
    const out = await outDir();
    const r = await exportModelTool({ file: ONE_LINE, format: 'bend-table', output_path: out });
    expect(r.ok).toBe(true);
    expect((r.table_files ?? []).map((f) => basename(f))).toEqual(['fuel-1.csv']);
    expect(await readdir(out)).toEqual(['fuel-1.csv']);
    const csv = await readFile(r.table_files![0], 'utf8');
    expect(csv.split('\n')[0]).toBe('name,fuel-1');
    expect(csv).toContain('bend,l_mm,r_deg,a_deg');
  }, 120_000);

  it('MCP refuses a script whose tube gate fails, writing nothing', async () => {
    const out = await outDir();
    const r = await exportModelTool({ file: TIGHT, format: 'bend-table', output_path: out });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.map((d) => d.code)).toContain('tube.bend.radius-too-small');
    expect(r.table_files).toBeUndefined();
    expect(await readdir(out)).toEqual([]);
  }, 120_000);

  it('gives tubes that differ only by case, or by a Windows device name, distinct safe files', () => {
    expect(bendTableFileNames(['fuel', 'Fuel', 'FUEL', 'NUL', 'com1', 'con.x', 'Console'])).toEqual([
      'fuel.csv', 'Fuel-2.csv', 'FUEL-3.csv', 'tube-NUL.csv', 'tube-com1.csv', 'tube-con.x.csv', 'Console.csv',
    ]);
  });

  it('fails clearly when the model has no tubes, and writes nothing', async () => {
    const out = await outDir();
    const r = await exportScript({ file: 'tests/fixtures/tube/no-tube.kcad.ts', format: 'bend-table', out });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics.map((d) => d.code)).toContain('export.bend-table.no-tubes');
    expect(r.tableFiles).toBeUndefined();
    expect(await readdir(out)).toEqual([]);
    const m = await exportModelTool({ file: 'tests/fixtures/tube/no-tube.kcad.ts', format: 'bend-table', output_path: out });
    expect(m.ok).toBe(false);
    expect(m.diagnostics?.map((d) => d.code)).toContain('export.bend-table.no-tubes');
  }, 120_000);

  it('writes no table when the tube gate reports errors', async () => {
    const out = await outDir();
    const r = await exportScript({ file: TIGHT, format: 'bend-table', out });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics.map((d) => d.code)).toContain('tube.bend.radius-too-small');
    expect(await readdir(out)).toEqual([]);
  }, 120_000);

  it('keeps a tube named with path separators inside the out directory', async () => {
    const src = (await readFile(ONE_LINE, 'utf8')).replace("'fuel-1'", "'../x/..'");
    const dir = await outDir();
    const file = join(dir, 'evil.kcad.ts');
    await writeFile(file, src);
    const out = join(dir, 'out');
    const r = await exportScript({ file, format: 'bend-table', out });
    expect(r.exitCode).toBe(0);
    expect(r.tableFiles).toHaveLength(1);
    expect(dirname(r.tableFiles![0])).toBe(out);
    expect(basename(r.tableFiles![0])).toBe('..-x-...csv');
    expect(await readdir(dir)).toEqual(['evil.kcad.ts', 'out']);
  }, 120_000);

  it('runAndExport returns the tables without touching the file system', async () => {
    const code = await readFile(ONE_LINE, 'utf8');
    const r = await runAndExport({ code, fileName: ONE_LINE, format: 'bend-table' });
    expect(r.tables?.map((t) => t.relPath)).toEqual(['fuel-1.csv']);
    expect(new TextDecoder().decode(r.tables![0].bytes)).toContain('bend,l_mm,r_deg,a_deg');
  }, 120_000);
});
