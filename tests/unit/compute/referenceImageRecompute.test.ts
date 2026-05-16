import { describe, it, expect } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 1×1 transparent PNG (minimal valid).
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000150fdb88e0000000049454e44ae426082',
  'hex',
);

describe('referenceImage record routes through recompute', () => {
  it('does not error when a script calls referenceImage alongside a normal box', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-ref-recompute-'));
    writeFileSync(join(dir, 'test.png'), PNG_1X1);

    try {
      const model = await buildModel({
        fileName: 'test.kcad.ts',
        scriptDir: dir,
        code: `
          referenceImage('./test.png', { plane: 'xz' });
          const b = box(10, 10, 10);
          return b;
        `,
      });

      const refRecord = model.records.find(r => r.kind === 'referenceImage');
      const boxRecord = model.records.find(r => r.kind === 'box');

      expect(refRecord).toBeDefined();
      expect(boxRecord).toBeDefined();

      // referenceImage is virtual — no BREP, but it must be healthy
      expect(model.health.get(refRecord!.id)).toBe('healthy');

      // box must lower successfully
      expect(model.health.get(boxRecord!.id)).toBe('healthy');

      // No 'feature.invalid-args' emitted for the referenceImage record
      const errs = model.diagnostics.filter(
        d => d.code === 'feature.invalid-args' && d.featureId === refRecord!.id,
      );
      expect(errs).toEqual([]);

      // Overall: no errors at all
      expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
