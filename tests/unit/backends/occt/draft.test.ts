// tests/unit/backends/occt/draft.test.ts
// NURBS Slice E Task 7 — BRepOffsetAPI_DraftAngle lowering (face taper).
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { draftWithHistory } from '../../../../src/kernel/backends/occt/draftWithHistory';
import { getOC } from 'replicad';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const deg = (n: number): Param => ({ expression: String(n), unit: 'deg', evaluated: n });
const deg2rad = (d: number) => (d * Math.PI) / 180;

/**
 * Enumerate the faces of a raw TopoDS_Shape and return [{ area, center }] using
 * OCCT BRepGProp directly (this replicad build has no Face.area getter).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function faceAreas(rawShape: any): { area: number; cx: number; cy: number; cz: number }[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const out: { area: number; cx: number; cy: number; cz: number }[] = [];
  const exp = new oc.TopExp_Explorer_2(
    rawShape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (exp.More()) {
      const face = oc.TopoDS.Face_1(exp.Current());
      const props = new oc.GProp_GProps_1();
      oc.BRepGProp.SurfaceProperties_1(face, props, false, false);
      const com = props.CentreOfMass();
      out.push({ area: props.Mass(), cx: com.X(), cy: com.Y(), cz: com.Z() });
      props.delete();
      com.delete();
      exp.Next();
    }
  } finally {
    exp.delete();
  }
  return out;
}

describe('draftWithHistory (direct OCCT)', () => {
  beforeAll(async () => { await initOcct(); });

  it('tapers a box side face by the given angle (area changes)', async () => {
    // Default box spans [0,10]×[0,10]×[0,10]; front face (y=0) has area 100.
    const box = OcctBackend.box(10, 10, 10);
    const frontHash = box.findCanonicalFaceHash('front');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseRaw = (box.getReplicadShape() as any).wrapped;
    const baseFront = faceAreas(baseRaw).find(f => f.cy < 0.5);
    expect(baseFront?.area).toBeCloseTo(100, 1);

    // Draft the front face about the bottom (neutral plane z=0) pulling +Z →
    // the face tilts, its area changes from the flat 100.
    const res = draftWithHistory(
      box,
      [{ hash: frontHash }],
      deg2rad(10),
      [0, 0, 1],
      { point: [0, 0, 0], normal: [0, 0, 1] }, // neutral plane at the box bottom
    );
    expect(res.shape).toBeDefined();

    // The descendant of the front face is now tapered. With Add(flag=true) the
    // angle is measured FROM the pull direction (additive taper): drafting the
    // front face about the bottom plane while pulling +Z leans the face OUTWARD
    // as it rises, so its area GROWS past the flat 100. Lock that sign so a
    // flipped-angle regression is caught, not just any deviation from 100.
    const drafted = faceAreas(res.shape).filter(f => f.cy < 4);
    const tilted = drafted.find(f => Math.abs(f.area - 100) > 1e-2);
    expect(tilted).toBeDefined();
    expect(tilted!.area).toBeGreaterThan(100 + 1e-2); // additive taper → drafted face area > original 100
  });

  it('lowers a draft feature through OcctLowerer and changes geometry', async () => {
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'draft_1', kind: 'draft',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'front' } },
      },
      params: { angle: deg(8) },
      transforms: [], suppressed: false,
      metadata: { neutralPlane: '' }, // empty-string contract: derive plane from face geometry
    };
    const beforeVol = base.volume();
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    // Drafting tilts a face → the solid volume changes.
    expect(Math.abs(result.shape.volume() - beforeVol)).toBeGreaterThan(1e-2);
  });

  it('warns feature.draft.neutral-plane-derived when a named neutralPlane differs from the drafted face', async () => {
    // draft(angle, { face: 'front', neutralPlane: 'bottom' }) — a genuine override
    // to a DIFFERENT parting plane. Full named-neutral-plane support is deferred,
    // so the lowerer derives the plane from face geometry and must SIGNAL that.
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'draft_3', kind: 'draft',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'front' } },
      },
      params: { angle: deg(8) },
      transforms: [], suppressed: false,
      metadata: { neutralPlane: 'bottom' }, // override: parting plane ≠ drafted face
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.diagnostics.some(d => d.code === 'feature.draft.neutral-plane-derived')).toBe(true);
    // Geometry still changes — the derived plane is used, the override is only signalled.
    expect(Math.abs(result.shape.volume() - base.volume())).toBeGreaterThan(1e-2);
  });

  it('does NOT warn neutral-plane-derived for the default case (neutralPlane == drafted face)', async () => {
    // draft(angle, { face: 'front' }) — capture defaults neutralPlane to 'front'
    // (the drafted face). That is the default, not an override → no warning spam.
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'draft_4', kind: 'draft',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'front' } },
      },
      params: { angle: deg(8) },
      transforms: [], suppressed: false,
      metadata: { neutralPlane: 'front' }, // default: equals the drafted face selector
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.some(d => d.code === 'feature.draft.neutral-plane-derived')).toBe(false);
  });

  it('emits feature.draft.failed for an unresolvable / impossible draft (no throw)', async () => {
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'draft_2', kind: 'draft',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'front' } },
      },
      params: { angle: deg(90) }, // 90° draft is geometrically degenerate
      transforms: [], suppressed: false,
      metadata: { neutralPlane: '' },
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs.some(e => e.code === 'feature.draft.failed')).toBe(true);
    // Base shape returned unchanged (same volume, no throw).
    expect(result.shape.volume()).toBeCloseTo(base.volume(), 3);
  });
});
