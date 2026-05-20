import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { CameraTargetMetadata } from '../../../src/shared/intent/cameraTargetRecord';

function getMeta(session: CaptureSession): CameraTargetMetadata {
  const records = session.getRecords();
  const rec = records.find(r => r.kind === 'cameraTarget');
  if (!rec) throw new Error('expected cameraTarget record');
  return rec.metadata as unknown as CameraTargetMetadata;
}

describe('CaptureSession.addCameraTarget', () => {
  it('captures a target with defaults', () => {
    const s = new CaptureSession();
    const id = s.addCameraTarget({ x: 0, y: 0, z: 15 });
    const meta = getMeta(s);
    expect(id).toMatch(/^cameraTarget_/);
    expect(meta.virtual).toBe(true);
    expect(meta.target).toEqual([0, 0, 15]);
    expect(meta.distance).toBeUndefined();
  });

  it('captures a target with an explicit distance override', () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 5, y: -2, z: 10, distance: 300 });
    const meta = getMeta(s);
    expect(meta.target).toEqual([5, -2, 10]);
    expect(meta.distance).toBe(300);
  });

  it('emits a diagnostic when a coord is non-finite', () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 0, y: Number.NaN, z: 15 });
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.camera-target.non-finite-target');
    // Default-safe substitution: bad axis falls back to 0.
    expect(meta.target).toEqual([0, 0, 15]);
  });

  it('emits a diagnostic for a non-positive distance and drops the override', () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 0, y: 0, z: 0, distance: -5 });
    const meta = getMeta(s);
    const diags = (meta as unknown as { diagnostics?: Array<{ code: string }> }).diagnostics;
    expect(diags?.[0]?.code).toBe('feature.camera-target.invalid-distance');
    expect(meta.distance).toBeUndefined();
  });

  it('keeps multiple records when called twice (last-wins resolution is in the renderer)', () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 0, y: 0, z: 0 });
    s.addCameraTarget({ x: 1, y: 2, z: 3 });
    const recs = s.getRecords().filter(r => r.kind === 'cameraTarget');
    expect(recs).toHaveLength(2);
  });
});
