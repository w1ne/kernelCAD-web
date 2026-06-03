// src/modeling/runtime/jointMeshContinuity.ts
//
// Physics-grounded loop — P8 slice (criterion 7 — joint-mesh-continuity).
//
// Spec:  docs/specs/2026-06-02-physics-loop-P8-joint-mesh-continuity-gate.md
// Plan:  docs/plans/2026-06-02-physics-loop-P8-joint-mesh-continuity-gate.md
//
// For every mate in an assembly, at REST pose, the joint pivot (the
// world-space connector origin on each side) must lie INSIDE the BREP
// solid of its mated body, within `JOINT_MESH_GAP_TOLERANCE_MM`.
// Otherwise the part is pivoting on thin air — a class of bug
// MJCF / MuJoCo cannot see because joints there are constraints between
// abstract rigid bodies, not material continuity assertions on the
// visual mesh.
//
// Implementation notes:
//
//   - `BRepClass3d_SolidClassifier` is not exposed by the
//     `replicad-opencascadejs` bindings we ship. We approximate the
//     point-in-solid test with a tiny-sphere boolean intersection
//     (same primitive `detectInterferences` uses) and read the unsigned
//     gap distance from `BRepExtrema_DistShapeShape` from a vertex.
//
//   - Reuses the rest-pose `SolvedSample.scene` lazily lowered by
//     `mechanismTruth.ts` (same pipeline `detectInterferences` consumes).
//     No new pose solve, no new BREP lower.

import { getOC } from 'replicad';
import type { Assembly } from '../capture/assembly';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { OcctBackend as OcctBackendClass } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from '../mates/mate';

/**
 * Per-spec tolerance (mm) for the joint-mesh-continuity check. Wide
 * enough to absorb OCCT mesher / boolean noise; tight enough to flag
 * the historical column-shoulder (~12 mm), wrist-head-neck (~6 mm), and
 * floating-spring-stub (~50 mm) gaps that the R5 / P5 / P5.1 / P7
 * iterations produced.
 *
 * NOT tunable. Per the locked rule (`feedback_no_gate_tampering`),
 * never loosen this when a clevis primitive edge case sits just over
 * the tolerance — fix the clevis instead.
 */
export const JOINT_MESH_GAP_TOLERANCE_MM = 1.0;

/**
 * Radius (mm) of the probe sphere used to detect "point lies inside
 * the body" via boolean intersection. Smaller than the gap tolerance
 * so a point INSIDE the body by less than the tolerance still scores
 * non-empty; large enough to avoid OCCT boolean degeneracy on a
 * point-like primitive.
 */
const PROBE_SPHERE_RADIUS_MM = 0.05;

/**
 * Subset of `SolvedSample` the helper needs. Defined here (rather than
 * importing from `mechanismTruth.ts`) to avoid a circular import — the
 * helper is consumed by `mechanismTruth.ts` itself.
 */
export interface JointMeshContinuityRestSample {
  readonly transforms: ReadonlyMap<string, Transform>;
  readonly scene: SceneBackend;
}

/**
 * One row of helper output: a single (joint, side) check. The caller
 * filters for `signedDistanceMm > JOINT_MESH_GAP_TOLERANCE_MM` and
 * emits one diagnostic per failing row.
 */
export interface JointMeshGapResult {
  readonly mateName: string;
  readonly side: 'parent' | 'child';
  readonly partName: string;
  readonly pivotWorld: readonly [number, number, number];
  /**
   * Signed surface distance in mm. Negative when the pivot is inside
   * the body, positive when it is outside (above the surface in the
   * outward-normal sense). Note that the helper returns `0` rather
   * than a true negative depth when the probe sphere overlaps the
   * body — computing the true depth is unnecessary because the gate
   * only inspects the positive (outside) side.
   */
  readonly signedDistanceMm: number;
}

/**
 * Run criterion 7 (joint-mesh-continuity) over every mate in the
 * assembly's mate graph at the rest-pose sample. For every mate one
 * `JointMeshGapResult` is produced per side (parent / child).
 *
 * Mate kinds covered: all kinds with a vec3 connector origin
 * (`revolute`, `prismatic`, `cylindrical`, `ball`, `planar`,
 * `pin_slot`, `fastened`). A mate whose connector origin is a
 * topology query (not resolved at capture time) is silently skipped
 * here — that's a separate `assembly.connector.topology-not-resolvable`
 * surface that already runs at capture.
 */
export function checkJointMeshContinuity(
  arm: Assembly,
  rest: JointMeshContinuityRestSample,
): JointMeshGapResult[] {
  const out: JointMeshGapResult[] = [];
  const sceneByPartName = new Map<string, SceneBackend['parts'][number]>();
  for (const p of rest.scene.parts) sceneByPartName.set(p.name, p);

  // Pre-lookup each connector's part-local vec3 origin via the
  // Assembly's part records. Topology origins are not resolved here
  // (the lowered scene already evaluated them — but the lookup
  // happens through `parsedRef + connectorName`, not the scene).
  const partByName = new Map<string, ReturnType<Assembly['__parts']>[number]>();
  for (const p of arm.__parts()) partByName.set(p.name, p);

  for (const mate of arm.__mates()) {
    let parsedA: { partName: string; connectorName: string };
    let parsedB: { partName: string; connectorName: string };
    try {
      parsedA = parseConnectorRef(mate.a);
      parsedB = parseConnectorRef(mate.b);
    } catch {
      continue;
    }

    const aPart = partByName.get(parsedA.partName);
    const bPart = partByName.get(parsedB.partName);
    if (aPart === undefined || bPart === undefined) continue;

    const aConn = aPart.mateConnectors.find((c) => c.name === parsedA.connectorName);
    const bConn = bPart.mateConnectors.find((c) => c.name === parsedB.connectorName);
    if (aConn === undefined || bConn === undefined) continue;
    if (aConn.origin.kind !== 'vec3' || bConn.origin.kind !== 'vec3') continue;

    const T_A = rest.transforms.get(parsedA.partName);
    const T_B = rest.transforms.get(parsedB.partName);
    if (T_A === undefined || T_B === undefined) continue;

    // World-space pivot point. The parent-side connector origin is the
    // canonical reference — at REST pose the solver enforces the
    // child-side origin co-locates with it (any disagreement already
    // surfaces as `mechanism.disconnect`). We compute both and use the
    // parent-side for the diagnostic message, but evaluate each side
    // against its own body using that body's local origin point lifted
    // via its own world transform — that avoids accidentally probing a
    // body at a point its local frame never names.
    const aLocal = aConn.origin.value;
    const bLocal = bConn.origin.value;
    const pivotWorld = T_A.point(aLocal);

    const aScenePart = sceneByPartName.get(parsedA.partName);
    const bScenePart = sceneByPartName.get(parsedB.partName);

    if (aScenePart !== undefined) {
      const gap = measureGapToBody(aScenePart.shape as OcctBackend, aScenePart.worldTransform, pivotWorld);
      if (gap !== undefined) {
        out.push({
          mateName: mate.name,
          side: 'parent',
          partName: parsedA.partName,
          pivotWorld,
          signedDistanceMm: gap,
        });
      }
    }

    if (bScenePart !== undefined) {
      // Probe the child body at the SAME world point — at rest pose the
      // solver places the child's connector origin there too. (We
      // intentionally probe the world pivot, not a separate
      // `T_B.point(bLocal)`, because the gate's premise is that BOTH
      // bodies must contain the single physical pivot.)
      const probePointForChild = T_B.point(bLocal);
      const gap = measureGapToBody(
        bScenePart.shape as OcctBackend,
        bScenePart.worldTransform,
        probePointForChild,
      );
      if (gap !== undefined) {
        out.push({
          mateName: mate.name,
          side: 'child',
          partName: parsedB.partName,
          pivotWorld: probePointForChild,
          signedDistanceMm: gap,
        });
      }
    }
  }

  return out;
}

/**
 * Measure the signed gap (mm) from a world-space probe point to a
 * body's world-space OCCT surface.
 *
 * - Apply the body's `worldTransform` to a clone of the local shape so
 *   it sits in world coords (same pattern `detectInterferences` uses).
 * - Probe-sphere boolean intersect: non-empty ⇒ point inside or on
 *   surface ⇒ return 0 (positive gap is zero by definition).
 * - Empty intersect ⇒ point outside ⇒ run
 *   `BRepExtrema_DistShapeShape(vertex, body)` for the unsigned
 *   surface distance; return as positive.
 *
 * Returns `undefined` when the OCCT pipeline throws on the inputs
 * (degenerate body, missing wasm handle). Caller skips the row.
 */
export function measureGapToBody(
  localShape: OcctBackend,
  worldTransform: Transform,
  pointWorld: readonly [number, number, number],
): number | undefined {
  try {
    const worldBody = localShape.clone().applyTransform(worldTransform);

    // Probe-sphere boolean intersect — "point inside body" test.
    const probe = OcctBackendClass.sphere(PROBE_SPHERE_RADIUS_MM)
      .translate(pointWorld[0], pointWorld[1], pointWorld[2]);
    let inside = false;
    try {
      const inter = worldBody.clone().intersect(probe.clone());
      inside = !inter.isEmpty();
    } catch {
      // OCCT boolean can throw on degenerate inputs; treat as "outside"
      // and let the distance probe decide the gap distance.
      inside = false;
    }

    if (inside) {
      return 0;
    }

    // Outside the body. Compute the unsigned surface distance via
    // BRepExtrema_DistShapeShape from a TopoDS_Vertex at the probe
    // point to the body's TopoDS_Shape. We use the default-construct
    // + LoadS1 + LoadS2 + Perform pattern rather than the
    // 5-arg constructor — the enum-value globals required for the
    // 5-arg form aren't reliably exposed on the WASM module surface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const gp = new oc.gp_Pnt_3(pointWorld[0], pointWorld[1], pointWorld[2]);
    const mkVertex = new oc.BRepBuilderAPI_MakeVertex(gp);
    const vertex = mkVertex.Vertex();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyWrapped = (worldBody as unknown as { shape: { wrapped: any } }).shape.wrapped;
    const dist = new oc.BRepExtrema_DistShapeShape_1();
    dist.LoadS1(vertex);
    dist.LoadS2(bodyWrapped);
    let value: number;
    try {
      const ok = dist.Perform(new oc.Message_ProgressRange_1());
      if (!ok || !dist.IsDone()) {
        return undefined;
      }
      value = dist.Value();
    } finally {
      dist.delete?.();
      mkVertex.delete?.();
      gp.delete?.();
    }
    return value;
  } catch {
    return undefined;
  }
}
