// tests/unit/mcp/tools/exportPart.test.ts
//
// Unit tests for the `export_part` MCP tool — per-part STL export of a
// solved assembly in world-frame positions. Uses a tiny inline two-box
// assembly for speed; the carousel fixtures stay in integration tests.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportPartTool } from '../../../../src/agent/mcp/tools/exportPart';
import { runAndExportParts } from '../../../../src/agent/script-runtime/export';

// Partial mock: `runAndExportParts` becomes a spy defaulting to the real
// implementation so the no_verify test can stub a failing watertight report
// (real geometry from `box()` is always watertight). Everything else stays
// untouched.
vi.mock('../../../../src/agent/script-runtime/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/agent/script-runtime/export')>();
  return {
    ...actual,
    runAndExportParts: vi.fn(actual.runAndExportParts),
  };
});

const TWO_BOX_ASSEMBLY = `
const arm = assembly('demo');
arm.part('a', box(10, 10, 10));
arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
return arm.model();
`;

beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-export-part-'));
  vi.mocked(runAndExportParts).mockClear();
});
afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('export_part MCP tool', () => {
  it('exports a single named part to output_path', async () => {
    const out = join(tmpDir, 'only-b.stl');
    const r = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      part: 'b',
      output_path: out,
    });
    expect(r.ok).toBe(true);
    expect(r.written).toHaveLength(1);
    expect(r.written![0].part).toBe('b');
    expect(r.written![0].output_path).toBe(out);
    expect(r.written![0].watertight).toBe(true);
    expect(r.written![0].byte_count).toBeGreaterThan(84);
    expect(statSync(out).size).toBe(r.written![0].byte_count);
  }, 60000);

  it("exports all parts to output_dir as <dir>/<part>.stl when part is 'all'", async () => {
    const outDir = join(tmpDir, 'out');
    const r = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      part: 'all',
      output_dir: outDir,
    });
    expect(r.ok).toBe(true);
    expect(r.written!.map(w => w.part).sort()).toEqual(['a', 'b']);
    expect(statSync(join(outDir, 'a.stl')).size).toBeGreaterThan(84);
    expect(statSync(join(outDir, 'b.stl')).size).toBeGreaterThan(84);
  }, 60000);

  it('exports all parts to output_dir when part is omitted', async () => {
    const outDir = join(tmpDir, 'out');
    const r = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      output_dir: outDir,
    });
    expect(r.ok).toBe(true);
    expect(r.written!.map(w => w.part).sort()).toEqual(['a', 'b']);
  }, 60000);

  it('fails with export.part.not-found listing valid names for an unknown part', async () => {
    const r = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      part: 'nonexistent',
      output_path: join(tmpDir, 'x.stl'),
    });
    expect(r.ok).toBe(false);
    const diag = r.diagnostics?.find(d => d.code === 'export.part.not-found');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('nonexistent');
    expect(diag!.message).toContain('a');
    expect(diag!.message).toContain('b');
    expect(existsSync(join(tmpDir, 'x.stl'))).toBe(false);
  }, 60000);

  it('verify gate: a failing watertight report fails the call by default but no_verify: true passes it', async () => {
    const failingReport = {
      ok: false,
      openEdgeCount: 4,
      clusters: [{ center: [1, 2, 3] as [number, number, number], edgeCount: 4 }],
    };
    const stub = {
      parts: [{
        name: 'a',
        fileSafeName: 'a',
        bytes: new Uint8Array(684),
        report: failingReport,
        triangleCount: 12,
      }],
      featureCount: 1,
      diagnostics: [],
    };

    vi.mocked(runAndExportParts).mockResolvedValueOnce(stub);
    const gated = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      part: 'a',
      output_path: join(tmpDir, 'gated.stl'),
    });
    expect(gated.ok).toBe(false);
    expect(gated.diagnostics?.find(d => d.code === 'export.mesh.not-watertight')).toBeDefined();
    // File is still written so the broken mesh can be inspected.
    expect(existsSync(join(tmpDir, 'gated.stl'))).toBe(true);
    expect(gated.written![0].watertight).toBe(false);

    vi.mocked(runAndExportParts).mockResolvedValueOnce(stub);
    const skipped = await exportPartTool({
      code: TWO_BOX_ASSEMBLY,
      part: 'a',
      output_path: join(tmpDir, 'skipped.stl'),
      no_verify: true,
    });
    expect(skipped.ok).toBe(true);
    expect(skipped.written![0].watertight).toBe(false);
    expect(skipped.diagnostics?.find(d => d.code === 'export.mesh.not-watertight')).toBeUndefined();
  }, 60000);

  it('returns ok: false when neither output_path nor output_dir fits the mode', async () => {
    // Single-part mode requires output_path.
    const single = await exportPartTool({ code: TWO_BOX_ASSEMBLY, part: 'a' });
    expect(single.ok).toBe(false);
    expect(single.error).toMatch(/output_path/);

    // All-parts mode requires output_dir.
    const all = await exportPartTool({ code: TWO_BOX_ASSEMBLY });
    expect(all.ok).toBe(false);
    expect(all.error).toMatch(/output_dir/);
  }, 60000);

  it('returns ok: false when neither file nor code is provided', async () => {
    const r = await exportPartTool({ output_dir: tmpDir });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/file|code/);
  });

  it('fails with export.no-shape when the script does not return a Scene', async () => {
    const r = await exportPartTool({
      code: 'return box(10, 10, 10);',
      output_dir: join(tmpDir, 'out'),
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.find(d => d.code === 'export.no-shape')).toBeDefined();
  }, 60000);
});
