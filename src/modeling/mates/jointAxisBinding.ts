// src/lib/mates/jointAxisBinding.ts
//
// v0.7.4 Gate 2 — joint-axis-to-structure binding.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 2.
// Plan : `2026-05-15-v0.7-kinematic-grounding.md` §Phase 4.
//
// For every mate whose `type ∈ { 'revolute', 'prismatic', 'cylindrical' }`,
// the joint axis (an infinite line through the connector origin in the
// connector axis direction, both resolved to world coordinates) must
// intersect a real face of BOTH bound parts' BREP. If the line floats in
// space relative to either part (the canonical "axis declared in empty
// space" agent error), a `assembly.joint-axis.unbound` diagnostic is
// emitted per failing side.
//
// Dead code in this slice — Phase 6 wires it into
// `validateAssemblyWithMates`. Keeping it import-isolated lets the
// validator stitch all three Gate 1/2/3 modules together once Task 0's
// envelope auto-wiring lands.
//
// ## Precision floor
//
// Per spec's "Gate 2 BREP integration" decision (option 1), this gate uses
// **AABB + per-face plane intersection**, not an exact OCCT
// line-vs-shape primitive. The pipeline is:
//
//   1. Lower the assembly via `RecomputeEngine.run` and apply each part's
//      world transform to a fresh clone of its local-frame OCCT shape
//      (mirrors `detectInterferences` in `script-runtime/checkInterference`).
//   2. Compute the world-space AABB of the part. Reject sides whose joint
//      axis line misses the AABB outright (cheap, broad pre-filter).
//   3. For each face of the part, treat it as a plane through its centroid
//      with its `normalAt(center)`. Intersect the joint line with the plane;
//      reject if the line is plane-parallel within `EPSILON_MM`. Project the
//      intersection point onto the face's world-space AABB padded by
//      `EPSILON_MM`. If the point lies inside, the axis is bound on this
//      side — accept and stop iterating.
//   4. If the line misses the part AABB or every face's planar bound, emit
//      one diagnostic naming this side; otherwise this side is bound.
//
// **Known false-negative tolerance.** For planar faces (boxes, plates, the
// dominant fixture class) the face's world AABB is a tight envelope, so the
// gate is essentially exact within `EPSILON_MM`. For non-planar faces
// (cylindrical / spherical / NURBS surfaces) the face AABB is the full
// extent of the curved surface; the gate accepts any line that crosses the
// patch's bounding rectangle, which is more permissive than a true
// surface-vs-line check. The audit's "false-negative tolerance" decision
// accepts this; OCCT-exact line-vs-shape lands in v0.7.x if the corpus
// surfaces gaps.
//
// **Performance note.** A 13-part hero assembly lowers in ~1-2 s per gate
// run. The recompute is cached at `validateAssemblyWithMates` time when
// Phase 6 wires this in — the dead-code module re-lowers on each call.

import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { RecomputeEngine } from '../compute/recomputeEngine';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import type { Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import { resolveConnectorOrigin, type Connector } from './connector';
import { parseConnectorRef, type MateRecord } from './mate';
import type { MateType } from './mateTypes';
import type { ValidatorDiagnostic } from './validator';

/**
 * Tolerance (mm) for "intersection point lies inside face bounds" and for
 * "line is parallel to face plane." Matches spec §Gate 2's documented
 * ε=0.1 mm precision floor. Picked deliberately to be looser than OCCT's
 * default modeling tolerance (1e-7 mm) so that float-arithmetic noise on
 * `worldTransform`-decomposed face centroids does not register as
 * false-positive misses.
 */
const EPSILON_MM = 0.1;

/**
 * Direction-vector parallelism threshold for line-plane intersection
 * denominators (and the equivalent ray-AABB slab degenerate case). 1e-4 is
 * well below any geometrically meaningful angular sensitivity for
 * kernelCAD's mm-scale parts — the smallest direction component a healthy
 * mate axis carries after FK is O(1), so 1e-4 only catches genuinely
 * axis-aligned-to-plane degeneracies, not numerical noise on real axes.
 *
 * Not a derived value of `EPSILON_MM`: positional ε and angular/denominator
 * ε are independent floors. Spec §Gate 2 calls these out separately.
 */
const PARALLEL_DIRECTION_EPSILON = 1e-4;

/** Gated mate types per spec §Gate 2. */
const GATED_MATE_TYPES: ReadonlySet<MateType> = new Set<MateType>([
  'revolute',
  'prismatic',
  'cylindrical',
]);

/**
 * v0.7.4 Gate 2 entry point. Async — lowers the assembly via the same
 * recompute path used by `Assembly.computeInterferencesForGate` /
 * `detectInterferencesForPoses`.
 *
 * Returns the list of diagnostics — possibly empty. For each gated mate,
 * emits up to two `assembly.joint-axis.unbound` diagnostics (severity
 * `error`), one per side whose body the joint line does not intersect.
 *
 * Dead code in this slice — Phase 6 of the v0.7.4 plan wires it into
 * `validateAssemblyWithMates`.
 */
export async function validateJointAxisBinding(arm: Assembly): Promise<ValidatorDiagnostic[]> {
  const gatedMates = arm.__mates().filter((m) => GATED_MATE_TYPES.has(m.type));
  if (gatedMates.length === 0) return [];

  // Lower the assembly via a single `RecomputeEngine.run` — mirrors the
  // pattern in `Assembly.computeInterferencesForGate` (assembly.ts:1273-1300),
  // not `detectInterferencesForPoses`'s legacy `solvedModel + run` double-pass.
  //
  // Reuse the most recently-recorded `solvedAssembly` FeatureRecord on the
  // session whose metadata.assemblyName matches this arm. This validator is
  // called from `Assembly.solvedModel(...)` AFTER the assembly's own
  // `session.solvedAssembly(...)` recorded its FeatureRecord, so the lookup
  // hits in the common path. Reusing the existing record (instead of
  // recording a brand-new one with empty poses) keeps the user-supplied
  // poses honored by `mateFk` AND avoids polluting the session's record
  // stream with a phantom `solvedAssembly` that downstream consumers
  // (meshing's SceneBackend fan-out, `records[records.length-1]`-style
  // last-record lookups, the construction-input closure filter) would
  // process as a real assembly entry.
  //
  // Fallback path: if no matching record is on the session yet (standalone
  // Gate 2 invocation outside `solvedModel`), record a fresh one. The
  // standalone call still pollutes the session — same as before this fix —
  // but the in-`solvedModel` path (which is the dominant one) stays clean.
  await initOcct();
  const session = arm.__session();
  let sceneFeatureId: FeatureId | undefined;
  const records = session.getRecords();
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.kind !== 'solvedAssembly') continue;
    const meta = r.metadata as { assemblyName?: string } | undefined;
    if (meta?.assemblyName === arm.name) {
      sceneFeatureId = r.id;
      break;
    }
  }
  if (sceneFeatureId === undefined) {
    const mateMetadata = arm.__buildMateMetadata();
    const joints = arm.__joints().map((j) => ({ id: j.id, name: j.name }));
    const sceneShape = session.solvedAssembly(arm.name, arm.__parts(), joints, {}, mateMetadata);
    sceneFeatureId = sceneShape.id;
  }
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const recompute = await engine.run(session.getRecords(), {
    paramTable: session.paramTable,
    gatedFeatureNames: session.gatedFeatureNames,
  });
  const lowered = recompute.shapes.get(sceneFeatureId);
  if (!lowered || !isSceneBackend(lowered)) return [];

  // Apply each part's world transform once up-front (clone first — replicad
  // translate/rotate mutate-and-destroy the source OCCT handle, same lifecycle
  // hazard documented in `detectInterferences`).
  const worldShapes = new Map<string, OcctBackend>();
  for (const p of lowered.parts) {
    worldShapes.set(p.name, (p.shape as OcctBackend).clone().applyTransform(p.worldTransform));
  }

  // Index parts and per-part world transforms for the connector-resolution
  // step (origin/axis live in the part's LOCAL frame; the world transform
  // lifts both to world coordinates).
  const partsByName = new Map<string, AssemblyPartStored>();
  for (const p of arm.__parts()) partsByName.set(p.name, p);
  const worldTransforms = new Map<string, Transform>();
  for (const p of lowered.parts) worldTransforms.set(p.name, p.worldTransform);

  const out: ValidatorDiagnostic[] = [];
  for (const mate of gatedMates) {
    const sideA = await resolveSide(mate.a, partsByName, worldTransforms);
    const sideB = await resolveSide(mate.b, partsByName, worldTransforms);
    for (const side of [sideA, sideB]) {
      if (side === undefined) continue;
      const shape = worldShapes.get(side.partName);
      if (!shape) continue;
      if (!axisIntersectsShape(side.origin, side.direction, shape)) {
        out.push(makeUnboundDiagnostic(mate, side));
      }
    }
  }
  return out;
}

interface ResolvedSide {
  readonly partName: string;
  /** World-space origin point of the joint line. */
  readonly origin: Vec3;
  /** World-space direction of the joint line (NOT normalized — the AABB +
   *  plane math is direction-magnitude-independent, and forcing a unit
   *  vector would mask author-supplied near-zero axes; those would be
   *  caught upstream by mate-graph validation). */
  readonly direction: Vec3;
}

/**
 * Resolve one side of a mate ('<partName>.<connectorName>') to its world-
 * space joint-axis line. Returns `undefined` only on a defensive miss
 * (part / connector not found, or non-axis connector type — gated mate
 * types only accept `axis ↔ axis` per `mateTypes.ts`'s PAIR_TABLE, so this
 * branch is unreachable in well-formed input).
 */
async function resolveSide(
  ref: string,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  worldTransforms: ReadonlyMap<string, Transform>,
): Promise<ResolvedSide | undefined> {
  const { partName, connectorName } = parseConnectorRef(ref);
  const part = partsByName.get(partName);
  if (!part) return undefined;
  const connector = part.mateConnectors.find((c) => c.name === connectorName);
  if (!connector) return undefined;
  const localOrigin = await resolveLocalOrigin(part, connector);
  const localAxis = (connector.axis ?? [0, 0, 1]) as Vec3;
  const worldT = worldTransforms.get(partName) ?? Transform.identity();
  // Connector origin is in part-local coords → lift via point transform
  // (includes translation). Axis is a direction → lift via axisDir (rotation
  // only, no translation). This mirrors the SE(3) decomposition the FK
  // applies in `solver.ts:jointTransformForMate`.
  const origin = worldT.point(localOrigin as Se3Vec3) as Vec3;
  const direction = worldT.axisDir(localAxis as Se3Vec3) as Vec3;
  return { partName, origin, direction };
}

/**
 * Lower a connector origin to its part-local numeric Vec3. For `vec3`
 * origins this is a no-op; for topology origins it lowers the part shape
 * once (cheap on the second mate that re-references the same connector
 * because the lowerer caches by feature id).
 */
async function resolveLocalOrigin(part: AssemblyPartStored, connector: Connector): Promise<Vec3> {
  const resolved = await resolveConnectorOrigin(part.originalShape, connector.origin);
  return resolved.value;
}

/**
 * Apply the AABB pre-filter + per-face plane intersection test (spec
 * §Gate 2 option 1). Returns `true` iff some face of `shape` admits the
 * line within `EPSILON_MM`.
 */
// TODO(v0.7.x): replace AABB+plane with OCCT line-vs-shape primitive for curved-surface exactness.
function axisIntersectsShape(origin: Vec3, direction: Vec3, shape: OcctBackend): boolean {
  // AABB pre-filter — slab algorithm in mm space. Pad by EPSILON_MM so that
  // a line that just kisses the body's bounding plane is admitted.
  const bb = shape.boundingBox();
  if (!lineIntersectsAabb(origin, direction, bb.min, bb.max, EPSILON_MM)) {
    return false;
  }
  // Per-face plane-intersection test. Replicad's `Face[]` accessor yields
  // the faces of the WORLD-transformed shape directly (applyTransform was
  // already applied by the caller). For each face we treat it as a plane
  // through its centroid (with the centroid's normal), find the line-plane
  // intersection parameter t, then test that the intersection point lies
  // within the face's world-space AABB padded by EPSILON_MM.
  const replicadShape = shape.getReplicadShape();
  let allFacesSkippedAsParallel = true;
  for (const face of replicadShape.faces) {
    const centerV = face.center;
    const center: Vec3 = [centerV.x, centerV.y, centerV.z];
    let normal: Vec3;
    try {
      const n = face.normalAt(centerV);
      normal = [n.x, n.y, n.z];
    } catch {
      // Some non-planar face parameterizations can fail to evaluate a
      // normal at the centroid. Defer to the next face — the AABB
      // pre-filter already ruled out fully-disjoint lines.
      continue;
    }
    const hit = intersectLineWithPlane(origin, direction, center, normal);
    if (hit === undefined) {
      // Line parallel to this face's centroid plane — keep iterating; if
      // EVERY face is parallel-and-skipped, fall through to the cylindrical
      // permissive branch below.
      continue;
    }
    allFacesSkippedAsParallel = false;
    const faceBb = face.boundingBox.bounds;
    if (pointInAabb(hit, faceBb[0] as Vec3, faceBb[1] as Vec3, EPSILON_MM)) {
      return true;
    }
  }
  // Permissive cylindrical / spherical fallback. When the AABB pre-filter
  // accepted the line AND every face's centroid plane was parallel to the
  // line direction (so every face's plane test was skipped), the shape is
  // almost certainly a body of revolution whose axis is perpendicular to
  // the joint line — e.g., a cylinder along X with a Z joint axis through
  // its midpoint. Plane-vs-line cannot prove intersection in that
  // configuration, but the AABB-pass tells us the line passes through the
  // part's swept volume. Accept rather than emit a false negative; matches
  // the spec's "false-positive tolerance on non-planar faces" decision.
  if (allFacesSkippedAsParallel && replicadShape.faces.length > 0) {
    return true;
  }
  return false;
}

/**
 * Slab-algorithm ray-AABB test for an infinite line (both `t` directions).
 * Pads the box by `epsilon` so near-grazing lines are admitted. Handles
 * direction components equal to zero (line parallel to a slab) by checking
 * the origin lies between the slab's faces.
 */
function lineIntersectsAabb(
  origin: Vec3,
  direction: Vec3,
  min: Vec3,
  max: Vec3,
  epsilon: number,
): boolean {
  let tMin = -Infinity;
  let tMax = Infinity;
  for (let i = 0; i < 3; i++) {
    const d = direction[i];
    const lo = min[i] - epsilon;
    const hi = max[i] + epsilon;
    if (Math.abs(d) < PARALLEL_DIRECTION_EPSILON) {
      // Direction parallel to this slab: line misses unless origin is
      // already inside the slab.
      if (origin[i] < lo || origin[i] > hi) return false;
      continue;
    }
    const inv = 1 / d;
    let t1 = (lo - origin[i]) * inv;
    let t2 = (hi - origin[i]) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return false;
  }
  return true;
}

/**
 * Line-plane intersection. Returns the world-space hit point, or
 * `undefined` if the line is parallel to the plane within `EPSILON_MM`.
 */
function intersectLineWithPlane(
  lineOrigin: Vec3,
  lineDir: Vec3,
  planeOrigin: Vec3,
  planeNormal: Vec3,
): Vec3 | undefined {
  const denom =
    lineDir[0] * planeNormal[0]
    + lineDir[1] * planeNormal[1]
    + lineDir[2] * planeNormal[2];
  if (Math.abs(denom) < PARALLEL_DIRECTION_EPSILON) return undefined;
  const dx = planeOrigin[0] - lineOrigin[0];
  const dy = planeOrigin[1] - lineOrigin[1];
  const dz = planeOrigin[2] - lineOrigin[2];
  const t = (dx * planeNormal[0] + dy * planeNormal[1] + dz * planeNormal[2]) / denom;
  return [
    lineOrigin[0] + t * lineDir[0],
    lineOrigin[1] + t * lineDir[1],
    lineOrigin[2] + t * lineDir[2],
  ];
}

function pointInAabb(p: Vec3, min: Vec3, max: Vec3, epsilon: number): boolean {
  return (
    p[0] >= min[0] - epsilon && p[0] <= max[0] + epsilon
    && p[1] >= min[1] - epsilon && p[1] <= max[1] + epsilon
    && p[2] >= min[2] - epsilon && p[2] <= max[2] + epsilon
  );
}

function makeUnboundDiagnostic(mate: MateRecord, side: ResolvedSide): ValidatorDiagnostic {
  // Coords formatted to 3 decimal places — enough precision for an agent
  // to spot a "you said [50, 0, 0] but the body is at [-5..5]" mistake
  // without flooding the diagnostic stream with float noise.
  const fmt = (v: Vec3) => `[${v[0].toFixed(3)}, ${v[1].toFixed(3)}, ${v[2].toFixed(3)}]`;
  return {
    code: 'assembly.joint-axis.unbound',
    severity: 'error',
    mateName: mate.name,
    partName: side.partName,
    message:
      `Joint axis of mate '${mate.name}' (${mate.type}) does not intersect part '${side.partName}'s BREP.`,
    hint:
      `invalid-args.assembly.joint-axis-unbound — mate '${mate.name}' (${mate.type}) ` +
      `axis (origin ${fmt(side.origin)}, direction ${fmt(side.direction)}) does not ` +
      `intersect part '${side.partName}'s BREP. Move the connector origin onto a ` +
      `face/edge of '${side.partName}', or change the connector axis so the line ` +
      `passes through the part's body.`,
  };
}

