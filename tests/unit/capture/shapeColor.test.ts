// tests/unit/capture/shapeColor.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('Shape.color', () => {
  it('writes a token onto the feature record metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).color('servo');
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.color).toBe('servo');
  });

  it('writes a hex literal onto the feature record metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).color('#ff0080');
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.color).toBe('#ff0080');
  });

  it('returns the same Shape for further chaining', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).color('servo').translate(5, 0, 0);
    expect(s).toBeDefined();
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.color).toBe('servo');
  });

  it('boolean operations produce a new Shape with no color', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.box(10, 10, 10).color('servo');
    const b = kcad.box(5, 5, 5).color('gear');
    const u = a.union(b);
    const records = session.getRecords();
    const unionRecord = records.find(r => r.id === u.id);
    // Union has its own ID; metadata.color is not inherited.
    expect(unionRecord?.metadata?.color).toBeUndefined();
  });

  it('color tags every supported role token', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    for (const token of ['servo', 'gear', 'beam', 'shaft', 'plate', 'pin', 'frame', 'tool'] as const) {
      const s = kcad.box(1, 1, 1).color(token);
      const record = session.getRecords().find(r => r.id === s.id);
      expect(record?.metadata?.color).toBe(token);
    }
  });
});
