// src/modeling/mates/tendon.ts
//
// P7 — closed-loop balance-spring primitive. A tendon is a passive spring
// that spans TWO connectors on DIFFERENT parts; under gravity (or any
// applied force) it produces a restoring moment around the joint(s)
// between those connectors. Implemented at solve / export time as a
// MuJoCo `<tendon><spatial>` — the connector frames become MJCF `<site>`
// elements on their owning bodies, and the spatial tendon's stiffness +
// rest length apply the spring force.
//
// kernelCAD's spanning-tree FK still treats every part as singly-rooted;
// the tendon is a FORCE constraint, not a kinematic one. The capture
// surface is intentionally minimal — two endpoints, rest length,
// stiffness, optional damping. No pulleys (3+ sites), no actuators, no
// contact wrapping (those are post-P7 slices).
//
// Why this lives next to `mate.ts`:
//   - Same `<partName>.<connectorName>` ref grammar (uses `parseConnectorRef`).
//   - Same Assembly-record shape: capture-time validation + `__tendons()`
//     read-side accessor mirroring `__mates()`.
//   - The MJCF emitter (`runtime/mjcfExport.ts`) reads both arrays from
//     the same Assembly handle.

/**
 * Capture-time record. Mirrors `MateRecord` for ergonomics — Assembly
 * stores an array of these and surfaces via `__tendons()`. Unlike
 * mates the two endpoints don't have a parent / child relationship —
 * the order of `from` / `to` is for the agent's reading convenience
 * only; physically the spring pulls each endpoint toward the other
 * symmetrically.
 */
import type { Vec3 } from '../../shared/intent/types';

/**
 * P11 Slice 2 — a named collision-OFF cylinder declared on a Part for
 * tendon cable routing. Emitted as `<geom type="cylinder" contype="0"
 * conaffinity="0">` so it never generates body-body contacts; it serves
 * only as a wrap rail the solver routes a `<spatial>` tendon around, so a
 * balance spring physically rides over the arm instead of cutting
 * through it. Axis / origin are part-local; converted mm→m at emit.
 */
export interface WrapGeomRecord {
    /** Unique within its owning part. Surfaced in the MJCF geom name. */
    readonly name: string;
    /** Part-local cylinder axis direction (need not be unit length). */
    readonly axis: Vec3;
    /** Part-local cylinder centre. */
    readonly origin: Vec3;
    /** Cylinder radius (mm). > 0. */
    readonly radiusMm: number;
    /** Half-length (mm) along `axis`. Undefined = MuJoCo-infinite cylinder;
     *  the emitter substitutes a large finite half-length for `fromto`. */
    readonly halfLengthMm?: number;
}

/** Agent-facing options for `part.wrapGeom(name, opts)`. */
export interface WrapGeomOptions {
    readonly axis: readonly [number, number, number];
    readonly origin?: readonly [number, number, number];
    readonly radius: number;
    readonly halfLengthMm?: number;
}

/**
 * One wrap-geom reference inside a tendon's `wrapGeoms` array. `partName`
 * + `wrapName` name a `WrapGeomRecord` the cable routes around, in array
 * order between the two endpoints. `sidesite` (part-local) forces which
 * side of the cylinder the cable passes; omit to let MuJoCo pick.
 */
export interface TendonWrapRef {
    readonly partName: string;
    readonly wrapName: string;
    readonly sidesite?: readonly [number, number, number];
}

export interface TendonRecord {
    /** Unique tendon name. Surfaced in diagnostics + MJCF site / spatial
     *  identifiers. */
    readonly name: string;
    /** "<partName>.<connectorName>" — first endpoint. The named
     *  connector must already be declared on the named part. */
    readonly from: string;
    /** "<partName>.<connectorName>" — second endpoint. */
    readonly to: string;
    /** Resting length of the spring (mm). Spring force is zero when the
     *  endpoint-to-endpoint distance equals this. >0. */
    readonly restLengthMm: number;
    /** Spring stiffness (N/mm). MJCF emits this as N/m (×1000). >0. */
    readonly stiffnessNmm: number;
    /** Optional viscous damping (N·s/mm). MJCF emits this as N·s/m
     *  (×1000). >=0; defaults to 0. */
    readonly dampingNsmm: number;
    /** Visual cylinder / coil diameter (mm) for Studio rendering. For
     *  `visualStyle: 'line'` this is the cylinder diameter; for
     *  `visualStyle: 'coil'` this is the helix WIRE diameter (the tube
     *  sweep radius is half of this). Defaults to 3 mm if not set by the
     *  agent. >0. */
    readonly visualDiameterMm: number;
    /** P10: visual style. `'line'` (default) renders a straight cylinder
     *  spanning the two endpoints — the v1 PR #368 behavior. `'coil'`
     *  renders an Anglepoise-style helical spring whose centerline is the
     *  AB line and whose wire sweeps around at radius `coilDiameterMm/2`. */
    readonly visualStyle: 'line' | 'coil';
    /** P10: number of full turns along the AB span when `visualStyle ===
     *  'coil'`. Ignored for `'line'`. Must be >= 1. Defaults to 10. */
    readonly coilTurns: number;
    /** P10: outer DIAMETER of the helix (mm) when `visualStyle ===
     *  'coil'`. The wire centerline sits on a cylinder of radius
     *  `coilDiameterMm/2` around the AB line. Ignored for `'line'`. Must
     *  satisfy `coilDiameterMm > 2 * visualDiameterMm` (i.e. the wire
     *  fits inside the coil). Defaults to 7. */
    readonly coilDiameterMm: number;
    /** P11 Slice 2 — ordered wrap-geom rails the cable routes around
     *  between its two endpoints. Empty for a straight `<spatial>` tendon
     *  (the pre-Slice-2 behavior). */
    readonly wrapGeoms: readonly TendonWrapRef[];
}

/**
 * Agent-facing options for `arm.tendon(name, opts)`. `dampingNsmm` and
 * `visualDiameterMm` are optional and default to 0 / 3 respectively.
 * `visualStyle`, `coilTurns`, `coilDiameterMm` are optional and default
 * to `'line'`, 10, 7 — see field docs on `TendonRecord` for semantics.
 */
export interface TendonOptions {
    readonly from: string;
    readonly to: string;
    readonly restLengthMm: number;
    readonly stiffnessNmm: number;
    readonly dampingNsmm?: number;
    readonly visualDiameterMm?: number;
    readonly visualStyle?: 'line' | 'coil';
    readonly coilTurns?: number;
    readonly coilDiameterMm?: number;
    /** P11 Slice 2 — wrap-geom rails (in routing order) the cable passes.
     *  Each entry names a `WrapGeomRecord` declared via `part.wrapGeom(...)`
     *  on a part the tendon passes. Omit for a straight tendon. */
    readonly wrapGeoms?: ReadonlyArray<{
        readonly partName: string;
        readonly wrapName: string;
        readonly sidesite?: readonly [number, number, number];
    }>;
}

/** Default visual diameter (mm) used when the agent doesn't pass one. */
export const TENDON_DEFAULT_VISUAL_DIAMETER_MM = 3;
/** Default visual style — the v1 thin-cylinder render. */
export const TENDON_DEFAULT_VISUAL_STYLE: 'line' | 'coil' = 'line';
/** Default coil turn count when `visualStyle: 'coil'` is opted into without
 *  an explicit `coilTurns`. 10 turns reads as iconic Anglepoise without
 *  being so dense that the per-turn segments blur into a solid cylinder. */
export const TENDON_DEFAULT_COIL_TURNS = 10;
/** Default coil outer diameter (mm) when `visualStyle: 'coil'` is opted
 *  into without an explicit `coilDiameterMm`. Sized so a default 3 mm
 *  wire fits inside (the validation rule `coilDiameter > 2 * wireDiameter`
 *  holds for the defaults: 7 > 6). */
export const TENDON_DEFAULT_COIL_DIAMETER_MM = 7;
