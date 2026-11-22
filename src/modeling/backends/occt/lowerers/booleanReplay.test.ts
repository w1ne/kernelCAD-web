// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A helper called twice captures two record chains that differ only in ids.
// The second chain's booleans must replay the first chain's results instead
// of running OCCT again (two identical lattice pylons spent half of a
// diorama's 60 s mesh budget), and the replayed shapes must carry their own
// chain's lineage.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { booleanBuildStats } from '../../../../kernel/backends/occt/historyAwareBooleans';
import { buildModel } from '../../../../composition/buildModel';
import type { BuiltModel } from '../../../buildModel';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';

beforeAll(async () => { await initOcct(); }, 60_000);

const frame = `
function frame() {
  let p = box(20, 20, 2);
  for (let i = 0; i < 4; i++) p = p.union(cylinder(24, 1.5).rotate([1, 0, 0], 20 + i * 10).translate(4 + i * 4, 10, 1));
  p = p.subtract(box(3, 3, 10).translate(8, 2, -1));
  return p.color('#333333');
}`;
const script = (parts: number) => `${frame}
let a: any = assembly('frames');
${Array.from({ length: parts }, (_, i) => `a = a.part('frame-${i}', frame().translate(${i * 60}, 0, 0));`).join('\n')}
return a.model();`;

async function build(parts: number): Promise<{ model: BuiltModel; builds: number }> {
  const before = booleanBuildStats.builds;
  const model = await buildModel({ code: script(parts), fileName: 'frames.kcad.ts' });
  return { model, builds: booleanBuildStats.builds - before };
}

function upstreamIds(records: readonly FeatureRecord[], id: string): Set<string> {
  const byId = new Map(records.map((r) => [r.id as string, r]));
  const out = new Set<string>();
  const visit = (rid: string) => {
    if (out.has(rid)) return;
    out.add(rid);
    for (const ref of Object.values(byId.get(rid)?.inputs ?? {})) {
      if (ref.kind === 'feature') visit(ref.id);
    }
  };
  visit(id);
  return out;
}

function partSource(model: BuiltModel, name: string): string {
  const part = model.records.find((r) => r.kind === 'assemblyPart' && (r.metadata as { partName?: string } | undefined)?.partName === name);
  const ref = part?.inputs.shape;
  if (ref?.kind !== 'feature') throw new Error(`no source for ${name}`);
  return ref.id;
}

describe('boolean replay across identical record chains', () => {
  it('builds the booleans of a repeated helper once', async () => {
    const one = await build(1);
    const two = await build(2);
    expect(one.builds).toBeGreaterThan(0);
    expect(two.builds).toBe(one.builds);
  }, 120_000);

  it('gives the copy the same geometry and its own lineage', async () => {
    const { model } = await build(2);
    expect([...model.health.values()].every((h) => h !== 'error')).toBe(true);
    const ids = ['frame-0', 'frame-1'].map((name) => partSource(model, name));
    const [left, right] = ids.map((id) => model.shapes.get(id) as OcctBackend);
    expect(right.volume()).toBeCloseTo(left.volume(), 6);
    const lb = left.boundingBox(), rb = right.boundingBox();
    expect(rb.min[0] - lb.min[0]).toBeCloseTo(60, 6);
    expect(rb.max[2]).toBeCloseTo(lb.max[2], 6);

    const own = upstreamIds(model.records, ids[1]);
    const lineage = [...(right.historyMap?.values() ?? [])];
    expect(lineage.length).toBe(right.faceHashes().length);
    for (const l of lineage) {
      expect(own.has(l.rootFeatureId)).toBe(true);
      if (l.featureId !== undefined) expect(own.has(l.featureId)).toBe(true);
    }
    const origins = [...(right.memberOrigin?.values() ?? [])].flat();
    expect(origins.length).toBeGreaterThan(0);
    for (const id of origins) expect(own.has(id)).toBe(true);
  }, 120_000);
});
