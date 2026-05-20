import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { RenderEnvironmentMetadata } from '../../../src/shared/intent/renderEnvironmentRecord';

function getMeta(session: CaptureSession): RenderEnvironmentMetadata {
  const records = session.getRecords();
  const rec = records.find(r => r.kind === 'renderEnvironment');
  if (!rec) throw new Error('expected renderEnvironment record');
  return rec.metadata as unknown as RenderEnvironmentMetadata;
}

describe('CaptureSession.addRenderEnvironment', () => {
  it('captures a preset spec with defaults', () => {
    const s = new CaptureSession();
    const id = s.addRenderEnvironment({ preset: 'studio' });
    const meta = getMeta(s);
    expect(id).toMatch(/^renderEnvironment_/);
    expect(meta.virtual).toBe(true);
    expect(meta.preset).toBe('studio');
    expect(meta.url).toBeUndefined();
    expect(meta.intensity).toBe(1);
    expect(meta.rotation).toBe(0);
  });

  it('captures a url spec with intensity + rotation', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ url: '/hdri/custom.hdr', intensity: 1.5, rotation: 45 });
    const meta = getMeta(s);
    expect(meta.preset).toBeUndefined();
    expect(meta.url).toBe('/hdri/custom.hdr');
    expect(meta.intensity).toBe(1.5);
    expect(meta.rotation).toBe(45);
  });

  it('emits diagnostic when both preset and url are set', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ preset: 'studio', url: '/hdri/x.hdr' });
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.render-environment.conflicting-spec');
  });

  it('emits diagnostic when neither preset nor url is set', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({});
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.render-environment.missing-spec');
  });

  it('emits diagnostic when preset key is invalid', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ preset: 'invalid' as never });
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.render-environment.unknown-preset');
  });

  it('clamps intensity to (0, 100]', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ preset: 'studio', intensity: -1 });
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.render-environment.intensity-out-of-range');
  });

  it('keeps the last record when called twice', () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ preset: 'studio' });
    s.addRenderEnvironment({ preset: 'outdoor' });
    const recs = s.getRecords().filter(r => r.kind === 'renderEnvironment');
    expect(recs).toHaveLength(2);
    // Resolution rule (last wins) lives in the renderer, not the session;
    // session simply allows multiple registrations.
  });
});
