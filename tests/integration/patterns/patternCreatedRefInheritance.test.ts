// tests/integration/patterns/patternCreatedRefInheritance.test.ts
//
// W2.1 — verifies that `created` FaceRefs from W1.1 (hole.wall, etc.) inherit
// through every pattern instance via the virtual `<sourceId>_pattern_<i>` id
// minted by the pattern lowerer's history-aware fuse.
//
// Failing today (pre-W2.1): the pattern lowerer's `case 'pattern':` uses
// OcctBackend.union (history-dropping) and bare .translate/.rotate (also
// history-dropping), so instance 1..N's bore walls carry no historyMap entries.
// A FaceRef { kind: 'created', rewriteId: 'mountBolt_pattern_2', slot: 'wall' }
// emits feature.face-ref.removed / not-resolvable.

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { createApi } from '../../../src/modules/api';
import { resolveFaceRef } from '../../../src/naming/resolveFaceRef';

describe('W2.1 — created refs inherit through pattern instances', () => {
  beforeAll(async () => { await initOcct(); });

  it('hole.wall resolves on every linear-pattern instance via <sourceId>_pattern_<i>', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Plate with a named hole → pattern 4 instances along X.
    kcad.box(120, 40, 6)
      .hole('top', { u: -45, v: 0, diameter: 5, depth: 'through', name: 'mountBolt' })
      .patternLinear({ count: 4, direction: [1, 0, 0], spacing: 30 });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const patternShape = result.shapes.get('pattern_1') as OcctBackend;
    expect(patternShape).toBeDefined();
    expect(patternShape.historyMap).toBeDefined();

    // The source hole's FeatureId in this session is 'hole_1' (kind-counter).
    // After W2.1, the pattern feature's historyMap carries lineage entries
    // tagged with featureId='hole_1_pattern_0'..'hole_1_pattern_3' for the
    // four bore walls.
    for (let i = 0; i < 4; i++) {
      const resolved = resolveFaceRef(
        { kind: 'created', rewriteId: `hole_1_pattern_${i}`, slot: 'wall' },
        { currentShape: patternShape, featureId: 'test', surface: 'edge-feature' },
      );
      expect(resolved.ok, `instance ${i} wall must resolve`).toBe(true);
    }
  });
});
