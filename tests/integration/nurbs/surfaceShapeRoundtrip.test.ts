import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
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
    expect(backend.boundingBox()).toBeTruthy();
  });
});
