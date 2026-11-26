// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';
import { runContactDynamics } from '../../../src/modeling/runtime/contactDynamics';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { MujocoSession } from '../../../src/modeling/runtime/mujocoSessionCore';

const folder = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(folder, 'escapement.kcad.ts'), 'utf8');
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const { evaluation, model } = await evaluateAndBuildScript({ code: source });
await writeFile(join(folder, 'evaluation.json'), JSON.stringify(evaluation, null, 2) + '\n');
if (!model || model.session.assemblies.size !== 1) throw new Error(JSON.stringify(evaluation));
const arm = model.session.assemblies.values().next().value as Assembly;
const contactModel = { friction: [0.2, 0, 0] as const, solref: [0.001, 1] as const, solimp: [0.99, 0.999, 0.001] as const };
const compiled = await assemblyToMjcf(arm, { contactModel });
if (compiled.inertiaNotes.length > 0) throw new Error(JSON.stringify(compiled.inertiaNotes));
await writeFile(join(folder, 'model.xml'), compiled.mjcf);
console.log(JSON.stringify({ phase: 'compiled', parts: compiled.bodyOrder, mjcfBytes: compiled.mjcf.length }));
const settings = {
  durationSeconds: 2,
  timestepSeconds: [0.0005, 0.00025],
  efforts: { wheel: -0.00001 },
  pairs: [
    { bodies: ['wheel', 'entry'] as const, minEpisodes: 2, maxPenetrationMm: 0.1, minNormalForceN: 0.0001 },
    { bodies: ['wheel', 'exit'] as const, minEpisodes: 2, maxPenetrationMm: 0.1, minNormalForceN: 0.0001 },
  ],
  sequence: { order: [0, 1], minCycles: 2 },
  contactModel,
  assumptions: {
    radiusMm: 34, densitiesKgM3: { wheel: 8500, anchor: 7850, entry: 4000, exit: 4000, base: 2700 },
    jointDampingNmsPerRad: 1e-7, anchorStiffnessNmPerRad: 0,
    initialWheelCounterclockwiseDeg: 47.4, initialAnchorCounterclockwiseDeg: 7.5,
    initialVelocities: 0,
    gravity: 'Z-down; hinge axes Z, mechanism XY. No in-plane gravitational oscillator.',
    limitations: 'No oscillator or calibrated dynamics existed in the animation. Profiles preserve un-bevelled tooth/pallet outlines; decorative pinion/arbors/fasteners omitted from moving inertia; no hardware acceptance.',
  },
};
await writeFile(join(folder, 'settings.json'), JSON.stringify(settings, null, 2) + '\n');
const runs = [];
for (const dtSeconds of settings.timestepSeconds) {
  const session = await loadMujocoSession(compiled.mjcf, compiled.bodyOrder, compiled.jointOrder);
  const trace: unknown[] = [];
  let count = 0;
  const sampledSession = new Proxy(session, {
    get(target, key) {
      if (key === 'contactWrenchesNow') return () => {
        const contacts = target.contactWrenchesNow();
        if (count++ % Math.round(0.01 / dtSeconds) === 0) {
          const loads = settings.pairs.map(({ bodies }) => contacts.filter((c) => c.active &&
            (c.bodyA === bodies[0] && c.bodyB === bodies[1] || c.bodyA === bodies[1] && c.bodyB === bodies[0]))
            .reduce((sum, c) => sum + Math.max(0, c.forceN[0]), 0));
          trace.push({ timeSeconds: target.timeSeconds, joints: target.scalarJointStatesNow(),
            poses: Object.fromEntries([...target.bodyPosesNow()].map(([name, pose]) => [name, pose.matrix])), normalLoadsN: loads });
        }
        return contacts;
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as MujocoSession;
  try {
    const result = runContactDynamics(sampledSession, { ...settings, dtSeconds, steps: Math.round(settings.durationSeconds / dtSeconds) });
    runs.push({ dtSeconds, result, trace, compiledGeoms: session.compiledGeoms() });
    console.log(JSON.stringify({ phase: 'result', dtSeconds, result }));
  } finally { session.dispose(); }
}
const proof = {
  capturedAt: new Date().toISOString(), scope: 'Local independent forward simulation. Missing original oscillator retained; no prescribed positions after initial state.',
  sourceSha256: sha256(source), mjcfSha256: sha256(compiled.mjcf),
  settings, runs,
};
await writeFile(join(folder, 'results.json'), JSON.stringify(proof, null, 2) + '\n');
