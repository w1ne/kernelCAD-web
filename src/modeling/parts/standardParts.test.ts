import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

describe('lib.standard.* typed wrappers', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('boltSHCS({ thread: M3, lengthMm: 12 }) resolves the bundled record', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const bolt = await api.lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 });
    expect(bolt).toBeDefined();
  });

  it('bearing608 resolves without arguments', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const b = await api.lib.standard.bearing608();
    expect(b).toBeDefined();
  });

  it('nutHex({ thread: M3 }) resolves', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const n = await api.lib.standard.nutHex({ thread: 'M3' });
    expect(n).toBeDefined();
  });

  it('nema17 resolves', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const m = await api.lib.standard.nema17();
    expect(m).toBeDefined();
  });
});
