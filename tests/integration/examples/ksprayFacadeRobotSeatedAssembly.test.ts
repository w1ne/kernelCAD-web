// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The K-Spray façade robot gallery example placed 72 parts by transform with
// no mates. The wheels, outriggers and hinge hardware sat inside the chassis,
// and the mast, carriage, head and arm parts shared volume. evaluate_script
// failed it with 107 mechanism.interpenetration errors. The pose params moved
// parts that no joint carried. The example is now a seated assembly: the mast
// hinge, carriage, outriggers, gun wrist and arm joints are mates on pins,
// pockets and rails, and every other part is fastened at a seat on the face
// it shares with the part that carries it.

import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { connectorsInSolidDiagnostics } from '../../../src/modeling/mates/mechanicalPlausibility';
import { partBackend } from '../../../src/modeling/mates/partBackend';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { pointTriangleDistanceSq } from '../../../src/modeling/runtime/meshDeviation';
import type { RuntimeMesh } from '../../../src/kernel/backends/runtimeMesh';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

const EXAMPLE_PATH = 'examples/gallery/kspray-facade-robot.kcad.ts';
const PART_COUNT = 61;
// The 0.3 mm radial bore clearance of a wheel on its axle plus the
// display-mesh chord error. Every other seat is on a planar face.
const SEAT_ON_SURFACE_TOL_MM = 0.5;

// Limit poses of every joint, and joint combinations the per-joint sweep does
// not reach.
const LIMIT_POSES: Record<string, Record<string, number>> = {
  'folded for transport': { mastFoldAngle: 90, outriggerDeploy: 0, carriageHeight: 0.4 },
  'half folded, carriage low': { mastFoldAngle: 45, carriageHeight: 0.4, wristTiltDeg: -30 },
  'carriage low, nozzle down': { carriageHeight: 0.4, wristTiltDeg: -30, armYawDeg: -10, armPitchDeg: -35 },
  'carriage high, nozzle up': { carriageHeight: 2.7, wristTiltDeg: 30, armYawDeg: -10, armPitchDeg: -35 },
  'long arms out and up': { armReach: 1.15, armYawDeg: 55, armPitchDeg: 20 },
  'long arms in and up': { armReach: 1.15, armYawDeg: -10, armPitchDeg: 20 },
  'long arms in and down, carriage high': { armReach: 1.15, armYawDeg: -10, armPitchDeg: -35, carriageHeight: 2.7, wristTiltDeg: 30 },
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

describe('K-Spray façade robot gallery example', () => {
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

  it('mates every part and seats every fastened mate on the material of both parts', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.evaluation.exitCode).toBe(0);
    const assemblies = [...(result.model?.session.assemblies.values() ?? [])] as Assembly[];
    expect(assemblies.length).toBe(1);
    const robot = assemblies[0];
    expect(robot.__parts().length).toBe(PART_COUNT);
    expect(await connectorsInSolidDiagnostics(robot)).toEqual([]);

    const mates = robot.__mates();
    // A tree: one mate carries each part except the chassis.
    expect(mates.length).toBe(PART_COUNT - 1);
    const count = (type: string) => mates.filter((mate) => mate.type === type).length;
    expect(count('revolute')).toBe(6);    // mast hinge, gun wrist, two joints per arm
    expect(count('prismatic')).toBe(5);   // carriage and four outriggers
    expect(count('fastened')).toBe(PART_COUNT - 1 - 11);

    const partsByName = new Map(robot.__parts().map((part) => [part.name, part]));
    const meshes = new Map<string, RuntimeMesh>();
    const offSeat: string[] = [];
    for (const mate of mates.filter((m) => m.type === 'fastened')) {
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
          mesh = (await partBackend(robot, part.originalShape)).getMesh();
          meshes.set(part.name, mesh);
        }
        const mm = distanceToMeshMm(mesh, connector.origin.value);
        if (mm > SEAT_ON_SURFACE_TOL_MM) offSeat.push(`${ref}: ${mm.toFixed(2)} mm from '${part.name}'`);
      }
    }
    expect(offSeat).toEqual([]);
  }, 300_000);

  it('stays collision-free at the joint limits and their combinations', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.model).toBeDefined();
    for (const [name, pose] of Object.entries(LIMIT_POSES)) {
      const edited = await updateModelParams(
        result.model!,
        Object.entries(pose).map(([param, value]) => ({ name: param, value })),
      );
      const scene = edited.model.rootShape;
      if (scene === undefined || !isSceneBackend(scene)) throw new Error(`${name}: the model root is not a scene`);
      const clash = detectInterferences(scene, 0.01, new Set<string>(), []);
      expect(clash.partCount, name).toBe(PART_COUNT);
      expect(clash.uncheckedPairs, name).toEqual([]);
      expect(clash.pairs.map((pair) => `${pair.a} x ${pair.b}`), name).toEqual([]);
    }
  }, 900_000);
});
