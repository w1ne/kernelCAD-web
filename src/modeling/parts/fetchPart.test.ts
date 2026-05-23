import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { fetchPartHost } from './fetchPart';

describe('fetchPart orchestrator', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('resolves a bundled id to a Shape (no network)', async () => {
    const session = new CaptureSession();
    const r = await fetchPartHost({ session }, 'iso-4762-m3x12', {});
    expect(r.shape).toBeDefined();
    expect(r.record.id).toBe('iso-4762-m3x12');
    expect(r.record.source).toBe('local-catalog');
  });

  it('returns parts.fetch.remote-disabled when id is unknown and no partsBaseUrl is set', async () => {
    const session = new CaptureSession();
    try {
      await fetchPartHost({ session }, 'made-up-id-not-in-bundle', {});
      throw new Error('expected fetchPartHost to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('parts.fetch.remote-disabled');
    }
  });
});
