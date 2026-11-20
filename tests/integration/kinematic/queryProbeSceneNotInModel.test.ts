// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An in-script kinematic query lowers a probe scene of the assembly. That
// probe scene must not stay in the model: it was meshed as a second copy of
// every part, fixed at the probe pose, so an animation of the returned scene
// showed the moving part at its rest pose and at its current pose at once.
//
// The script calls suggestJointRanges, checkSweptCollision, checkStaticHold
// and motionLoad on one assembly, then returns one posed scene.

import { describe, expect, it } from 'vitest';
import { buildModel, updateModelParams } from '../../../src/composition/buildModel';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';

const SCRIPT = `
const slideMm = param('slideMm', 0.1, { min: 0.1, max: 9.8 });
const arm = assembly('probe-scene');
const rail = arm.part('rail', box(10, 30, 20));
const carriage = arm.part('carriage', box(20, 16, 12));
rail.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [10, 15, 10] }, axis: [1, 0, 0] });
carriage.connector('slide', { type: 'axis', origin: { kind: 'vec3', value: [0, 8, 6] }, axis: [1, 0, 0] });
arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', { pose: slideMm, limitsMm: [0.1, 9.8] });

await kinematic.suggestJointRanges(arm, { joint: 'slide', search: [0, 12], resolution: 0.5 });
await kinematic.checkSweptCollision(arm, { joint: 'slide', range: [1, 9, 4] });
await kinematic.checkStaticHold(arm, { pose: { slide: 5 } });
await kinematic.motionLoad(arm, {});

return arm.solvedModel({});
`;

describe('in-script kinematic queries leave no probe scene in the model', () => {
  it('records one solvedAssembly and meshes each part once, at the current pose', async () => {
    const model = await buildModel({ code: SCRIPT, fileName: 'probe-scene.kcad.ts' });
    const scenes = model.records.filter((r) => r.kind === 'solvedAssembly');
    expect(scenes.map((r) => r.id)).toHaveLength(1);

    await updateModelParams(model, [{ name: 'slideMm', value: 9 }]);
    const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    const carriages = meshing.features.filter((f) => f.featureId.endsWith('__carriage'));
    expect(carriages.map((f) => f.featureId)).toHaveLength(1);
    // Rail face x = 10 plus slide 9: the carriage frame is at x = 19.
    expect(carriages[0]!.transform![12]).toBeCloseTo(19, 6);
  }, 120_000);
});
