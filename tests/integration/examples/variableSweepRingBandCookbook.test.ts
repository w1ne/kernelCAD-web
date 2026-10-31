// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The variable-sweep-ring-band cookbook snippet is the organic-shape example
// for variableSweep on a CLOSED spine (closed spline3d -> swept tube whose
// section swells from palm to crown -> round bore cut). Prove it builds one
// solid of the stated size, that the bore is a true cylinder, and that a
// "finger ring" cookbook lookup finds it.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runMcpScript } from '../../../src/agent/mcp/runMcpScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { resolveRootId } from '../../../src/composition/buildModel';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';

const ID = 'variable-sweep-ring-band';
const code = readFileSync(`cookbook/snippets/${ID}.md`, 'utf8').split('```typescript')[1].split('```')[0];

async function buildRing(): Promise<{ shape: OcctBackend; errors: string[] }> {
  const script = await runMcpScript({ code });
  if (!script.ok) throw new Error(script.error);
  const { run } = script;
  const result = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(resolveRootId(run.returnValue, run.records.at(-1)?.id)!);
  if (!(shape instanceof OcctBackend)) throw new Error('ring did not lower');
  return { shape, errors: result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message) };
}

describe(`${ID} snippet`, () => {
  let ring: Awaited<ReturnType<typeof buildRing>>;
  beforeAll(async () => {
    await initOcct();
    ring = await buildRing();
  }, 180_000);

  it('builds one solid ring: crown on top, palm below, 17.3 mm finger axis along Y', async () => {
    const { shape, errors } = ring;
    expect(errors).toEqual([]);
    expect(shape.solidComponents()).toHaveLength(1);
    // Exact box: the profiles are true circles, and the quick box pads the
    // rational sweep faces by their control polygon.
    const bb = shape.boundingBox({ exact: true });
    // Crown section r = 2.6 sets the width along the finger axis.
    expect(bb.max[1] - bb.min[1]).toBeCloseTo(5.2, 1);
    // Spine radius 9.49: crown top at 9.49 + 2.6, palm bottom at -(9.49 + 1.4).
    expect(bb.max[2]).toBeCloseTo(12.09, 1);
    expect(bb.min[2]).toBeCloseTo(-10.89, 1);
    // Thicker at the crown than at the palm: the solid is not symmetric in Z.
    expect(bb.max[2] + bb.min[2]).toBeGreaterThan(1);
    // Bounded by the tube volume with the thinnest / thickest section, less the bore.
    const v = shape.volume();
    expect(v).toBeGreaterThan(400);
    expect(v).toBeLessThan(900);
  });

  it('has a true cylindrical bore of the stated diameter on the finger axis', async () => {
    const { shape } = ring;
    const oc = getOC() as any;
    const faces = (shape.getReplicadShape() as unknown as { faces: Array<{ geomType: string; wrapped: unknown }> }).faces;
    const bores = faces
      .filter((f) => f.geomType === 'CYLINDRE')
      .map((f) => {
        const cyl = new oc.BRepAdaptor_Surface_2(f.wrapped, true).Cylinder();
        const dir = cyl.Axis().Direction();
        return { r: cyl.Radius(), axisY: Math.abs(dir.Y()) };
      });
    expect(bores.length).toBeGreaterThanOrEqual(1);
    for (const b of bores) {
      expect(b.r).toBeCloseTo(17.3 / 2, 3);
      expect(b.axisY).toBeCloseTo(1, 6);
    }
  });

  it('is what a "finger ring" cookbook lookup returns first', async () => {
    const r = await lookupCookbookTool({ query: 'finger ring band with a thicker crown', k: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hits[0].id).toBe(ID);
  });
});
