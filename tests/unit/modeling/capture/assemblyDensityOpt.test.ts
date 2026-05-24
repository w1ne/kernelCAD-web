import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';

describe('arm.part(name, shape, { density }) — Task B2', () => {
  beforeAll(async () => { await initOcct(); });

  function makeArm() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    return { session, kcad, arm };
  }

  it('stores the per-part density on AssemblyPartStored', () => {
    const { kcad, arm } = makeArm();
    arm.part('base', kcad.box(10, 10, 10), { density: 7850 });
    const parts = arm.__parts();
    expect(parts[0].density).toBe(7850);
  });

  it('records undefined density when the opt is omitted', () => {
    const { kcad, arm } = makeArm();
    arm.part('base', kcad.box(10, 10, 10));
    const parts = arm.__parts();
    expect(parts[0].density).toBeUndefined();
  });

  it('rejects a non-finite density value with a structured KernelError', () => {
    const { kcad, arm } = makeArm();
    expect(() => arm.part('base', kcad.box(10, 10, 10), { density: NaN }))
      .toThrow(/density/i);
  });

  it('rejects a non-positive density value', () => {
    const { kcad, arm } = makeArm();
    expect(() => arm.part('base', kcad.box(10, 10, 10), { density: 0 }))
      .toThrow(/density.*positive|density.*finite/i);
  });
});
