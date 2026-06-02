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
    /** Visual cylinder diameter (mm) for Studio rendering. The cylinder
     *  scales endpoint-to-endpoint; this is only the diameter. Defaults
     *  to 3 mm if not set by the agent. >0. */
    readonly visualDiameterMm: number;
}

/**
 * Agent-facing options for `arm.tendon(name, opts)`. `dampingNsmm` and
 * `visualDiameterMm` are optional and default to 0 / 3 respectively.
 */
export interface TendonOptions {
    readonly from: string;
    readonly to: string;
    readonly restLengthMm: number;
    readonly stiffnessNmm: number;
    readonly dampingNsmm?: number;
    readonly visualDiameterMm?: number;
}

/** Default visual diameter (mm) used when the agent doesn't pass one. */
export const TENDON_DEFAULT_VISUAL_DIAMETER_MM = 3;
