// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The hand coffee grinder gallery example put all 36 mate connectors at the
// world origin, so 35 of them were 34 to 210.6 mm from their part and
// evaluate_script failed the example with 35
// assembly.mechanical.connector-not-in-solid errors. Each fastened mate now
// names its seat: a point on the face the two parts share. The seats read the
// current parameter values, so they stay on the parts after a parameter edit.

import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { connectorsInSolidDiagnostics } from '../../../src/modeling/mates/mechanicalPlausibility';
import { partBackend } from '../../../src/modeling/mates/partBackend';
import { pointTriangleDistanceSq } from '../../../src/modeling/runtime/meshDeviation';
import type { RuntimeMesh } from '../../../src/kernel/backends/runtimeMesh';

const EXAMPLE_PATH = 'examples/gallery/hand-coffee-grinder.kcad.ts';
// Largest modelled gap at a seat: the thread flank play and the display-mesh
// chord error of the 4 mm journal.
const SEAT_ON_SURFACE_TOL_MM = 0.3;

function distanceToMeshMm(mesh: RuntimeMesh, p: readonly number[]): number {
  const { positions: v, indices } = mesh;
  let best = Infinity;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t];
    const b = 3 * indices[t + 1];
    const c = 3 * indices[t + 2];
    best = Math.min(best, pointTriangleDistanceSq(
      p[0], p[1], p[2],
      v[a], v[a + 1], v[a + 2], v[b], v[b + 1], v[b + 2], v[c], v[c + 1], v[c + 2],
    ));
  }
  return Math.sqrt(best);
}

async function expectSeatsOnMaterial(model: BuiltModel | undefined): Promise<void> {
  const assemblies = [...(model?.session.assemblies.values() ?? [])] as Assembly[];
  expect(assemblies.length).toBe(1);
  const arm = assemblies[0];

  // The evaluate_script publish gate (bounding box + 6 mm), all 18 mates.
  expect(arm.__mates().length).toBe(18);
  expect(await connectorsInSolidDiagnostics(arm)).toEqual([]);

  // Stricter than the gate: the seat is on the surface of both parts.
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const meshes = new Map<string, RuntimeMesh>();
  const fastened = arm.__mates().filter((mate) => mate.type === 'fastened');
  expect(fastened.length).toBe(17);
  const offSeat: string[] = [];
  for (const mate of fastened) {
    const origins: string[] = [];
    for (const ref of [mate.a, mate.b]) {
      const dot = ref.indexOf('.');
      const part = partsByName.get(ref.slice(0, dot));
      const connector = part?.mateConnectors.find((c) => c.name === ref.slice(dot + 1));
      if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') {
        offSeat.push(`${ref}: no vec3 connector`);
        continue;
      }
      let mesh = meshes.get(part.name);
      if (mesh === undefined) {
        mesh = (await partBackend(arm, part.originalShape)).getMesh();
        meshes.set(part.name, mesh);
      }
      origins.push(connector.origin.value.join(','));
      const mm = distanceToMeshMm(mesh, connector.origin.value);
      if (mm > SEAT_ON_SURFACE_TOL_MM) offSeat.push(`${ref}: ${mm.toFixed(2)} mm from '${part.name}'`);
    }
    if (origins[0] !== origins[1]) offSeat.push(`${mate.name}: connectors differ (${origins.join(' vs ')})`);
  }
  expect(offSeat).toEqual([]);
}

describe('hand coffee grinder gallery example connector seats', () => {
  it('puts every fastened-mate connector on the material of both mated parts', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.evaluation.exitCode).toBe(0);
    await expectSeatsOnMaterial(result.model);
  }, 600_000);

  // With seats fixed at the default parameters, bodyLength = 200 put 11
  // connectors off their parts.
  it('keeps the seats on the parts after a parameter edit', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.model).toBeDefined();
    const edited = await updateModelParams(result.model!, [
      { name: 'bodyLength', value: 200 },
      { name: 'bodyDiameter', value: 66 },
      { name: 'grindSetting', value: 1.5 },
      { name: 'crankLength', value: 110 },
    ]);
    await expectSeatsOnMaterial(edited.model);
  }, 600_000);
});
