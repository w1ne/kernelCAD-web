// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/joints/types.ts
//
// G1 — `joint.clevis(...)` constructive primitive (mechanism delivery slice).
//
// Public types for the clevis-joint geometry primitive. A clevis joint is the
// canonical hand-rolled revolute-joint hardware: two fork plates on the
// parent, one tongue on the child, a pin drilled through both knuckles. This
// module provides a one-call primitive that emits both pieces of geometry AND
// the two connector specs needed to wire a `revolute` mate — by construction
// guaranteeing knuckle alignment, bridge tabs outside the tongue's swing
// envelope, a single one-pass through-hole, and a proud-cap pin.

import type { Shape } from '../capture/proxy';
import type { Vec3 } from '../../shared/intent/types';

/** Cardinal axis hint accepted by `joint.clevis({ axis })`.
 *  `'X' | 'Y' | 'Z'` are shorthand for `[1, 0, 0]` / `[0, 1, 0]` / `[0, 0, 1]`.
 *  A `Vec3` is normalized internally — caller does not need to pre-normalize. */
export type AxisHint = Vec3 | 'X' | 'Y' | 'Z';

/**
 * Style overrides — all fields optional. Unspecified fields fall back to
 * scale-derived defaults (see `withDefaults` in `clevis.ts`).
 *
 * All dimensions are millimetres.
 *
 *  - `knuckleR`: radius of the knuckle (rounded plate corner) at the pivot
 *  - `forkGapY`: distance between inner faces of the two fork plates; when
 *      omitted, `tongueY + 0.65 * knuckleR` leaves visible running clearance
 *  - `tongueY`: tongue plate thickness (must be < forkGapY so it slips in)
 *  - `plateT`: thickness of each fork plate
 *  - `pinR`: pin shaft radius
 *  - `pinCapR`: pin-cap (bolt-head) radius; projects beyond outer fork face
 *  - `pinCapThickness`: cap thickness; if absent, derived so both caps
 *      project by at least one shaft radius past the fork plates
 *  - `holeClearance`: extra radius added to the drilled-through hole so the
 *      pin shaft slips through without an interference fit (default 0.2 mm)
 */
export interface ClevisStyle {
  knuckleR?: number;
  forkGapY?: number;
  tongueY?: number;
  plateT?: number;
  pinR?: number;
  pinCapR?: number;
  pinCapThickness?: number;
  holeClearance?: number;
  /** Optional PBR material applied to the fork plates (parent side). */
  forkMaterial?: { baseColor: string; metalness?: number; roughness?: number };
  /** Optional PBR material applied to the tongue (child side). */
  tongueMaterial?: { baseColor: string; metalness?: number; roughness?: number };
  /** Optional PBR material applied to the pin shaft + caps. */
  pinMaterial?: { baseColor: string; metalness?: number; roughness?: number };
}

/** Resolved style — every field non-optional. Returned by `withDefaults`. */
export interface ResolvedClevisStyle {
  knuckleR: number;
  forkGapY: number;
  tongueY: number;
  plateT: number;
  pinR: number;
  pinCapR: number;
  pinCapThickness: number;
  holeClearance: number;
  forkMaterial?: { baseColor: string; metalness?: number; roughness?: number };
  tongueMaterial?: { baseColor: string; metalness?: number; roughness?: number };
  pinMaterial?: { baseColor: string; metalness?: number; roughness?: number };
}

/** Engineering strength evidence. This is intentionally separate from PBR
 * material and part density; neither visual appearance nor mass proves
 * structural capacity. */
export interface StructuralMaterial {
  readonly name: string;
  readonly model: 'isotropic-ductile';
  readonly yieldStrengthMPa: number;
  readonly bearingStrengthMPa: number;
  readonly shearStrengthMPa?: number;
}

export interface ClevisEngineeringMaterials {
  readonly pin: StructuralMaterial;
  readonly fork: StructuralMaterial;
  readonly tongue: StructuralMaterial;
}

/** Nominal double-shear clevis dimensions emitted by joint.clevis from the
 * same resolved style that constructs the geometry. */
export interface ClevisStructuralModel {
  readonly kind: 'clevis-double-shear-v1';
  readonly source: 'joint.clevis';
  readonly pinDiameterMm: number;
  readonly boreDiameterMm: number;
  readonly forkPlateThicknessMm: number;
  readonly forkPlateCount: 2;
  readonly tongueThicknessMm: number;
  readonly forkGapMm: number;
  readonly supportSpanMm: number;
  readonly edgeDistanceMm: number;
  readonly materials?: ClevisEngineeringMaterials;
}

/**
 * Connector spec returned by `joint.clevis(...)`. Each side carries the
 * `origin` in its OWN PART-LOCAL FRAME (URDF/MuJoCo convention) plus a shared
 * `axis` aligned with the pin shaft.
 *
 * The caller uses these to register `type: 'axis'` connectors on each part
 * and to declare the `revolute` mate:
 *
 * ```ts
 * basePart.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: cl.parentConnector.origin }, axis: cl.parentConnector.axis });
 * lowerPart.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: cl.childConnector.origin }, axis: cl.childConnector.axis });
 * arm.mate('shoulder', 'base.shoulder', 'lower-arm.shoulder', 'revolute', { ... });
 * ```
 */
export interface ClevisConnectorSpec {
  /** Connector origin in the owning part's local frame. */
  origin: Vec3;
  /** Pin-axis direction in the owning part's local frame. */
  axis: Vec3;
  /** Pin clearance-bore radius (mm) at this pivot = `pinR + holeClearance`.
   *  Pass through to `part.connector(name, { ..., jointClearanceRadius })` so
   *  the criterion-7 joint-mesh-gap gate accepts the drilled clearance bore
   *  (the pivot point sits in air, with solid knuckle at the bore wall). */
  clearanceRadius: number;
}

/**
 * Options for `joint.clevis({...})`.
 *
 *  - `parentBody`: existing parent geometry (will have fork + drilled hole + pin unioned/subtracted into it)
 *  - `childBody`: existing child geometry (will have tongue + drilled hole unioned/subtracted into it)
 *  - `axis`: pin axis (in parent-local AND child-local frame; they coincide at the pivot)
 *  - `pivotParent`: pivot point in PARENT-local frame (the on-axis through-hole center)
 *  - `pivotChild`: pivot point in CHILD-local frame; defaults to the part-local origin
 *  - `limitsDeg`: revolute joint limits (degrees) used to compute the pivot
 *      lift — the tongue's swept arc must stay clear of the parent body
 *  - `style`: optional overrides for the scale-derived defaults
 *  - `liftPivot`: when true (default), lift the pivot ALONG `liftDir` so the
 *      tongue's swept arc cannot intrude into the parent body. When false the
 *      pivot stays at the supplied coordinates.
 *  - `liftDir`: direction along which to lift the pivot away from the parent
 *      body. Defaults to `+Z` (toward the sky). For a wrist where the parent
 *      body sits to the +X side, set `liftDir: [-1, 0, 0]` to lift opposite.
 */
export interface ClevisJointOptions {
  parentBody: Shape;
  childBody: Shape;
  axis: AxisHint;
  pivotParent: Vec3;
  pivotChild?: Vec3;
  limitsDeg?: [number, number];
  style?: ClevisStyle;
  /** Optional engineering strength evidence copied into the returned
   * structural model. Visual style materials are never used as a fallback. */
  engineering?: ClevisEngineeringMaterials;
  liftPivot?: boolean;
  liftDir?: Vec3;
}

/**
 * Result of `joint.clevis(...)`.
 *
 *  - `parentGeometry`: the parent's body with the fork + bridge tabs unioned,
 *      the through-hole drilled, and the pin shaft + caps unioned.
 *  - `childGeometry`: the child's body with the tongue unioned and the
 *      matching through-hole drilled.
 *  - `parentConnector`: pivot origin (in parent-local frame) + axis. Wire
 *      into `part.connector(name, { type: 'axis', origin, axis })` and use
 *      the resulting ref as the `a` arg of `arm.mate(..., 'revolute', ...)`.
 *  - `childConnector`: pivot origin (in child-local frame) + axis. Same
 *      pattern; pass as the `b` arg of the revolute mate.
 *  - `pivot`: the LIFTED pivot in parent-local frame (after the
 *      `liftPivot`/`liftDir` math), surfaced so callers can place secondary
 *      hardware (spring anchors, witness marks) on the same axis.
 */
export interface ClevisJoint {
  parentGeometry: Shape;
  childGeometry: Shape;
  parentConnector: ClevisConnectorSpec;
  childConnector: ClevisConnectorSpec;
  pivot: Vec3;
  style: ResolvedClevisStyle;
  structural: ClevisStructuralModel;
}
