// tests/integration/mcp/diffGeometryFaces.test.ts
//
// MCP `diff_geometry` face-level change lists: which faces were added,
// removed, or modified (moved | resized | reshaped), how they were matched
// (lineage first, then geometry), and the plain-language summary text.

import { describe, it, expect, beforeAll } from 'vitest';
import { diffGeometryTool } from '../../../src/agent/mcp/tools/diffGeometry';
import { describeOffset, FACE_LIST_CAP } from '../../../src/agent/mcp/tools/diffGeometryFaces';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const PLATE = `return box(40, 40, 6);`;
const PLATE_WITH_HOLE = `return box(40, 40, 6).subtract(cylinder(8, 3).translate(20, 20, -1));`;

async function okDiff(baseCode: string, code: string) {
  const r = await diffGeometryTool({ baseCode, code });
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe('diff_geometry face-level changes', () => {
  beforeAll(async () => { await initOcct(); }, 120000);

  it('a drilled hole adds one cylinder face and resizes the top/bottom planes', async () => {
    const r = await okDiff(PLATE, PLATE_WITH_HOLE);
    const { faces } = r.bodies[0];

    expect(faces.added).toHaveLength(1);
    expect(faces.added[0]).toMatchObject({ surfaceType: 'cylinder', radiusMm: 3, center: [20, 20, 3], axis: [0, 0, 1] });
    expect(faces.removed).toEqual([]);

    expect(faces.modified.map((m) => [m.change, m.surfaceType, m.ref])).toEqual([
      ['resized', 'plane', '@kc[boolean_1/face/bottom]'],
      ['resized', 'plane', '@kc[boolean_1/face/top]'],
    ]);
    for (const m of faces.modified) {
      expect(m.matchedBy).toBe('lineage');
      expect(m.before.areaMm2).toBeCloseTo(1600, 3);
      expect(m.after.areaMm2).toBeCloseTo(1600 - Math.PI * 9, 3);
      expect(m.offsetMm).toEqual([0, 0, 0]);
    }
    expect(faces.unchangedCount).toBe(4);
    expect(faces.truncated).toBe(false);

    expect(r.summary.faces).toEqual({ added: 1, removed: 0, modified: 2, unchanged: 4 });
    expect(r.summary.text).toContain("Body '(root)' topology-changed: 1 face added (cylinder r=3 at (20, 20, 3))");
    expect(r.summary.text).toContain("2 faces resized (plane 'bottom' area 1600 -> 1571.73 mm²");
  });

  it('a translated box reports every face moved, matched by lineage, verdict moved', async () => {
    const r = await okDiff(PLATE, `return box(40, 40, 6).translate(0, 0, 3);`);
    const body = r.bodies[0];
    expect(body.verdict).toBe('moved');
    expect(body.faces.added).toEqual([]);
    expect(body.faces.removed).toEqual([]);
    expect(body.faces.unchangedCount).toBe(0);
    expect(body.faces.modified).toHaveLength(6);
    for (const m of body.faces.modified) {
      expect(m.change).toBe('moved');
      expect(m.matchedBy).toBe('lineage');
      expect(m.offsetMm).toEqual([0, 0, 3]);
      expect(m.after.areaMm2).toBeCloseTo(m.before.areaMm2, 6);
      expect(m.ref).toMatch(/^@kc\[box_1\/face\/(top|bottom|left|right|front|back)\]$/);
    }
    expect(r.summary.text).toBe("Body '(root)' moved: 6 faces moved 3 mm in +Z.");
  });

  it('a fillet radius change resizes the blend faces (matched by geometry) and the planes', async () => {
    const r = await okDiff(`return box(40, 40, 6).fillet(2);`, `return box(40, 40, 6).fillet(1);`);
    const { faces } = r.bodies[0];
    expect(faces.added).toEqual([]);
    expect(faces.removed).toEqual([]);
    expect(faces.unchangedCount).toBe(0);

    const blends = faces.modified.filter((m) => m.surfaceType === 'cylinder' || m.surfaceType === 'sphere' || m.surfaceType === 'torus');
    expect(blends.length).toBeGreaterThanOrEqual(12);
    for (const m of blends) {
      expect(m.change).toBe('resized');
      expect(m.matchedBy).toBe('geometry');
      expect(m.before.radiusMm).toBeCloseTo(2, 6);
      expect(m.after.radiusMm).toBeCloseTo(1, 6);
    }
    const planes = faces.modified.filter((m) => m.surfaceType === 'plane');
    expect(planes).toHaveLength(6);
    for (const m of planes) {
      expect(m.change).toBe('resized');
      expect(m.after.areaMm2).toBeGreaterThan(m.before.areaMm2);
    }
    expect(r.summary.text).toContain('cylinder r=2 -> 1');
  });

  it('identical scripts report no face changes', async () => {
    const r = await okDiff(PLATE_WITH_HOLE, PLATE_WITH_HOLE);
    const { faces } = r.bodies[0];
    expect(faces).toMatchObject({
      added: [], removed: [], modified: [], unchangedCount: 7,
      addedCount: 0, removedCount: 0, modifiedCount: 0, truncated: false,
    });
    expect(r.summary.faces).toEqual({ added: 0, removed: 0, modified: 0, unchanged: 7 });
    expect(r.summary.text).toBe('1 body identical.');
  });

  it('assembly parts fall back to geometric matching and still report moves', async () => {
    const asm = (x: number) =>
      `const a = assembly('rig'); a.part('lid', box(10, 10, 2).translate(${x}, 0, 0)); return a.model();`;
    const r = await okDiff(asm(0), asm(3));
    const lid = r.bodies[0];
    expect(lid.verdict).toBe('moved');
    expect(lid.faces.modified).toHaveLength(6);
    expect(lid.faces.modified.every((m) => m.change === 'moved')).toBe(true);
    expect(lid.faces.modified.every((m) => m.offsetMm[0] === 3 && m.offsetMm[1] === 0 && m.offsetMm[2] === 0)).toBe(true);
    expect(r.summary.text).toContain("Body 'lid' moved: 6 faces moved 3 mm in +X.");
  });

  it('caps each list at FACE_LIST_CAP with a truncated flag and keeps the true totals', async () => {
    const n = FACE_LIST_CAP + 4;
    const drilled = `
      let s = box(${n * 4}, 10, 4);
      for (let i = 0; i < ${n}; i++) s = s.subtract(cylinder(6, 1).translate(2 + i * 4, 5, -1));
      return s;
    `;
    const r = await okDiff(`return box(${n * 4}, 10, 4);`, drilled);
    const { faces } = r.bodies[0];
    expect(faces.addedCount).toBe(n);
    expect(faces.added).toHaveLength(FACE_LIST_CAP);
    expect(faces.truncated).toBe(true);
    // Deterministic order: by surface type, then centre x.
    const xs = faces.added.map((f) => f.center[0]);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(r.summary.text).toContain(`${n} faces added`);
  }, 120000);
});

describe('describeOffset', () => {
  it('names an axis-aligned offset by axis and sign', () => {
    expect(describeOffset([0, 0, 3])).toBe('3 mm in +Z');
    expect(describeOffset([-2.5, 0, 0])).toBe('2.5 mm in -X');
  });
  it('gives length and vector for an oblique offset', () => {
    expect(describeOffset([3, 4, 0])).toBe('5 mm along (3, 4, 0)');
  });
});
