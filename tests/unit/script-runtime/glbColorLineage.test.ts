// tests/unit/script-runtime/glbColorLineage.test.ts
//
// Behaviour gate for single-shape GLB colour attribution. `.color()` mutates
// the metadata of the record that is current when it is called, so any
// subsequent modelling op (fillet, boolean, hole, …) leaves the export target
// pointing at a record with no colour of its own. The exporter therefore walks
// the target's lineage for the nearest attribution.
//
// These tests assert on the *decoded GLB* (`baseColorFactor`), never on source
// code — the whole class of bug this pins is "the code looks right but the
// bytes are grey".
//
// baseColorFactor is linear-light; sRGB #ff0000 -> [1,0,0,1] and the writer's
// no-colour default #cccccc -> 0.60382…

import { describe, it, expect, beforeAll } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

/** sRGB->linear value the writer emits for its uncoloured #cccccc default. */
const DEFAULT_GREY = 0.6038273388475408;
/** ROLE_PALETTE.plate (#a89a7c) in linear light. */
const PLATE_LINEAR = [0.3915724777393922, 0.3231432091022285, 0.20155625378383743];

async function baseColorFactor(code: string): Promise<number[]> {
  const r = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'glb' });
  expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  const doc = await new NodeIO().readBinary(r.bytes);
  const mat = doc.getRoot().listMaterials()[0];
  expect(mat, 'GLB carried no material').toBeDefined();
  return Array.from(mat.getBaseColorFactor() as number[]);
}

function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6));
}

describe('single-shape GLB colour lineage', () => {
  beforeAll(async () => { await initOcct(); });

  it('uses the writer default when no colour is authored', async () => {
    expectClose(
      await baseColorFactor('return box(10,10,10);'),
      [DEFAULT_GREY, DEFAULT_GREY, DEFAULT_GREY, 1],
    );
  });

  it('honours a colour on the tail record (no regression)', async () => {
    expectClose(
      await baseColorFactor("return box(10,10,10).color('#ff0000');"),
      [1, 0, 0, 1],
    );
  });

  it('inherits a colour through a fillet', async () => {
    // The bug: this exported byte-identical grey to the no-colour baseline.
    expectClose(
      await baseColorFactor("return box(10,10,10).color('#ff0000').fillet(1);"),
      [1, 0, 0, 1],
    );
  });

  it('inherits a colour through a hole', async () => {
    expectClose(
      await baseColorFactor(
        "return box(20,20,20).color('#00ff00')"
          + ".holes('top', { positions: [{ u: 5, v: 5 }], diameter: 3, depth: 'through' });",
      ),
      [0, 1, 0, 1],
    );
  });

  it("inherits a boolean's base colour", async () => {
    expectClose(
      await baseColorFactor(
        "return box(20,20,20).color('#ff0000').subtract(cylinder(30,3));",
      ),
      [1, 0, 0, 1],
    );
  });

  it('does NOT inherit colour from a boolean cutter', async () => {
    // Documented precedence, shared with `lookupSourceColor`: the walk follows
    // only the primary upstream pointer (shape > base > target), so colour
    // identity dies at the cutter branch. An uncoloured base keeps the default.
    expectClose(
      await baseColorFactor(
        "return box(20,20,20).subtract(cylinder(30,3).color('#ff0000'));",
      ),
      [DEFAULT_GREY, DEFAULT_GREY, DEFAULT_GREY, 1],
    );
  });

  it("the tail's own colour wins over an ancestor's", async () => {
    expectClose(
      await baseColorFactor(
        "return box(10,10,10).color('#ff0000').fillet(1).color('#0000ff');",
      ),
      [0, 0, 1, 1],
    );
  });

  it('resolves a role token through the shared ROLE_PALETTE', async () => {
    // Previously handed straight to THREE.Color -> "Unknown color plate" and a
    // white material, which the exporter omits as the glTF default.
    expectClose(await baseColorFactor("return box(10,10,10).color('plate');"), [...PLATE_LINEAR, 1]);
  });

  it('resolves a role token inherited through a fillet', async () => {
    expectClose(
      await baseColorFactor("return box(10,10,10).color('plate').fillet(1);"),
      [...PLATE_LINEAR, 1],
    );
  });

  it('inherits a PBR material through a fillet', async () => {
    expectClose(
      await baseColorFactor(
        "return box(10,10,10).material({ baseColor: '#ff0000', metalness: 1 }).fillet(1);",
      ),
      [1, 0, 0, 1],
    );
  });
});
