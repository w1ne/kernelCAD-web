// tests/integration/mcp/exportModel.test.ts
//
// Integration tests for the unified `export_model` MCP tool. One tool,
// format-dispatched — confirms the receipt carries `format` and that the
// deprecated `export_stl` alias still routes through the shim.
import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { exportStlTool } from '../../../src/agent/mcp/tools/exportStl';

beforeAll(async () => {
  const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-export-model-'));
});
afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('export_model MCP tool', () => {
  it('writes STL with format: "stl"', async () => {
    const out = join(tmpDir, 'box.stl');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: 'stl',
    });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('stl');
    expect(r.output_path).toBe(out);
    expect(statSync(out).size).toBeGreaterThan(84);
  }, 60000);

  it('writes STEP with format: "step"', async () => {
    const out = join(tmpDir, 'box.step');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: 'step',
    });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('step');
    expect(statSync(out).size).toBeGreaterThan(0);
  }, 60000);

  it('writes DXF with format: "dxf" for a flat-pattern sheet-metal Shape', async () => {
    const out = join(tmpDir, 'plate.dxf');
    const r = await exportModelTool({
      code: `
        const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
        return sheetMetal(s, { thickness: 1.0, kFactor: 0.4 });
      `,
      output_path: out,
      format: 'dxf',
    });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('dxf');
    expect(statSync(out).size).toBeGreaterThan(0);
  }, 60000);

  it('writes 3MF with format: "3mf"', async () => {
    const out = join(tmpDir, 'box.3mf');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: '3mf',
    });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('3mf');
    expect(statSync(out).size).toBeGreaterThan(0);
  }, 60000);

  it('writes GLB with format: "glb"', async () => {
    const out = join(tmpDir, 'box.glb');
    const r = await exportModelTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
      format: 'glb',
    });
    expect(r.ok).toBe(true);
    expect(r.format).toBe('glb');
    expect(statSync(out).size).toBeGreaterThan(0);
  }, 60000);

  it('rejects URDF / SRDF / SDF-Gazebo with the per-format not-implemented diagnostic', async () => {
    for (const format of ['urdf', 'srdf', 'sdf-gazebo'] as const) {
      const out = join(tmpDir, `x.${format}`);
      const r = await exportModelTool({
        code: 'return box(10, 10, 10);',
        output_path: out,
        format,
      });
      expect(r.ok).toBe(false);
      expect(
        r.diagnostics?.find(d => d.code === `export.${format}.not-implemented`),
      ).toBeDefined();
      // No file should be written when the runtime rejects the format.
      expect(existsSync(out)).toBe(false);
    }
  }, 60000);

  it('returns ok: false when output_path is missing', async () => {
    // @ts-expect-error testing runtime guard
    const r = await exportModelTool({ code: 'return box(10, 10, 10);', format: 'stl' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/output_path/);
  });

  it('returns ok: false when format is missing', async () => {
    // @ts-expect-error testing runtime guard
    const r = await exportModelTool({ code: 'return box(10, 10, 10);', output_path: join(tmpDir, 'x.stl') });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/format/);
  });

  it('export_stl shim still works (deprecated alias passes through to export_model)', async () => {
    const out = join(tmpDir, 'box.stl');
    const r = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: out,
    });
    expect(r.ok).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(84);
  }, 60000);
});
