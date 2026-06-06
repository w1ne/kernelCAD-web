import { describe, it, expect, beforeAll, vi } from 'vitest';
import { exportScript, exportPartsScript } from '../../../src/agent/cli/commands/export';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Partial mock: `runAndExportParts` becomes a spy that defaults to the real
// implementation, so individual tests can stub a failing watertight report
// (real geometry from `box()` is always watertight). Everything else —
// `runAndExport`, diagnostics helpers — stays untouched.
vi.mock('../../../src/agent/script-runtime/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/agent/script-runtime/export')>();
  return { ...actual, runAndExportParts: vi.fn(actual.runAndExportParts) };
});

const TWO_BOX_ASSEMBLY = `
const arm = assembly('demo');
arm.part('a', box(10, 10, 10));
arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
return arm.model();
`;

describe('export command', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports STL for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.stl');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'stl', out });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(84);
  });

  it('exports STEP for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.step');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(text).toContain('ISO-10303');
  });

  it('returns non-zero on diagnostic errors', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    const out  = join(tmp, 'bad.step');
    writeFileSync(file, `throw new Error('boom');`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).not.toBe(0);
  });
});

describe('export command --part/--parts', () => {
  beforeAll(async () => { await initOcct(); });

  it('--parts all writes <dir>/<part>.stl per part and exits 0', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    const outDir = join(tmp, 'out');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const r = await exportPartsScript({ file, outDir, verify: true });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(r.written.map(w => w.name).sort()).toEqual(['a', 'b']);
    for (const w of r.written) {
      expect(w.watertight, w.name).toBe(true);
      expect(w.triangleCount).toBeGreaterThan(0);
      expect(statSync(w.path).size).toBeGreaterThan(84);
    }
    expect(statSync(join(outDir, 'a.stl')).size).toBeGreaterThan(84);
    expect(statSync(join(outDir, 'b.stl')).size).toBeGreaterThan(84);
  });

  it('single --part with -o writes exactly one file', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    const outFile = join(tmp, 'only-b.stl');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const r = await exportPartsScript({ file, parts: ['b'], outFile, verify: true });
    expect(r.exitCode).toBe(0);
    expect(r.written).toHaveLength(1);
    expect(r.written[0].name).toBe('b');
    expect(r.written[0].path).toBe(outFile);
    expect(statSync(outFile).size).toBeGreaterThan(84);
  });

  it('unknown --part exits non-zero with export.part.not-found listing valid names', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const r = await exportPartsScript({ file, parts: ['c'], outFile: join(tmp, 'c.stl'), verify: true });
    expect(r.exitCode).not.toBe(0);
    const diag = r.diagnostics.find(d => d.code === 'export.part.not-found');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('c');
    expect(diag!.message).toContain('Valid names: a, b');
    expect(r.written).toEqual([]);
  });

  it('verify gate: failing report exits 1 by default, 0 with --no-verify', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const leakyPart = {
      name: 'leaky',
      fileSafeName: 'leaky',
      bytes: new Uint8Array(184),
      report: {
        ok: false as const,
        openEdgeCount: 3,
        clusters: [{ center: [1, 2, 3] as [number, number, number], edgeCount: 3 }],
      },
      triangleCount: 2,
    };
    const fakeResult = { parts: [leakyPart], featureCount: 1, diagnostics: [] };

    vi.mocked(runAndExportParts).mockResolvedValueOnce(fakeResult);
    const gated = await exportPartsScript({ file, outDir: join(tmp, 'gated'), verify: true });
    expect(gated.exitCode).toBe(1);
    expect(gated.diagnostics.some(d => d.code === 'export.mesh.not-watertight')).toBe(true);
    expect(gated.diagnostics.find(d => d.code === 'export.mesh.not-watertight')!.message)
      .toContain('leaky');

    vi.mocked(runAndExportParts).mockResolvedValueOnce(fakeResult);
    const skipped = await exportPartsScript({ file, outDir: join(tmp, 'skipped'), verify: false });
    expect(skipped.exitCode).toBe(0);
    expect(skipped.diagnostics.some(d => d.code === 'export.mesh.not-watertight')).toBe(false);
    expect(statSync(join(tmp, 'skipped', 'leaky.stl')).size).toBe(184);
  });
});
