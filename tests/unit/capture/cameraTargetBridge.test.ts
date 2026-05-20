import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { serializeForBridge, rehydrateFromBridge } from '../../../src/modeling/capture/featureMeshSerialize';
import { ParamTable } from '../../../src/shared/runtime/paramTable';

describe('cameraTarget bridge', () => {
  it('emits a virtual record on the meshing wire', async () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 0, y: 0, z: 15 });
    const records = s.getRecords();
    const result = await meshFeaturesPerFeature(records, new ParamTable(), s);
    const cam = result.features.find(f => f.featureKind === 'cameraTarget');
    expect(cam).toBeDefined();
    expect(cam?.virtual).toBe(true);
    expect(cam?.cameraTarget?.target).toEqual([0, 0, 15]);
    expect(cam?.cameraTarget?.distance).toBeUndefined();
  });

  it('round-trips a distance override through serialize/rehydrate', async () => {
    const s = new CaptureSession();
    s.addCameraTarget({ x: 1, y: 2, z: 3, distance: 250 });
    const result = await meshFeaturesPerFeature(s.getRecords(), new ParamTable(), s);
    const cam = result.features.find(f => f.featureKind === 'cameraTarget')!;
    const ser = serializeForBridge(cam);
    const re = rehydrateFromBridge(ser);
    expect(re.cameraTarget?.target).toEqual([1, 2, 3]);
    expect(re.cameraTarget?.distance).toBe(250);
  });
});
