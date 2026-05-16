// tests/unit/capture/excludeFromCameraFit.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('Shape.excludeFromCameraFit', () => {
  it('writes excludeFromCameraFit = true onto the feature record metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).excludeFromCameraFit();
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.excludeFromCameraFit).toBe(true);
  });

  it('returns the same Shape for further chaining', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).excludeFromCameraFit().translate(5, 0, 0);
    expect(s).toBeDefined();
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.excludeFromCameraFit).toBe(true);
  });

  it('boolean operations produce a new Shape that does not inherit the flag', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.box(10, 10, 10).excludeFromCameraFit();
    const b = kcad.box(5, 5, 5);
    const u = a.union(b);
    const unionRecord = session.getRecords().find(r => r.id === u.id);
    // Union has its own ID; metadata.excludeFromCameraFit is not inherited.
    expect(unionRecord?.metadata?.excludeFromCameraFit).toBeUndefined();
  });

  it('flag co-exists with other metadata fields', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).color('servo').excludeFromCameraFit();
    const record = session.getRecords().find(r => r.id === s.id);
    expect(record?.metadata?.color).toBe('servo');
    expect(record?.metadata?.excludeFromCameraFit).toBe(true);
  });
});
