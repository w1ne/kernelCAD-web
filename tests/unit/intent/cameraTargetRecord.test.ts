import { describe, it, expect } from 'vitest';
import type {
  CameraTargetSpec,
  CameraTargetMetadata,
} from '../../../src/shared/intent/cameraTargetRecord';

describe('cameraTargetRecord', () => {
  it('CameraTargetSpec allows x/y/z plus optional distance', () => {
    const a: CameraTargetSpec = { x: 0, y: 0, z: 15 };
    const b: CameraTargetSpec = { x: 1, y: 2, z: 3, distance: 250 };
    expect(a.x).toBe(0);
    expect(a.distance).toBeUndefined();
    expect(b.distance).toBe(250);
  });

  it('CameraTargetMetadata always has virtual: true and a tuple target', () => {
    const m: CameraTargetMetadata = { virtual: true, target: [0, 0, 15] };
    expect(m.virtual).toBe(true);
    expect(m.target).toEqual([0, 0, 15]);
    expect(m.distance).toBeUndefined();
  });

  it('CameraTargetMetadata round-trips a distance override', () => {
    const m: CameraTargetMetadata = { virtual: true, target: [1, 2, 3], distance: 250 };
    expect(m.distance).toBe(250);
  });
});
