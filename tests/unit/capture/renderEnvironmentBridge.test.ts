import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { serializeForBridge, rehydrateFromBridge } from '../../../src/modeling/capture/featureMeshSerialize';
import { ParamTable } from '../../../src/shared/runtime/paramTable';

describe('renderEnvironment bridge', () => {
  it('emits a virtual record on the meshing wire', async () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ preset: 'studio', intensity: 1.5, rotation: 30 });
    const records = s.getRecords();
    const result = await meshFeaturesPerFeature(records, new ParamTable(), s);
    const env = result.features.find(f => f.featureKind === 'renderEnvironment');
    expect(env).toBeDefined();
    expect(env?.virtual).toBe(true);
    expect(env?.renderEnvironment?.preset).toBe('studio');
    expect(env?.renderEnvironment?.intensity).toBe(1.5);
    expect(env?.renderEnvironment?.rotation).toBe(30);
  });

  it('round-trips through serialize/rehydrate', async () => {
    const s = new CaptureSession();
    s.addRenderEnvironment({ url: '/hdri/x.hdr' });
    const result = await meshFeaturesPerFeature(s.getRecords(), new ParamTable(), s);
    const env = result.features.find(f => f.featureKind === 'renderEnvironment')!;
    const ser = serializeForBridge(env);
    const re = rehydrateFromBridge(ser);
    expect(re.renderEnvironment?.url).toBe('/hdri/x.hdr');
  });
});
