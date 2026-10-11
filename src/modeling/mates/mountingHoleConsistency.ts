// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/mountingHoleConsistency.ts
//
// v0.7.4 Gate 1 — fastened-mate mounting-hole consistency check.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 1.
// Plan : `2026-05-15-v0.7-kinematic-grounding.md` §Phase 3.
//
// For every mate with `type === 'fastened'`, both connector-bound faces
// must expose compatible `kind: 'hole'` / `kind: 'holes'` records:
//   - diameters one screw can use: equal (±0.05 mm — dowel / bolt+nut), or
//     a clearance hole on one side and a tap drill / threaded hole /
//     insert bore for the SAME ISO metric size on the other (M3: 3.4 mm
//     clearance over a 2.5 mm tap drill or a hole({ thread }) of nominal 3)
//     — see `fastenerSizesFor`, AND
//   - combined depth admits a screw (one side `through`, or
//     A.depth + B.depth ≥ max(A.depth, B.depth) + 1 mm).
// A through hole drilled from the opposite face also opens on the bound
// face. Neither bound face carrying a hole is a rigid bonded / welded /
// press-fit attachment, not a mismatch.
//
// On mismatch (or when only one side has a hole on the bound face), emit a
// single `assembly.mounting-hole.mismatch` diagnostic (severity info).
// Sides the gate cannot resolve emit `assembly.mounting-hole.unverified`
// instead — never a mismatch. Pure, synchronous: walks
// `arm.__session().getRecords()` from each part's `originalShape.id`
// upstream through `inputs.target` chains; no lower / no async. The
// geometric hole-ALIGNMENT gate lives in `mountingHoleAlignment.ts`.
//
// This module is dead code until Phase 6 wires it into
// `validateAssemblyWithMates`. That's intentional — keep the gate isolated
// behind a separate import so callers (lowerer, MCP) can compose it.
//
// v0.7.4 ships **topology-bound origins only**. Connectors with
// `origin: { kind: 'vec3', ... }` emit an info-severity
// `assembly.mounting-hole.unverified` note and the record gate is skipped
// for that side; the geometric alignment gate still covers the mate.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Param } from '../../shared/intent/types';
import { resolveParams } from '../../shared/runtime/resolveParams';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type { Connector } from './connector';
import { parseConnectorRef } from './mate';
import type { ValidatorDiagnostic } from './validator';

/** Hole match tolerance per spec §Gate 1. */
const DIAMETER_EPSILON_MM = 0.05;

/** ISO metric coarse sizes a fastened joint may use (nominal mm). */
const METRIC_NOMINAL_SIZES_MM = [1.6, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 30] as const;

/** Smallest tap drill / self-tapping pilot accepted, as a fraction of the
 *  nominal size (M3 tap drill 2.5 = 0.83·d; plastic pilots go to ~0.75·d). */
const MIN_TAPPED_FRACTION = 0.72;

/** Largest clearance / heat-set-insert bore accepted for a nominal size:
 *  1.5·d + 0.5 mm (M3 insert bore 4.2 mm, M3 coarse clearance 3.6 mm). */
function maxClearanceMm(nominal: number): number {
  return nominal * 1.5 + 0.5;
}

/** Minimum extra depth (mm) beyond the longer side that the combined
 *  blind+blind depth must provide to admit a screw. Per plan §Phase 3 Step 2.6. */
const SCREW_HEAD_CLEARANCE_MM = 1;

/**
 * Per-side observation built during the walk. Captures everything the
 * diagnostic needs to render its human-readable observed/expected strings
 * — never returned to callers in this shape; only the final
 * `ValidatorDiagnostic` is.
 */
export interface SideObservation {
  readonly partName: string;
  readonly connectorName: string;
  /** Set when the connector binds a face via topology + face-center. */
  readonly boundFaceName?: string;
  /** Set when a matching hole feature was found on the bound face. */
  readonly hole?: {
    readonly diameterMm: number;
    /** `'through'` collapses the depth check (any screw fits). */
    readonly depth: number | 'through';
    /** Set when the hole carries `thread` — `diameterMm` is the nominal size. */
    readonly threaded?: boolean;
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

/** Verdict of the hole-record gate for one fastened mate. */
export type FastenedMateHoleVerdict =
  /** Both bound faces carry holes one fastener can use. */
  | 'ok'
  /** Neither bound face carries a hole: a bonded / welded / press-fit joint. */
  | 'rigid'
  /** The bound hole features cannot take one fastener. */
  | 'mismatch'
  /** A side could not be resolved to a bound face; nothing was decided. */
  | 'unverified';

/** One fastened mate as the hole-record gate saw it. */
export interface FastenedMateHoleObservation {
  readonly mateName: string;
  readonly sideA: SideObservation;
  readonly sideB: SideObservation;
  readonly verdict: FastenedMateHoleVerdict;
  /** Human-readable per-side observation strings (bound face + hole). */
  readonly observedA: string;
  readonly observedB: string;
}

/**
 * Observe every fastened mate's two bound faces. The structured view behind
 * {@link validateMountingHoleConsistency}; `kc.kinematic` builds its
 * `mismatches` list from it so only real mismatches (never unresolved
 * sides) fail the gate.
 */
export function observeFastenedMateHoles(arm: Assembly): FastenedMateHoleObservation[] {
  const parts = arm.__parts();
  const session = arm.__session();
  const records = session.getRecords();
  const paramTable = session.paramTable;
  const out: FastenedMateHoleObservation[] = [];
  for (const mate of arm.__mates()) {
    if (mate.type !== 'fastened') continue;
    const sideA = observeSide(mate.a, parts, records, paramTable);
    const sideB = observeSide(mate.b, parts, records, paramTable);
    const observedA = describeHole(sideA);
    const observedB = describeHole(sideB);
    const verdict: FastenedMateHoleVerdict = sideA.deferred !== undefined || sideB.deferred !== undefined
      ? 'unverified'
      : decideMate(sideA, sideB);
    out.push({ mateName: mate.name, sideA, sideB, verdict, observedA, observedB });
  }
  return out;
}

/**
 * v0.7.4 Gate 1 entry point. Pure: no I/O, no lower, no async.
 *
 * Returns the list of diagnostics — possibly empty. Iterates only mates
 * with `type === 'fastened'`. For each mate emits at most one
 * `assembly.mounting-hole.mismatch` (severity info) when the two sides
 * cannot take one fastener, plus one `assembly.mounting-hole.unverified`
 * note per side the gate cannot resolve (info for a vec3 origin, warning
 * for an unsupported topology query).
 */
export function validateMountingHoleConsistency(arm: Assembly): ValidatorDiagnostic[] {
  const out: ValidatorDiagnostic[] = [];
  for (const observation of observeFastenedMateHoles(arm)) {
    out.push(...unverifiedNotes(observation));
    if (observation.verdict === 'mismatch') out.push(mismatchDiagnostic(observation));
  }
  return out;
}

function unverifiedNotes(observation: FastenedMateHoleObservation): ValidatorDiagnostic[] {
  const out: ValidatorDiagnostic[] = [];
  for (const [side, key] of [[observation.sideA, 'partA'], [observation.sideB, 'partB']] as const) {
    if (side.deferred === undefined) continue;
    out.push({
      code: 'assembly.mounting-hole.unverified',
      severity: side.deferred.severity,
      mateName: observation.mateName,
      [key]: side.partName,
      message: `Mate '${observation.mateName}' (fastened) side '${side.partName}.${side.connectorName}': ${side.deferred.reason}.`,
      hint: side.deferred.hint,
    });
  }
  return out;
}

function mismatchDiagnostic(observation: FastenedMateHoleObservation): ValidatorDiagnostic {
  const { mateName, sideA, sideB, observedA, observedB } = observation;
  return {
    code: 'assembly.mounting-hole.mismatch',
    // Demoted to 'info' under the physics-grounded loop (P3,
    // 2026-06-01): this is an authoring-time signal that the bound
    // hole features don't match; the merge gate is
    // mechanism.disconnect which fires under motion at validate-time.
    severity: 'info',
    mateName,
    partA: sideA.partName,
    partB: sideB.partName,
    message: `Mate '${mateName}' (fastened) hole features incompatible: ${observedA} vs ${observedB}.`,
    hint:
      `invalid-args.assembly.mounting-hole-mismatch — mate '${mateName}' (fastened) expects hole features one screw can use on both bound faces: ` +
      `the same diameter, or a clearance hole over a tap drill / hole({ thread }) of the same metric size (M3: 3.4 mm clearance + 2.5 mm tap drill). ` +
      `Side '${sideA.partName}.${sideA.connectorName}': ${observedA}. ` +
      `Side '${sideB.partName}.${sideB.connectorName}': ${observedB}. ` +
      `Adjust the diameter or depth on the side that does not match, or change the connector origin to a face that already exposes a matching hole.`,
  };
}

/** Apply the Gate 1 compatibility rule to two fully-observed sides. */
function decideMate(aSide: SideObservation, bSide: SideObservation): FastenedMateHoleVerdict {
  const aHole = aSide.hole;
  const bHole = bSide.hole;
  // Neither bound face drilled: an adhesive / weld / press-fit / snap joint.
  if (!aHole && !bHole) return 'rigid';
  // One side drilled, the other blank: the screw has nowhere to go.
  if (!aHole || !bHole) return 'mismatch';
  if (!holeDiametersCompatible(aHole, bHole)) return 'mismatch';
  return depthAdmitsScrew(aHole.depth, bHole.depth) ? 'ok' : 'mismatch';
}

type ObservedHole = NonNullable<SideObservation['hole']>;

/**
 * True when one fastener can use both holes: equal diameters (±0.05 mm),
 * or some ISO metric size N for which each hole is a tap drill / threaded
 * hole (engages the thread) or a clearance / insert bore (passes the
 * shank), with at least one side passing the shank — two threaded holes
 * hold no screw.
 */
export function holeDiametersCompatible(a: ObservedHole, b: ObservedHole): boolean {
  if (Math.abs(a.diameterMm - b.diameterMm) <= DIAMETER_EPSILON_MM) return true;
  return METRIC_NOMINAL_SIZES_MM.some((size) => {
    const roleA = holeRole(a, size);
    const roleB = holeRole(b, size);
    return roleA !== undefined && roleB !== undefined && (roleA === 'clearance' || roleB === 'clearance');
  });
}

/** What `hole` does for a screw of nominal `size`: engage its thread, let
 *  the shank through, or neither (too small / too large). */
function holeRole(hole: ObservedHole, size: number): 'tapped' | 'clearance' | undefined {
  const d = hole.diameterMm;
  if (hole.threaded === true) return Math.abs(d - size) <= DIAMETER_EPSILON_MM ? 'tapped' : undefined;
  if (d >= size * MIN_TAPPED_FRACTION - DIAMETER_EPSILON_MM && d < size - DIAMETER_EPSILON_MM) return 'tapped';
  if (d >= size - DIAMETER_EPSILON_MM && d <= maxClearanceMm(size) + DIAMETER_EPSILON_MM) return 'clearance';
  return undefined;
}

/** Combined depth admits a screw: through on at least one side, or
 *  A.depth + B.depth ≥ max(A.depth, B.depth) + clearance. */
function depthAdmitsScrew(a: number | 'through', b: number | 'through'): boolean {
  if (a === 'through' || b === 'through') return true;
  return a + b >= Math.max(a, b) + SCREW_HEAD_CLEARANCE_MM;
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
  const dia = `${side.hole.diameterMm} mm${side.hole.threaded === true ? ' threaded' : ''}`;
  const depth = side.hole.depth === 'through' ? 'through' : `${side.hole.depth} mm`;
  return `hole on face '${side.boundFaceName}' (diameter ${dia}, depth ${depth})`;
}

/** Resolve one side of a mate to a fully-observed `SideObservation`. */
function observeSide(
  ref: string,
  parts: readonly AssemblyPartStored[],
  records: readonly FeatureRecord[],
  paramTable: ParamTable,
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
  const hole = findHoleOnFace(part.originalShape.id, bound.faceName, records, paramTable);

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
      reason: 'the connector origin is a vec3 point, so the hole-record gate cannot tell which face it binds (not a mismatch; the geometric hole-alignment check still covers this mate)',
      hint: (partName, connectorName) =>
        `mounting-hole.unverified — side '${partName}.${connectorName}' uses a vec3 connector origin, so hole diameters are not compared by feature record. This is informational. To have hole() / holes() diameters compared too, bind the connector to the drilled face: origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } }.`,
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
      `mounting-hole.unverified — mate connector '${partName}.${connectorName}' uses topology query kind '${queryKind}'; the mounting-hole gate only supports 'face-center' for face inference. The gate cannot verify this side. Either change the connector origin to a face-center query (origin: { kind: 'topology', query: { kind: 'face-center', name: '<face>' } }) or accept that this mate is ungated.`,
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
  paramTable: ParamTable,
): SideObservation['hole'] | undefined {
  const byId = new Map<FeatureId, FeatureRecord>();
  for (const r of records) byId.set(r.id, r);

  let currentId: FeatureId | undefined = startId;
  // Defensive bound — prevents infinite loops on a malformed records chain.
  for (let i = 0; i < records.length + 1; i++) {
    if (currentId === undefined) return undefined;
    const rec: FeatureRecord | undefined = byId.get(currentId);
    if (!rec) return undefined;
    const hole = holeOnBoundFace(rec, boundFaceName, paramTable);
    if (hole !== undefined) return hole;
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

/** Canonical faces a through hole drilled from one face also opens on. */
const OPPOSITE_FACE: Readonly<Record<string, string>> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left', front: 'back', back: 'front',
};

/** The hole a hole / holes record opens on `boundFaceName`: drilled from
 *  that face, or a through hole drilled from the opposite canonical face. */
function holeOnBoundFace(
  rec: FeatureRecord,
  boundFaceName: string,
  paramTable: ParamTable,
): SideObservation['hole'] | undefined {
  if (rec.kind !== 'hole' && rec.kind !== 'holes') return undefined;
  if (faceRefMatches(rec, boundFaceName)) return readHoleParams(rec, paramTable);
  const opposite = OPPOSITE_FACE[boundFaceName];
  if (opposite === undefined || !faceRefMatches(rec, opposite)) return undefined;
  const hole = readHoleParams(rec, paramTable);
  return hole?.depth === 'through' ? hole : undefined;
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

function readHoleParams(
  rec: FeatureRecord,
  paramTable: ParamTable,
): SideObservation['hole'] | undefined {
  // ParamRef diameters capture with `evaluated: 0` and `paramRef` set;
  // resolve against the live table so a `.hole({ diameter: someParam })`
  // feature is a real hole, not "no hole feature found".
  const params = resolveParams(rec.params, paramTable);
  const diaParam = params.diameter;
  if (!isFinitePositive(diaParam)) return undefined;
  // Depth: numeric `params.depth` OR through (depthMode param set with
  // expression "'through'"). serializeHoleParams sets exactly one of these.
  // See src/intent/holeValidation.ts:351.
  const threaded = params.threadPitch !== undefined ? { threaded: true } : {};
  const depthMode = params.depthMode;
  if (depthMode !== undefined && depthMode.expression === "'through'") {
    return { diameterMm: diaParam.evaluated, depth: 'through', ...threaded };
  }
  const depthParam = params.depth;
  if (isFinitePositive(depthParam)) {
    return { diameterMm: diaParam.evaluated, depth: depthParam.evaluated, ...threaded };
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
