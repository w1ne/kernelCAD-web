import { describe, it, expect } from 'vitest';
import { createApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';

describe('setRenderEnvironment() top-level API', () => {
  it('captures a preset record and returns a handle', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const handle = api.setRenderEnvironment({ preset: 'studio' });
    expect(handle.id).toMatch(/^renderEnvironment_/);
    expect(handle.metadata.preset).toBe('studio');
    expect(handle.metadata.intensity).toBe(1);
    expect(handle.metadata.rotation).toBe(0);
    expect(session.getRecords().filter(r => r.kind === 'renderEnvironment')).toHaveLength(1);
  });

  it('captures a url spec with full options', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const handle = api.setRenderEnvironment({ url: '/hdri/x.hdr', intensity: 1.5, rotation: 45 });
    expect(handle.metadata.url).toBe('/hdri/x.hdr');
    expect(handle.metadata.intensity).toBe(1.5);
    expect(handle.metadata.rotation).toBe(45);
  });
});
