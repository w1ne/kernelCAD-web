// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/jointLoadCapacity.ts
//
// v0.7.4 Gate 3 — joint-load capacity STUB.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 3.
// Plan : `2026-05-15-v0.7-kinematic-grounding.md` §Phase 5.
//
// For each mate that DECLARED a `maxLoad` and whose type is one of the four
// gated types (`prismatic`, `revolute`, `cylindrical`, `ball`), verify that
// the per-side `externalLoads` applied to the bound parts do not exceed the
// declared capacity. On exceed, emit `assembly.joint.load-exceeded`
// (severity `error`).
//
// Dead code in this slice — Phase 6 wires it into
// `validateAssemblyWithMates`. Keeping it import-isolated lets the
// validator stitch all three Gate 1/2/3 modules together once Task 0's
// envelope auto-wiring lands.
//
// ## STUB CAVEATS — read before touching this module
//
// Per the spec's Gate 3 §"Explicit limitation" and §OUT-of-scope:
//
//   1. **No FEA, no stress.** Just magnitude comparison vs declared limit.
//   2. **No cross-joint propagation.** Each mate is checked in isolation
//      against `externalLoads` on its own two bound parts. A load on part C
//      that flows through joint J1 → part B → joint J2 → part A is NOT
//      propagated; the agent must annotate `externalLoads` on each
//      participating part if the chain matters.
//   3. **No friction, no gravity.** Only the declared `externalLoads` vector
//      contributes.
//   4. **Static only.** No impulse / inertia / dynamic load.
//   5. **CoM approximation = `part.at`.** Computing real CoM would require
//      lowering BREP (mass-properties via OCCT's `BRepGProp::VolumeProperties`
//      / `Mass`), which violates this module's "pure / sync" contract. The
//      part's authored placement is used as the CoM proxy — this is fine for
//      a sanity gate (the dominant signal in `r = CoM - jointOrigin` is the
//      authored offset between joint and part, not the in-part mass
//      distribution), and is documented in the v0.7.4 CHANGELOG. v0.7.x can
//      upgrade by adding a sync `Shape.boundingBoxAt(at)` if needed.
//   6. **Mass = 1 kg uniform.** Per spec §Gate 3; the agent passes force
//      vectors directly, not (mass, acceleration) pairs.
//
// ## Topology origins not supported in v0.7.4
//
// Resolving a `topology` connector origin to a numeric Vec3 requires lowering
// the part shape (`resolveConnectorOrigin` is async). Gate 3 is sync. For
// `maxLoad`-declared mates whose connectors use topology origins on either
// side, the gate emits one `assembly.joint.load-exceeded`-coded info-severity
// note per side and SKIPS the mate (no false-positive error from a missing
// origin). This matches spec open-question 5/2 resolution: vec3-origin
// requirement for v0.7.4, topology support is a v0.7.x followup.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import { parseConnectorRef, type MateRecord } from './mate';
import type { MateType } from './mateTypes';
import type { ValidatorDiagnostic } from './validator';

/** Gated mate types per spec §Gate 3. Other mate types may carry `maxLoad`
 *  (the surface is stable for the v0.7.x extension) but Gate 3 in v0.7.4
 *  only summates these four. Mates of other types with `maxLoad` declared
 *  are silently skipped per spec open-question 4 resolution. */
const GATED_MATE_TYPES: ReadonlySet<MateType> = new Set<MateType>([
  'prismatic',
  'revolute',
  'cylindrical',
  'ball',
]);

/** Unit string for force checks (Newtons). */
const FORCE_UNIT = 'N';
/** Unit string for torque checks (Newton·metres). */
const TORQUE_UNIT = 'N·m';
/** mm → m for torque computation. `r` is read in mm (kernelCAD's canonical
 *  length unit), force is N, so `r × F` yields N·mm; divide by `MM_PER_M`
 *  to land in N·m to compare against `maxLoad.torque`. */
const MM_PER_M = 1000;

/**
 * v0.7.4 Gate 3 entry point. Pure: no I/O, no lower, no async. STUB —
 * see the file header's §STUB CAVEATS for the limits of what this gate
 * actually checks.
 *
 * Returns the list of diagnostics — possibly empty. Iterates only mates
 * with `maxLoad` declared AND `type ∈ { prismatic, revolute, cylindrical,
 * ball }`. For each mate emits zero or one `assembly.joint.load-exceeded`
 * (severity `error`) per exceeded kind (force / torque can each trip
 * independently on a `cylindrical` mate, so a single mate may emit two
 * diagnostics).
 *
 * Dead code in this slice — Phase 6 of the v0.7.4 plan wires it into
 * `validateAssemblyWithMates`.
 */
export function validateJointLoadCapacity(
  arm: Assembly,
  externalLoads?: Readonly<Record<string, { force?: Vec3; torque?: Vec3 }>>,
): ValidatorDiagnostic[] {
  // Step 1 of plan §Phase 5: undefined externalLoads → no work to do.
  // The mate's `maxLoad` declaration is the agent's stated capacity, but a
  // gate that fires with "you didn't say what's applied" against every
  // capacity-tagged mate would drown out real errors. Spec defaults to
  // "explicit external-loads input or skip."
  if (externalLoads === undefined) return [];

  const out: ValidatorDiagnostic[] = [];
  const partsByName = new Map<string, AssemblyPartStored>();
  for (const p of arm.__parts()) partsByName.set(p.name, p);

  for (const mate of arm.__mates()) {
    if (mate.maxLoad === undefined) continue;
    if (!GATED_MATE_TYPES.has(mate.type)) continue;

    const aSide = resolveSide(mate.a, partsByName);
    const bSide = resolveSide(mate.b, partsByName);

    // Topology-origin sides: surface a capability-not-supported note per
    // affected side (info severity — this is a documented v0.7.x deferral,
    // not an error in the agent's input). Skip the mate's load summation
    // when either side is unresolvable.
    if (aSide.kind === 'deferred') {
      out.push(makeTopologyDeferredDiag(mate, aSide.partName, aSide.connectorName, 'a'));
    }
    if (bSide.kind === 'deferred') {
      out.push(makeTopologyDeferredDiag(mate, bSide.partName, bSide.connectorName, 'b'));
    }
    if (aSide.kind !== 'resolved' || bSide.kind !== 'resolved') continue;

    // Per-mate-type force/torque check. Each branch reads `externalLoads`
    // for both parts (a missing entry contributes zero), then compares
    // against the declared limit and emits one diagnostic per exceeded
    // kind (force XOR torque on prismatic/revolute/ball; possibly BOTH on
    // cylindrical).
    const loadA = externalLoads[aSide.partName];
    const loadB = externalLoads[bSide.partName];

    switch (mate.type) {
      case 'prismatic':
        checkForce(out, mate, aSide, bSide, loadA, loadB);
        break;
      case 'ball':
        checkForce(out, mate, aSide, bSide, loadA, loadB);
        break;
      case 'revolute':
        checkTorque(out, mate, aSide, bSide, loadA, loadB);
        break;
      case 'cylindrical':
        checkForce(out, mate, aSide, bSide, loadA, loadB);
        checkTorque(out, mate, aSide, bSide, loadA, loadB);
        break;
      // No default: GATED_MATE_TYPES filter above bounds the switch space.
    }
  }
  return out;
}

interface ResolvedSide {
  readonly kind: 'resolved';
  readonly partName: string;
  readonly connectorName: string;
  /** World-space origin of this side's connector (mm). */
  readonly jointOriginWorld: Vec3;
  /** World-space CoM proxy = part's authored `at` (see §STUB CAVEATS #5). */
  readonly partCoMWorld: Vec3;
}

interface DeferredSide {
  readonly kind: 'deferred';
  readonly partName: string;
  readonly connectorName: string;
}

interface MissingSide {
  readonly kind: 'missing';
  readonly partName: string;
  readonly connectorName: string;
}

type SideResolution = ResolvedSide | DeferredSide | MissingSide;

/**
 * Resolve one side of a mate ('<partName>.<connectorName>') to its
 * world-space joint origin + CoM proxy. Returns:
 *   - `'resolved'` when the connector has a `vec3` origin (the gate's
 *     supported shape).
 *   - `'deferred'` when the connector uses a `topology` origin — Gate 3
 *     in v0.7.4 does not support sync topology resolution; surfaced as an
 *     info-severity note upstream.
 *   - `'missing'` defensively, when the part/connector ref doesn't
 *     resolve (shouldn't happen — `arm.mate(...)` validates names at
 *     capture time).
 */
function resolveSide(
  ref: string,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
): SideResolution {
  const { partName, connectorName } = parseConnectorRef(ref);
  const part = partsByName.get(partName);
  if (!part) return { kind: 'missing', partName, connectorName };
  const connector = part.mateConnectors.find((c) => c.name === connectorName);
  if (!connector) return { kind: 'missing', partName, connectorName };
  if (connector.origin.kind !== 'vec3') {
    return { kind: 'deferred', partName, connectorName };
  }
  const partAt = readPartAt(part);
  const localOrigin = connector.origin.value;
  // World origin = part's authored placement + connector's part-local origin.
  // Mirrors the resolvePartPlacement helper in assembly.ts: part.at is the
  // part's translation in the assembly frame; connector.origin.value is
  // the connector's offset in the part's local frame; sum is the
  // connector's frame origin in world coordinates.
  const jointOriginWorld: Vec3 = [
    partAt[0] + localOrigin[0],
    partAt[1] + localOrigin[1],
    partAt[2] + localOrigin[2],
  ];
  // CoM proxy = part's authored placement. STUB per §STUB CAVEATS #5; the
  // real CoM would require BREP mass-properties (async, OCCT call). Good
  // enough for the sanity gate: the dominant signal in `r = CoM - joint`
  // is the authored offset, not the in-part distribution.
  const partCoMWorld: Vec3 = [partAt[0], partAt[1], partAt[2]];
  return {
    kind: 'resolved',
    partName,
    connectorName,
    jointOriginWorld,
    partCoMWorld,
  };
}

/** Read `part.at` (`Vec3Param`) as a plain numeric Vec3 via `.evaluated`. */
function readPartAt(part: AssemblyPartStored): Vec3 {
  return [part.at.x.evaluated, part.at.y.evaluated, part.at.z.evaluated];
}

// ─────────────────────────────────────────────────────────────────────────
// Per-kind checks. Each pushes at most one diagnostic into `out`.
// ─────────────────────────────────────────────────────────────────────────

interface SidedLoad {
  readonly force?: Vec3;
  readonly torque?: Vec3;
}

/**
 * Force check: sum the magnitudes of `externalLoads[partA].force` and
 * `externalLoads[partB].force`. Spec §Gate 3 specifies summation of
 * magnitudes (not vector sum); a 100 N pull on one side AND a 100 N pull on
 * the other counts as 200 N for the gate, even when they cancel
 * geometrically — the joint still has to resist both arms' worth of pull.
 */
function checkForce(
  out: ValidatorDiagnostic[],
  mate: MateRecord,
  aSide: ResolvedSide,
  bSide: ResolvedSide,
  loadA: SidedLoad | undefined,
  loadB: SidedLoad | undefined,
): void {
  const declared = mate.maxLoad?.force;
  if (declared === undefined || !Number.isFinite(declared)) return;
  const fA = loadA?.force ? vec3Magnitude(loadA.force) : 0;
  const fB = loadB?.force ? vec3Magnitude(loadB.force) : 0;
  const observed = fA + fB;
  if (observed <= declared) return;
  out.push(makeLoadExceededDiag(mate, aSide.partName, bSide.partName, 'force', observed, declared, FORCE_UNIT));
}

/**
 * Torque check: for each side with a declared `externalLoads.force`,
 * compute `|r × F| / MM_PER_M` where `r = partCoMWorld - jointOriginWorld`
 * (mm) and `F` is the part's external force (N). Sum across both sides
 * and compare against `maxLoad.torque` (N·m).
 *
 * Spec note: agents can also pass `externalLoads.torque` directly (a
 * pure couple applied to the part). When set, that torque's magnitude is
 * added to the `r × F`-derived contribution for the same side. Both
 * sources sum into the joint's reaction; the gate doesn't try to
 * distinguish "load through the lever arm" from "applied couple."
 */
function checkTorque(
  out: ValidatorDiagnostic[],
  mate: MateRecord,
  aSide: ResolvedSide,
  bSide: ResolvedSide,
  loadA: SidedLoad | undefined,
  loadB: SidedLoad | undefined,
): void {
  const declared = mate.maxLoad?.torque;
  if (declared === undefined || !Number.isFinite(declared)) return;
  // Compute r for each side from the SAME joint origin. The two sides
  // share the connector pair's world origin (mate ties them together);
  // `aSide.jointOriginWorld` and `bSide.jointOriginWorld` would be
  // coincident in a converged solve. We use each side's own origin here
  // so the stub doesn't depend on a solver pass — the test fixtures all
  // place the two connectors at the SAME world point per the mate
  // contract, so this matches the converged solve to floating-point.
  const tauA = torqueContribution(aSide, loadA);
  const tauB = torqueContribution(bSide, loadB);
  const observed = tauA + tauB;
  if (observed <= declared) return;
  out.push(makeLoadExceededDiag(mate, aSide.partName, bSide.partName, 'torque', observed, declared, TORQUE_UNIT));
}

/**
 * |r × F| / MM_PER_M for the lever-arm contribution + |τ_applied| for the
 * pure-couple contribution. Returns N·m.
 */
function torqueContribution(side: ResolvedSide, load: SidedLoad | undefined): number {
  if (!load) return 0;
  let total = 0;
  if (load.force) {
    const r: Vec3 = [
      side.partCoMWorld[0] - side.jointOriginWorld[0],
      side.partCoMWorld[1] - side.jointOriginWorld[1],
      side.partCoMWorld[2] - side.jointOriginWorld[2],
    ];
    const tau = vec3Cross(r, load.force);
    total += vec3Magnitude(tau) / MM_PER_M;
  }
  if (load.torque) {
    total += vec3Magnitude(load.torque);
  }
  return total;
}

function vec3Magnitude(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Diagnostic builders.
// ─────────────────────────────────────────────────────────────────────────

function makeLoadExceededDiag(
  mate: MateRecord,
  partA: string,
  partB: string,
  kind: 'force' | 'torque',
  observed: number,
  declared: number,
  unit: string,
): ValidatorDiagnostic {
  const delta = observed - declared;
  // Cast: `mate.maxLoad` is guaranteed non-undefined when this builder
  // fires (caller checks before invoking), but the type guard already
  // narrowed at the call site. The field width and unit derive from the
  // `kind` arg directly to keep the format hint stable.
  return {
    code: 'assembly.joint.load-exceeded',
    severity: 'error',
    mateName: mate.name,
    partA,
    partB,
    message: `Joint '${mate.name}' (${mate.type}) ${kind}=${observed.toFixed(2)}${unit} exceeds maxLoad.${kind}=${declared}${unit}.`,
    hint:
      `invalid-args.assembly.joint-load-exceeded — joint '${mate.name}' (${mate.type}) ` +
      `declared maxLoad.${kind}=${declared}${unit}; applied ${kind}=${observed.toFixed(2)}${unit} ` +
      `from externalLoads exceeds capacity by ${delta.toFixed(2)}${unit}. Increase maxLoad on ` +
      `this joint, reduce externalLoads on '${partA}'/'${partB}', or split the load path with ` +
      `an additional joint.`,
  };
}

function makeTopologyDeferredDiag(
  mate: MateRecord,
  partName: string,
  connectorName: string,
  side: 'a' | 'b',
): ValidatorDiagnostic {
  // Info severity — this is a documented v0.7.x deferral, not an error
  // in the agent's input. The mate's load summation is silently skipped
  // when either side is topology-bound; this note tells the agent why
  // the gate didn't fire on a `maxLoad`-tagged mate.
  return {
    code: 'assembly.joint.load-exceeded',
    severity: 'info',
    mateName: mate.name,
    ...(side === 'a' ? { partA: partName } : { partB: partName }),
    message:
      `Mate '${mate.name}' (${mate.type}) side '${partName}.${connectorName}': ` +
      `topology connector origin not supported by Gate 3 in v0.7.4; load capacity check skipped for this side.`,
    hint:
      `invalid-args.assembly.joint-load-exceeded — mate '${mate.name}' (${mate.type}) ` +
      `side '${partName}.${connectorName}' uses a topology connector origin; v0.7.4 joint-load ` +
      `capacity only gates vec3-origin connectors. Switch the connector origin to ` +
      `{ kind: 'vec3', value: [x, y, z] } to enable the gate on this side, or accept that ` +
      `this mate is ungated.`,
  };
}

