// src/lib/mates/mountingHoleConsistency.ts
//
// v0.7.4 Gate 1 — fastened-mate mounting-hole consistency check.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 1.
// Plan : `2026-05-15-v0.7-kinematic-grounding.md` §Phase 3.
//
// For every mate with `type === 'fastened'`, both connector-bound faces
// must expose compatible `kind: 'hole'` / `kind: 'holes'` records:
//   - matching diameter (±0.05 mm), AND
//   - combined depth admits a screw (one side `through`, or
//     A.depth + B.depth ≥ max(A.depth, B.depth) + 1 mm).
//
// On mismatch (or when only one side / neither side has a hole on the
// bound face), emit a single `assembly.mounting-hole.mismatch` diagnostic
// (severity error). Pure, synchronous: walks `arm.__session().getRecords()`
// from each part's `originalShape.id` upstream through `inputs.target`
// chains; no lower / no async.
//
// This module is dead code until Phase 6 wires it into
// `validateAssemblyWithMates`. That's intentional — keep the gate isolated
// behind a separate import so callers (lowerer, MCP) can compose it.
//
// v0.7.4 ships **topology-bound origins only**. Connectors with
// `origin: { kind: 'vec3', ... }` emit an info-severity "deferred" note
// and the gate is skipped for that side (per spec open-question 2). The
// vec3-origin face-inference path (project origin onto BREP, pick closest
// face) is queued for v0.7.x.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Param } from '../../shared/intent/types';
import type { Connector } from './connector';
import { parseConnectorRef } from './mate';
import type { ValidatorDiagnostic } from './validator';

/** Hole match tolerance per spec §Gate 1. */
const DIAMETER_EPSILON_MM = 0.05;

/** Minimum extra depth (mm) beyond the longer side that the combined
 *  blind+blind depth must provide to admit a screw. Per plan §Phase 3 Step 2.6. */
const SCREW_HEAD_CLEARANCE_MM = 1;

/**
 * Per-side observation built during the walk. Captures everything the
 * diagnostic needs to render its human-readable observed/expected strings
 * — never returned to callers in this shape; only the final
 * `ValidatorDiagnostic` is.
 */
interface SideObservation {
  readonly partName: string;
  readonly connectorName: string;
  /** Set when the connector binds a face via topology + face-center. */
  readonly boundFaceName?: string;
  /** Set when a matching hole feature was found on the bound face. */
  readonly hole?: {
    readonly diameterMm: number;
    /** `'through'` collapses the depth check (any screw fits). */
    readonly depth: number | 'through';
  };
  /**
   * Set when this side cannot be gated. Severity drives diagnostic level:
   *   - `'vec3-origin'`: info-severity deferred note (vec3-origin face
   *     inference is the documented v0.7.x deferral path).
   *   - `'unsupported-topology'`: warning-severity — the connector uses a
   *     non-face-center topology kind (face-normal, vertex, edge-axis,
   *     tracked, created, propagated, query); the gate cannot verify
   *     this side at all and the mate is silently ungated otherwise.
   */
  readonly deferred?: {
    readonly severity: 'info' | 'warning';
    readonly reason: string;
    readonly hint: string;
  };
}

/**
 * v0.7.4 Gate 1 entry point. Pure: no I/O, no lower, no async.
 *
 * Returns the list of diagnostics — possibly empty. Iterates only mates
 * with `type === 'fastened'`. For each mate emits at most one
 * `assembly.mounting-hole.mismatch` (severity error) when the two sides
 * disagree, plus at most one info-severity entry per vec3-origin side
 * to surface the deferred-face-inference behaviour.
 *
 * Dead code in this slice — Phase 6 of the v0.7.4 plan wires it into
 * `validateAssemblyWithMates`.
 */
export function validateMountingHoleConsistency(arm: Assembly): ValidatorDiagnostic[] {
  const out: ValidatorDiagnostic[] = [];
  const parts = arm.__parts();
  const records = arm.__session().getRecords();

  for (const mate of arm.__mates()) {
    if (mate.type !== 'fastened') continue;

    const aSide = observeSide(mate.a, parts, records);
    const bSide = observeSide(mate.b, parts, records);

    // Surface "deferred" notes. vec3-origin sides emit info-severity (the
    // documented v0.7.x deferral path); non-face-center topology kinds
    // (face-normal, vertex, edge-axis, tracked, created, propagated, query)
    // emit warning-severity — those connector shapes are unsupported by the
    // mounting-hole gate and would otherwise silently never be verified.
    // Only emitted on the side that defers; topology-bound sides on the
    // same mate proceed normally — the gate's verdict for that mate is
    // decided below using whichever side(s) successfully resolved.
    if (aSide.deferred !== undefined) {
      out.push({
        code: 'assembly.mounting-hole.mismatch',
        severity: aSide.deferred.severity,
        mateName: mate.name,
        partA: aSide.partName,
        message: `Mate '${mate.name}' (fastened) side '${aSide.partName}.${aSide.connectorName}': ${aSide.deferred.reason}.`,
        hint: aSide.deferred.hint,
      });
    }
    if (bSide.deferred !== undefined) {
      out.push({
        code: 'assembly.mounting-hole.mismatch',
        severity: bSide.deferred.severity,
        mateName: mate.name,
        partB: bSide.partName,
        message: `Mate '${mate.name}' (fastened) side '${bSide.partName}.${bSide.connectorName}': ${bSide.deferred.reason}.`,
        hint: bSide.deferred.hint,
      });
    }

    // If either side deferred, skip the binary verdict for this mate — the
    // deferred note (info for vec3-origin, warning for unsupported topology)
    // already surfaced the limitation. Phase 6 may revisit; for v0.7.4 we
    // don't error on unknown holes for deferred sides.
    if (aSide.deferred !== undefined || bSide.deferred !== undefined) {
      continue;
    }

    const verdict = decideMate(aSide, bSide);
    if (verdict.kind === 'ok') continue;
    out.push({
      code: 'assembly.mounting-hole.mismatch',
      // Demoted to 'info' under the physics-grounded loop (P3,
      // 2026-06-01): this is an authoring-time signal that the bound
      // hole features don't match; the merge gate is
      // mechanism.disconnect which fires under motion at validate-time.
      severity: 'info',
      mateName: mate.name,
      partA: aSide.partName,
      partB: bSide.partName,
      message: `Mate '${mate.name}' (fastened) hole features incompatible: ${verdict.observedA} vs ${verdict.observedB}.`,
      hint:
        `invalid-args.assembly.mounting-hole-mismatch — mate '${mate.name}' (fastened) expects compatible hole features on both bound faces. ` +
        `Side '${aSide.partName}.${aSide.connectorName}': ${verdict.observedA}. ` +
        `Side '${bSide.partName}.${bSide.connectorName}': ${verdict.observedB}. ` +
        `Adjust the diameter or depth on the side that does not match, or change the connector origin to a face that already exposes a matching hole.`,
    });
  }

  return out;
}

interface MateVerdict {
  readonly kind: 'ok' | 'mismatch';
  readonly observedA: string;
  readonly observedB: string;
}

/** Apply the Gate 1 compatibility rule to two fully-observed sides. */
function decideMate(aSide: SideObservation, bSide: SideObservation): MateVerdict {
  const observedA = describeHole(aSide);
  const observedB = describeHole(bSide);

  const aHole = aSide.hole;
  const bHole = bSide.hole;

  // Either side missing a hole feature: always a mismatch — a fastened
  // mate with no fastener target can never be installed.
  if (!aHole || !bHole) {
    return { kind: 'mismatch', observedA, observedB };
  }

  // Diameter agreement (±0.05 mm).
  if (Math.abs(aHole.diameterMm - bHole.diameterMm) > DIAMETER_EPSILON_MM) {
    return { kind: 'mismatch', observedA, observedB };
  }

  // Combined depth admits a screw: through on at least one side, or
  // A.depth + B.depth ≥ max(A.depth, B.depth) + clearance.
  if (aHole.depth === 'through' || bHole.depth === 'through') {
    return { kind: 'ok', observedA, observedB };
  }
  const combined = aHole.depth + bHole.depth;
  const required = Math.max(aHole.depth, bHole.depth) + SCREW_HEAD_CLEARANCE_MM;
  if (combined < required) {
    return { kind: 'mismatch', observedA, observedB };
  }

  return { kind: 'ok', observedA, observedB };
}

/** Render a human-readable observation string used in the diagnostic hint. */
function describeHole(side: SideObservation): string {
  if (side.boundFaceName === undefined) {
    // Topology origin but not face-center — we treated it as deferred above,
    // so this branch is mostly defensive.
    return 'connector origin is not a face-center topology query (cannot resolve bound face for hole match)';
  }
  if (!side.hole) {
    return `no hole feature found on bound face '${side.boundFaceName}'`;
  }
  const dia = `${side.hole.diameterMm} mm`;
  const depth = side.hole.depth === 'through' ? 'through' : `${side.hole.depth} mm`;
  return `hole on face '${side.boundFaceName}' (diameter ${dia}, depth ${depth})`;
}

/** Resolve one side of a mate to a fully-observed `SideObservation`. */
function observeSide(
  ref: string,
  parts: readonly AssemblyPartStored[],
  records: readonly FeatureRecord[],
): SideObservation {
  // `parseConnectorRef` already validates shape and throws a structured
  // error if `ref` is malformed; that error is raised at `arm.mate(...)`
  // time, so by the time we get here `ref` is well-formed.
  const { partName, connectorName } = parseConnectorRef(ref);
  const part = parts.find((p) => p.name === partName);
  if (!part) {
    // Defensive: shouldn't happen — `arm.mate(...)` already validates that
    // each side's part is registered. Return a sentinel observation so the
    // mate is reported via the standard "no hole" path rather than crashing.
    return { partName, connectorName };
  }
  const connector = part.mateConnectors.find((c) => c.name === connectorName);
  if (!connector) {
    // Same defensive note as above.
    return { partName, connectorName };
  }

  // Step 3 of the plan outline — extract the bound face name.
  const bound = extractBoundFace(connector);
  if (bound.kind === 'deferred') {
    return {
      partName,
      connectorName,
      deferred: {
        severity: bound.severity,
        reason: bound.reason,
        hint: bound.hint(partName, connectorName),
      },
    };
  }

  // Steps 4 + 5 — walk the records chain from the part's originalShape.id
  // upstream through `inputs.target` to find a hole feature whose
  // `inputs.face` ref matches the bound face name.
  const hole = findHoleOnFace(part.originalShape.id, bound.faceName, records);

  return {
    partName,
    connectorName,
    boundFaceName: bound.faceName,
    ...(hole !== undefined ? { hole } : {}),
  };
}

type BoundFace =
  | { kind: 'faceName'; faceName: string }
  | {
      kind: 'deferred';
      severity: 'info' | 'warning';
      reason: string;
      hint: (partName: string, connectorName: string) => string;
    };

function extractBoundFace(connector: Connector): BoundFace {
  if (connector.origin.kind === 'vec3') {
    // Documented v0.7.x deferral — vec3-origin face inference (project
    // origin onto BREP, pick closest face) is queued but not shipped.
    // Emit info: still a common authoring shape today.
    return {
      kind: 'deferred',
      severity: 'info',
      reason: 'vec3-origin face inference deferred to v0.7.x',
      hint: (partName, connectorName) =>
        `invalid-args.assembly.mounting-hole-mismatch — side '${partName}.${connectorName}' uses a vec3 connector origin; v0.7.4 mounting-hole consistency only gates topology-bound origins. Switch to origin: { kind: 'topology', query: { kind: 'face-center', name: '<face>' } } to enable the gate on this side.`,
    };
  }
  if (connector.origin.query.kind === 'face-center') {
    return { kind: 'faceName', faceName: connector.origin.query.name };
  }
  // Non-face-center topology kinds (face-normal, vertex, edge-axis, tracked,
  // created, propagated, query) do not carry "this connector is bound to
  // face X" semantics — the gate cannot resolve a face to look for a hole.
  // Emit warning (not info): this is an UNSUPPORTED connector shape for the
  // mounting-hole gate, not a deferred-to-v0.7.x feature; without escalating
  // to warning the fastened mate would silently never be gated.
  const queryKind = connector.origin.query.kind;
  return {
    kind: 'deferred',
    severity: 'warning',
    reason: `connector uses topology query kind '${queryKind}'; the mounting-hole gate only supports 'face-center' for face inference. The gate cannot verify this side. Either change the connector origin to a face-center query or accept that this mate is ungated`,
    hint: (partName, connectorName) =>
      `invalid-args.assembly.mounting-hole-mismatch — mate connector '${partName}.${connectorName}' uses topology query kind '${queryKind}'; the mounting-hole gate only supports 'face-center' for face inference. The gate cannot verify this side. Either change the connector origin to a face-center query (origin: { kind: 'topology', query: { kind: 'face-center', name: '<face>' } }) or accept that this mate is ungated.`,
  };
}

/**
 * Walk upstream from `startId` through `inputs.target` refs and return the
 * first `hole` / `holes` record whose `inputs.face` ref refers to
 * `boundFaceName`. Bounded walk: ~depth of feature stack on this part. The
 * chain is followed only via `inputs.target.id`; once a non-feature kind
 * (e.g. `box`, `cylinder`) is reached, the walk terminates.
 */
function findHoleOnFace(
  startId: FeatureId,
  boundFaceName: string,
  records: readonly FeatureRecord[],
): SideObservation['hole'] | undefined {
  const byId = new Map<FeatureId, FeatureRecord>();
  for (const r of records) byId.set(r.id, r);

  let currentId: FeatureId | undefined = startId;
  // Defensive bound — prevents infinite loops on a malformed records chain.
  for (let i = 0; i < records.length + 1; i++) {
    if (currentId === undefined) return undefined;
    const rec: FeatureRecord | undefined = byId.get(currentId);
    if (!rec) return undefined;
    if ((rec.kind === 'hole' || rec.kind === 'holes') && faceRefMatches(rec, boundFaceName)) {
      return readHoleParams(rec);
    }
    // Continue walking upstream via inputs.target.id, which the hole / holes
    // / cutout / fillet / chamfer / shell / pattern proxies all set.
    const target = rec.inputs.target;
    if (target && target.kind === 'feature') {
      currentId = target.id;
    } else {
      return undefined;
    }
  }
  return undefined;
}

function faceRefMatches(rec: FeatureRecord, boundFaceName: string): boolean {
  const face = rec.inputs.face;
  if (!face || face.kind !== 'face') return false;
  const ref = face.ref;
  // Canonical face names ('top' / 'bottom' / etc.) — string-compare the
  // declared `face` against the bound name. This is what
  // `kcad.box(...).hole('top', ...)` produces (FaceRef kind: 'canonical').
  if (ref.kind === 'canonical') return ref.face === boundFaceName;
  // User-declared labels via `metadata.faceLabels` — compare on `name`.
  if (ref.kind === 'label') return ref.name === boundFaceName;
  // TODO(v0.7.x): extend matcher to handle tracked/created/propagated/query FaceRef kinds.
  // Today only 'canonical' refs match; non-canonical refs cause false 'no hole' diagnostics.
  return false;
}

function readHoleParams(rec: FeatureRecord): SideObservation['hole'] | undefined {
  const diaParam = rec.params.diameter;
  if (!isFinitePositive(diaParam)) return undefined;
  // Depth: numeric `params.depth` OR through (depthMode param set with
  // expression "'through'"). serializeHoleParams sets exactly one of these.
  // See src/intent/holeValidation.ts:351.
  const depthMode = rec.params.depthMode;
  if (depthMode !== undefined && depthMode.expression === "'through'") {
    return { diameterMm: diaParam.evaluated, depth: 'through' };
  }
  const depthParam = rec.params.depth;
  if (isFinitePositive(depthParam)) {
    return { diameterMm: diaParam.evaluated, depth: depthParam.evaluated };
  }
  // Hole record with neither a numeric depth nor a through marker is
  // malformed — treated as "no hole" so the gate emits a mismatch with the
  // observed-string explaining the bound-face state. validateHoleOpts
  // already rejects this at capture time, so this is defensive.
  return undefined;
}

function isFinitePositive(p: Param | undefined): p is Param {
  return p !== undefined && typeof p.evaluated === 'number' && Number.isFinite(p.evaluated) && p.evaluated > 0;
}
