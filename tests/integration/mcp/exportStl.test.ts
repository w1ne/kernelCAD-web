// tests/integration/mcp/exportStl.test.ts
import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportStlTool } from '../../../src/mcp/tools/exportStl';

beforeAll(async () => {
  const { initOcct } = await import('../../../src/backends/occt/occtBackend');
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

  it('returns ok: false on unwritable path', async () => {
    // Use a path inside a non-existent root directory that cannot be created
    // (/root is not writable by unprivileged users)
    const result = await exportStlTool({
      code: 'return box(10, 10, 10);',
      output_path: '/root/kernelcad-test-unwritable/box.stl',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot write/);
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
});
