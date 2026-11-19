// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The K-Spray K-Lift gallery example fastened the window frame, glass, mask
// film, tape strips and foam bands to the ground through connectors at the
// wall foot, 2.4 to 5.2 m from the parts, and moved the grown parts through a
// param in their transform. The hinge hubs ran 5 mm clear of their bores and
// the carriage declared no clearance to the rail. evaluate_script failed it
// with 32 errors (motion-on-fixed-joint, joint-mesh-gap, mate-gap and
// connector-not-in-solid). Each scene part is now fastened to the part that
// carries it at a seat on their shared face, and a grown part changes size
// from a fixed corner.

import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { connectorsInSolidDiagnostics } from '../../../src/modeling/mates/mechanicalPlausibility';
import { partBackend } from '../../../src/modeling/mates/partBackend';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { pointTriangleDistanceSq } from '../../../src/modeling/runtime/meshDeviation';
import type { RuntimeMesh } from '../../../src/kernel/backends/runtimeMesh';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

const EXAMPLE_PATH = 'examples/gallery/kspray-klift.kcad.ts';
// Every seat is a point on a planar face; this allows float error only.
const SEAT_ON_SURFACE_TOL_MM = 0.01;

// Sampled from the animationView tracks: the service cycle complete, the hand
// at the wall on each tape strip, and the gun at the top of the foam pass.
const CYCLE_DONE = { maskProgress: 1, tapeTopP: 1, tapeBottomP: 1, foamLowerP: 1, foamUpperP: 1 };
const WORKING_POSES: Record<string, Record<string, number>> = {
  'top tape, hand left': { upperRelDeg: -40, platformRelDeg: -30, carriageMm: 642, extX: 954, gripY: -660, ...CYCLE_DONE },
  'top tape, hand right': { upperRelDeg: -40, platformRelDeg: -30, carriageMm: 642, extX: 954, gripY: 660, ...CYCLE_DONE },
  'bottom tape, hand left': { upperRelDeg: -83, platformRelDeg: 13, carriageMm: 297, extX: 715, gripY: -660, ...CYCLE_DONE },
  'bottom tape, hand right': { upperRelDeg: -83, platformRelDeg: 13, carriageMm: 297, extX: 715, gripY: 660, ...CYCLE_DONE },
  'foam pass top': { upperRelDeg: -40, platformRelDeg: -30, carriageMm: 760, extX: 0, gripY: 664, ...CYCLE_DONE },
};

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

function onlyAssembly(model: BuiltModel | undefined): Assembly {
  const assemblies = [...(model?.session.assemblies.values() ?? [])] as Assembly[];
  expect(assemblies.length).toBe(1);
  return assemblies[0];
}

async function expectSeatsOnMaterial(model: BuiltModel | undefined): Promise<void> {
  const lift = onlyAssembly(model);
  expect(lift.__parts().length).toBe(15);
  expect(await connectorsInSolidDiagnostics(lift)).toEqual([]);

  const partsByName = new Map(lift.__parts().map((part) => [part.name, part]));
  const fastened = lift.__mates().filter((mate) => mate.type === 'fastened');
  expect(lift.__mates().length).toBe(14);
  expect(fastened.length).toBe(10);
  const offSeat: string[] = [];
  for (const mate of fastened) {
    for (const ref of [mate.a, mate.b]) {
      const dot = ref.indexOf('.');
      const part = partsByName.get(ref.slice(0, dot));
      const connector = part?.mateConnectors.find((c) => c.name === ref.slice(dot + 1));
      if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') {
        offSeat.push(`${ref}: no vec3 connector`);
        continue;
      }
      const mesh = (await partBackend(lift, part.originalShape)).getMesh();
      const mm = distanceToMeshMm(mesh, connector.origin.value);
      if (mm > SEAT_ON_SURFACE_TOL_MM) offSeat.push(`${ref}: ${mm.toFixed(2)} mm from '${part.name}'`);
    }
  }
  expect(offSeat).toEqual([]);
}

describe('K-Spray K-Lift gallery example', () => {
  it('passes evaluate_script with no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE_PATH, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 300_000);

  it('validates as a real mechanism with the interference sweep', async () => {
    const result = await runValidateCli({
      file: EXAMPLE_PATH,
      json: true,
      includeInterference: true,
      epsilon: 0.01,
      physical: false,
      includePhysics: false,
    });
    expect(result.mechanismFailures ?? []).toEqual([]);
    expect(result.mechanism).toBe('real');
  }, 600_000);

  it('seats every fastened mate on the material of both mated parts', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.evaluation.exitCode).toBe(0);
    await expectSeatsOnMaterial(result.model);
  }, 300_000);

  it('keeps the seats and stays collision-free at the animation working poses', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.model).toBeDefined();
    for (const [name, pose] of Object.entries(WORKING_POSES)) {
      const edited = await updateModelParams(
        result.model!,
        Object.entries(pose).map(([param, value]) => ({ name: param, value })),
      );
      const scene = edited.model.rootShape;
      if (scene === undefined || !isSceneBackend(scene)) throw new Error(`${name}: the model root is not a scene`);
      const clash = detectInterferences(scene, 0.01, new Set<string>(), []);
      expect(clash.partCount, name).toBe(15);
      expect(clash.uncheckedPairs, name).toEqual([]);
      expect(clash.pairs.map((pair) => `${pair.a} x ${pair.b}`), name).toEqual([]);
      await expectSeatsOnMaterial(edited.model);
    }
  }, 600_000);
});
