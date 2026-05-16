// tests/integration/mcp/exportStl.test.ts
import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportStlTool } from '../../../src/agent/mcp/tools/exportStl';
import { runScript } from '../../../src/modeling/runtime/runScript';

beforeAll(async () => {
  const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-export-stl-'));
});
afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('export_stl MCP tool', () => {
  it('round-trips a simple box: writes a valid STL file', async () => {
    const outputPath = join(tmpDir, 'box.stl');
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: outputPath,
    });

    expect(result.ok).toBe(true);
    expect(result.output_path).toBe(outputPath);
    expect(result.byte_count).toBeGreaterThan(0);
    expect(result.feature_count).toBe(1);
    expect(existsSync(outputPath)).toBe(true);

    // Validate binary STL structure.
    // Format: 80-byte header + 4-byte uint32 triangle count + 50 bytes per triangle.
    // A box has 12 triangles (2 per face × 6 faces) → 80 + 4 + 12 × 50 = 684 bytes.
    const buf = readFileSync(outputPath);
    expect(buf.length).toBeGreaterThanOrEqual(84);

    // Triangle count at byte 80 (uint32 LE).
    const triangleCount = buf.readUInt32LE(80);
    // A box has exactly 12 triangles.
    expect(triangleCount).toBe(12);

    // Total size must be exactly 80 + 4 + 12 × 50 = 684 bytes.
    expect(buf.length).toBe(684);

    // Header must NOT start with "solid" — that prefix signals ASCII format to
    // lenient parsers.
    const headerPrefix = buf.subarray(0, 5).toString('ascii');
    expect(headerPrefix).not.toBe('solid');

    // byte_count in receipt must match what's on disk.
    expect(result.byte_count).toBe(buf.length);
  }, 60000);

  it('returns ok: false when output_path is missing', async () => {
    // @ts-expect-error testing runtime guard
    const result = await exportStlTool({ code: 'return box(10, 10, 10);' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/output_path/);
  });

  it('returns ok: false when neither file nor code is provided', async () => {
    const result = await exportStlTool({ output_path: join(tmpDir, 'x.stl') });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/file.*code|code.*file/i);
  });

  it('returns ok: false with diagnostics when script fails to lower', async () => {
    const outputPath = join(tmpDir, 'bad.stl');
    const result = await exportStlTool({
      code: 'return box(10, 10, 10).fillet(20);',
      output_path: outputPath,
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.length).toBeGreaterThan(0);
    expect(existsSync(outputPath)).toBe(false);
  }, 60000);

  it('returns ok: false on dangerous path (/root/)', async () => {
    // /root/ is a protected system path — rejected by path validation before
    // any write is attempted.
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: '/root/kernelcad-test-unwritable/box.stl',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Refusing to write|system path/);
  }, 60000);

  it('creates parent directories if they do not exist', async () => {
    const outputPath = join(tmpDir, 'nested', 'deep', 'box.stl');
    const result = await exportStlTool({
      code: 'return box(5, 5, 5);',
      output_path: outputPath,
    });
    expect(result.ok).toBe(true);
    expect(existsSync(outputPath)).toBe(true);
  }, 60000);

  it('rejects dangerous output_path with kernelCAD-level validation', async () => {
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: '/etc/cannot-write-here.stl',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Refusing to write|system path/);
  });

  it('rejects path with traversal segments', async () => {
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: '/tmp/../etc/escape.stl',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/path-traversal/);
  });
});

describe('binary STL header forensic stamps', () => {
  it('binary STL header starts with "kernelcad "', async () => {
    const outputPath = join(tmpDir, 'header-check.stl');
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: outputPath,
    });
    expect(result.ok).toBe(true);

    const buf = readFileSync(outputPath);
    // First 80 bytes are the header (ASCII text or zeros).
    // Should start with "kernelcad " (10 chars).
    const headerPrefix = buf.subarray(0, 10).toString('ascii');
    expect(headerPrefix).toBe('kernelcad ');
  }, 60000);

  it('binary STL header is exactly 80 bytes (triangle count at byte 80)', async () => {
    const outputPath = join(tmpDir, 'header-size.stl');
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: outputPath,
    });
    expect(result.ok).toBe(true);

    const buf = readFileSync(outputPath);
    // After 80-byte header is the uint32 LE triangle count.
    // For a box: 12 triangles, so bytes [80..83] = 12 (little-endian).
    expect(buf.readUInt32LE(80)).toBe(12);
  }, 60000);
});

describe('export_stl feature_id paths', () => {
  it('successfully exports with explicit feature_id', async () => {
    const code = 'return box(10, 10, 10);';
    const run = await runScript({ code, fileName: '<test>' });
    const lastId = run.records[run.records.length - 1].id;

    const outputPath = join(tmpDir, 'box-by-id.stl');
    const result = await exportStlTool({
      code,
      output_path: outputPath,
      feature_id: lastId,
    });

    expect(result.ok).toBe(true);
    expect(result.byte_count).toBeGreaterThan(0);
    expect(existsSync(outputPath)).toBe(true);
  }, 60000);

  it('exports an intermediate feature (box, not the filleted result)', async () => {
    const code = 'return box(10, 10, 10).fillet(2);';
    const run = await runScript({ code, fileName: '<test>' });
    // The first record is the box; the fillet is the second (last) record.
    const boxId = run.records[0].id;

    const outputPath = join(tmpDir, 'box-only.stl');
    const result = await exportStlTool({
      code,
      output_path: outputPath,
      feature_id: boxId,
    });

    expect(result.ok).toBe(true);

    // A plain box has exactly 12 triangles → 80 + 4 + 12*50 = 684 bytes.
    // A filleted box has many more triangles.
    const buf = readFileSync(outputPath);
    const triangleCount = buf.readUInt32LE(80);
    expect(triangleCount).toBe(12);
    expect(buf.length).toBe(684);
  }, 60000);

  it('returns ok: false when feature_id is not found', async () => {
    const code = 'return box(10, 10, 10);';
    const outputPath = join(tmpDir, 'nope.stl');
    const result = await exportStlTool({
      code,
      output_path: outputPath,
      feature_id: 'feature-id-that-does-not-exist',
    });

    expect(result.ok).toBe(false);
    // The export.feature-not-found diagnostic surfaces in result.diagnostics[].message.
    const message = result.error ?? result.diagnostics?.[0]?.message ?? '';
    expect(message).toMatch(/not found/i);
    expect(existsSync(outputPath)).toBe(false);
  }, 60000);
});
