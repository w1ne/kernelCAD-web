import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('pattern capture contract', () => {
  it('captures a linear pattern as one feature with base input and spacing metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const base = kcad.box(10, 5, 2);
    const pattern = base.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 12 });

    const records = session.getRecords();
    expect(pattern.id).toMatch(/^pattern_/);
    expect(records.at(-1)).toMatchObject({
      kind: 'pattern',
      inputs: { base: { kind: 'feature', id: base.id } },
      metadata: {
        pattern: {
          kind: 'linear',
          count: 4,
          direction: [1, 0, 0],
          spacing: 12,
        },
      },
    });
  });

  it('rejects invalid pattern counts before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const base = kcad.box(10, 5, 2);

    expect(() => base.patternLinear({ count: 1, direction: [1, 0, 0], spacing: 12 }))
      .toThrow(/count must be an integer >= 2/);
  });
});
