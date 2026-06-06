// tests/unit/mcp/tools/exportModel.test.ts
//
// Unit tests for the `export_model` MCP tool's STL watertight-verify
// semantics: a failing report still writes the file (write-then-fail, same
// contract as `export_part`) but fails the call, and `no_verify` plumbs
// `verify: false` into the runtime options. Format coverage lives in
// tests/integration/mcp/exportModel.test.ts.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportModelTool } from '../../../../src/agent/mcp/tools/exportModel';
import { runAndExport, stlNotWatertightDiagnostic } from '../../../../src/agent/script-runtime/export';

// Partial mock: `runAndExport` becomes a spy defaulting to the real
// implementation so the verify-gate test can stub a failing watertight
// report (real geometry from `box()` is always watertight). Everything else
// stays untouched.
vi.mock('../../../../src/agent/script-runtime/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/agent/script-runtime/export')>();
  return {
    ...actual,
    runAndExport: vi.fn(actual.runAndExport),
  };
});

beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-export-model-unit-'));
  vi.mocked(runAndExport).mockReset();
});
afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('export_model MCP tool — STL verify gate', () => {
  it('verify failure still writes the file but returns ok: false with export.mesh.not-watertight', async () => {
    const failingReport = {
      ok: false as const,
      openEdgeCount: 4,
      clusters: [{ center: [1, 2, 3] as [number, number, number], edgeCount: 4 }],
    };
    vi.mocked(runAndExport).mockResolvedValueOnce({
      bytes: new Uint8Array(684).fill(7),
      featureCount: 1,
      diagnostics: [stlNotWatertightDiagnostic(failingReport, undefined)],
    });
    const out = join(tmpDir, 'leaky.stl');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: 'stl',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.find(d => d.code === 'export.mesh.not-watertight')).toBeDefined();
    // File is still written so the broken mesh can be inspected.
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBe(684);
  }, 60000);

  it('no_verify: true plumbs verify: false into runAndExport options', async () => {
    const out = join(tmpDir, 'box.stl');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: 'stl',
      no_verify: true,
    });
    expect(r.ok).toBe(true);
    const call = vi.mocked(runAndExport).mock.calls.at(-1)![0];
    expect(call.options).toEqual({ format: 'stl', verify: false });

    // Without no_verify the options bag stays untouched (verify defaults on
    // inside the runtime).
    const gated = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: join(tmpDir, 'box2.stl'),
      format: 'stl',
    });
    expect(gated.ok).toBe(true);
    expect(vi.mocked(runAndExport).mock.calls.at(-1)![0].options).toBeUndefined();
  }, 60000);
});
