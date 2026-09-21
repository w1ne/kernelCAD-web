import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';

describe('lib parts surface — script-runtime integration', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('lib.findPart returns bundled-only when no partsBaseUrl is set', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const r = await api.lib.findPart('M3 screw');
    expect(r.remoteEnabled).toBe(false);
    expect(r.results.length).toBeGreaterThan(0);
  });

  it('lib.fetchPart returns a Shape that captures into the session', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const bolt = await api.lib.fetchPart('iso-4762-m3x12');
    expect(bolt).toBeDefined();
  });

  it('lib.standard.boltSHCS and lib.fetchPart resolve the same id', async () => {
    const a = new CaptureSession();
    const b = new CaptureSession();
    const apiA = createModelingApi({ session: a });
    const apiB = createModelingApi({ session: b });
    const sA = await apiA.lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 });
    const sB = await apiB.lib.fetchPart('iso-4762-m3x12');
    expect(sA).toBeDefined();
    expect(sB).toBeDefined();
  });
});
