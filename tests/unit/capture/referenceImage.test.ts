// tests/unit/capture/referenceImage.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

// Minimal 1x1 transparent PNG bytes (validated 89-byte IHDR-based PNG).
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000150fdb88e0000000049454e44ae426082',
  'hex',
);

describe('referenceImage()', () => {
  it('creates a virtual feature record with metadata.virtual = true', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-refimg-test-'));
    try {
      const imgPath = join(tmpDir, 'test.png');
      writeFileSync(imgPath, PNG_1X1);

      const session = new CaptureSession();
      session.scriptDir = tmpDir;
      const kcad = createApi({ session });
      const handle = kcad.referenceImage('./test.png', {
        plane: 'xz',
        anchor: 'origin',
        scale: 'fit-bbox',
        opacity: 0.5,
      });

      const record = session.getRecords().find(r => r.id === handle.id)!;
      expect(record).toBeDefined();
      expect(record.kind).toBe('referenceImage');
      expect(record.metadata?.virtual).toBe(true);
      expect(handle.metadata.plane).toBe('xz');
      expect(handle.metadata.anchor).toBe('origin');
      expect(handle.metadata.scale).toBe('fit-bbox');
      expect(handle.metadata.opacity).toBe(0.5);
      expect(handle.metadata.flipU).toBe(false);
      expect(handle.metadata.flipV).toBe(false);
      // PNG 1x1: pixelWidth and pixelHeight should parse correctly
      expect(handle.metadata.pixelWidth).toBe(1);
      expect(handle.metadata.pixelHeight).toBe(1);
      expect(handle.metadata.path).toBe(imgPath);
      // No diagnostics for a valid call
      const diagnostics = record.metadata?.diagnostics as unknown[];
      expect(!diagnostics || diagnostics.length === 0).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('emits feature.reference-image.path-not-found on missing file', () => {
    const session = new CaptureSession();
    session.scriptDir = '/tmp';
    const kcad = createApi({ session });
    const handle = kcad.referenceImage('./does-not-exist.png', { plane: 'xz' });

    const record = session.getRecords().find(r => r.id === handle.id)!;
    expect(record).toBeDefined();
    expect(record.kind).toBe('referenceImage');
    const diagnostics = record.metadata?.diagnostics as Array<{ code: string }>;
    expect(diagnostics).toBeDefined();
    expect(diagnostics.some(d => d.code === 'feature.reference-image.path-not-found')).toBe(true);
  });

  it('emits feature.reference-image.format-unsupported for unsupported format', () => {
    const session = new CaptureSession();
    session.scriptDir = '/tmp';
    const kcad = createApi({ session });
    const handle = kcad.referenceImage('./bad.gif', { plane: 'xz' });

    const record = session.getRecords().find(r => r.id === handle.id)!;
    expect(record).toBeDefined();
    expect(record.kind).toBe('referenceImage');
    const diagnostics = record.metadata?.diagnostics as Array<{ code: string }>;
    expect(diagnostics).toBeDefined();
    expect(diagnostics.some(d => d.code === 'feature.reference-image.format-unsupported')).toBe(true);
  });
});
