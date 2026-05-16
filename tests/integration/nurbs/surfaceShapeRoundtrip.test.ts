import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('Surface to Shape roundtrip', () => {
  beforeAll(async () => { await initOcct(); });

  it('nurbsSurface(...).toShape().translate(50, 0, 0) composes correctly', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const shape = api
      .nurbsSurface({
        controls: [
          [[0, 0, 0], [0, 10, 0]],
          [[10, 0, 0], [10, 10, 0]],
        ],
        degree: { u: 1, v: 1 },
      })
      .toShape()
      .translate(50, 0, 0);
    const backend = await shape.lower();
    const bb = backend.boundingBox();
    expect(bb.min[0]).toBeGreaterThan(49);
    expect(bb.max[0]).toBeLessThan(61);
  });

  it('nurbsSurface(...).thicken(2) is a Shape and exposes boundingBox + volume', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const shape = api
      .nurbsSurface({
        controls: [
          [[0, 0, 0], [0, 10, 0]],
          [[10, 0, 0], [10, 10, 0]],
        ],
        degree: { u: 1, v: 1 },
      })
      .thicken(2);
    const backend = await shape.lower();
    expect(backend.volume()).toBeGreaterThan(0);
    const bb = backend.boundingBox();
    expect(bb).toBeTruthy();
    // The control net lies in the XY plane (all Z=0), so MakeThickSolidBySimple
    // offsets along +Z and the resulting solid's Z-span must match the
    // requested thickness `t === 2` within OCCT offset tolerance. This locks
    // the MakeThickSolidBySimple semantics (offset = t, not t/2) so a future
    // regression on the thicken pipeline is caught here, not just in the
    // demo-replay gate.
    const zSpan = bb.max[2] - bb.min[2];
    expect(zSpan).toBeGreaterThanOrEqual(1.9);
    expect(zSpan).toBeLessThanOrEqual(2.1);
  });
});
