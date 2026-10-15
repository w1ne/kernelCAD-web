// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';

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
    const api = createModelingApi({ session });
    const bolt = await api.lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 });
    expect(bolt).toBeDefined();
  });

  it('bearing608 resolves without arguments', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const b = await api.lib.standard.bearing608();
    expect(b).toBeDefined();
  });

  it('nutHex({ thread: M3 }) resolves', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const n = await api.lib.standard.nutHex({ thread: 'M3' });
    expect(n).toBeDefined();
  });

  it('nema17 resolves', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const m = await api.lib.standard.nema17();
    expect(m).toBeDefined();
  });
});

describe('SG90 community reference shortcuts', () => {
  it('fetches genuine local motor and horn with authored connectors and provenance', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const motor = await api.lib.standard.sg90();
    const horn = await api.lib.standard.sg90HornSingleArm();
    expect(session.catalogConnectors.get(motor.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'shaft-output', origin: [0, 0, 29.9], axis: [0, 0, 1] }),
      expect.objectContaining({ name: 'ear-mount-low', origin: [0, -18.95, 15.9], normal: [0, 0, -1] }),
      expect.objectContaining({ name: 'ear-mount-high', origin: [0, 8.25, 15.9], normal: [0, 0, -1] }),
    ]));
    expect(session.catalogConnectors.get(horn.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'spline-socket', origin: [0, 0, 5], normal: [0, 0, 1] }),
      expect.objectContaining({ name: 'mount-hole-17', origin: [17, 0, 0], axis: [0, 0, 1] }),
    ]));
  }, 120000);
});
