// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The scissor-lift gallery hero fastened every part to the base frame through
// connectors up to 217 mm from the base, with crossed arms in one plane and
// pins through solid arms, rollers and rails. evaluate_script failed it with
// 201 errors (connector-not-in-solid, mate-gap, joint-mesh-gap and
// interpenetration). The arms now run in two planes on pins in clearance
// bores, and each mate seat is a point on the pin inside the bore it carries.

import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { connectorsInSolidDiagnostics } from '../../../src/modeling/mates/mechanicalPlausibility';
import { partBackend } from '../../../src/modeling/mates/partBackend';
import { pointTriangleDistanceSq } from '../../../src/modeling/runtime/meshDeviation';
import type { RuntimeMesh } from '../../../src/kernel/backends/runtimeMesh';

const EXAMPLE_PATH = 'examples/gallery/scissor-lift.kcad.ts';
// The 0.3 mm radial bore clearance plus the display-mesh chord error.
const SEAT_ON_SURFACE_TOL_MM = 0.5;

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

describe('scissor-lift gallery example', () => {
  it('passes evaluate_script with no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE_PATH, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);

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
  }, 300_000);

  it('seats every mate on the material of both mated parts', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(result.evaluation.exitCode).toBe(0);
    const assemblies = [...(result.model?.session.assemblies.values() ?? [])] as Assembly[];
    expect(assemblies.length).toBe(1);
    const lift = assemblies[0];
    expect(lift.__parts().length).toBe(24);
    expect(await connectorsInSolidDiagnostics(lift)).toEqual([]);

    const partsByName = new Map(lift.__parts().map((part) => [part.name, part]));
    const meshes = new Map<string, RuntimeMesh>();
    const mates = lift.__mates();
    expect(mates.length).toBe(23);
    expect(mates.every((mate) => mate.type === 'fastened')).toBe(true);
    const offSeat: string[] = [];
    for (const mate of mates) {
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
          mesh = (await partBackend(lift, part.originalShape)).getMesh();
          meshes.set(part.name, mesh);
        }
        origins.push(connector.origin.value.join(','));
        const mm = distanceToMeshMm(mesh, connector.origin.value);
        if (mm > SEAT_ON_SURFACE_TOL_MM) offSeat.push(`${ref}: ${mm.toFixed(2)} mm from '${part.name}'`);
      }
      if (origins[0] !== origins[1]) offSeat.push(`${mate.name}: connectors differ (${origins.join(' vs ')})`);
    }
    expect(offSeat).toEqual([]);
  }, 300_000);
});
