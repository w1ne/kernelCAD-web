// src/studio/components/viewer/entities/tendonTransform.ts
//
// P7 — pure geometry for the Studio tendon renderer. Given two
// world-frame endpoints, compute the transform that places a unit-tall
// `CylinderGeometry` (+Y aligned) so it spans from `from` to `to`. The
// renderer wraps this with a React-three component (`TendonRenderer.tsx`)
// that reads endpoints from the per-part FK transforms exposed by
// GeometryContext; this module's interfaces stay framework-agnostic so
// the unit test below runs without an R3F harness.

import * as THREE from 'three';
import type { Vec3 } from '../../../../shared/intent/types';

/**
 * Result of `tendonTransform`. The caller assigns these onto a
 * `THREE.Mesh` (or React-three's equivalent props) to place a
 * unit-length +Y cylinder spanning the two endpoints.
 */
export interface TendonMeshTransform {
    /** Cylinder midpoint, world frame. */
    readonly position: THREE.Vector3;
    /** Rotation from +Y to (to − from)/‖to − from‖. */
    readonly quaternion: THREE.Quaternion;
    /**
     * Scale the unit cylinder by:
     *   - x, z: visualDiameter (the radii input is unit; scale stretches it)
     *   - y:    endpoint-to-endpoint distance
     */
    readonly scale: THREE.Vector3;
    /** Endpoint distance in world units (mm), surfaced for diagnostics. */
    readonly lengthMm: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Compute the transform for a tendon cylinder spanning `fromWorld` →
 * `toWorld`. The base geometry is assumed to be `CylinderGeometry(1, 1,
 * 1, 16)` — a unit-radius, unit-tall cylinder along +Y.
 *
 * Degenerate cases:
 *   - Zero-length tendon (from == to): scale.y = 0; the cylinder
 *     collapses to a disc. The renderer can choose to skip-render or
 *     accept the degenerate mesh; we don't throw because tendons are
 *     visualisation, not semantics.
 *   - Endpoints colinear with -Y (pointing straight down): the standard
 *     `setFromUnitVectors` returns a 180° rotation; we use the X axis
 *     as the rotation pivot.
 */
export function tendonTransform(
    fromWorld: Vec3,
    toWorld: Vec3,
    visualDiameterMm: number,
): TendonMeshTransform {
    const from = new THREE.Vector3(fromWorld[0], fromWorld[1], fromWorld[2]);
    const to = new THREE.Vector3(toWorld[0], toWorld[1], toWorld[2]);
    const delta = new THREE.Vector3().subVectors(to, from);
    const lengthMm = delta.length();
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion();
    if (lengthMm > 0) {
        const dir = delta.clone().multiplyScalar(1 / lengthMm);
        quaternion.setFromUnitVectors(Y_AXIS, dir);
    }
    // Cylinder is unit-radius (R=1) on X/Z; scaling by half-diameter
    // makes it match the requested visual diameter exactly.
    const radiusScale = visualDiameterMm / 2;
    const scale = new THREE.Vector3(radiusScale, lengthMm, radiusScale);
    return { position: midpoint, quaternion, scale, lengthMm };
}

// P10 — the helix polyline helper is shared with the CLI featureMeshing
// path so Studio + CLI render the same coil. Re-exported here to keep the
// Studio import surface stable.
export { helixPolyline, helixPolylineRouted, HELIX_SAMPLES_PER_TURN } from '../../../../modeling/mates/helixPolyline';

/**
 * Apply a per-part world transform (column-major 4×4) to a point in
 * that part's local frame. Used to map the connector's local-mm origin
 * to its current world-mm position under FK.
 *
 * `transform4x4` is the same shape as `GeometryResult.transform`
 * (column-major, length 16). Returns a Vec3 in world coordinates (mm).
 */
export function applyTransform(transform4x4: readonly number[], local: Vec3): Vec3 {
    const m = transform4x4;
    // column-major: m[0..3] = col0, m[4..7] = col1, m[8..11] = col2, m[12..15] = col3.
    const lx = local[0];
    const ly = local[1];
    const lz = local[2];
    const wx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
    const wy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
    const wz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
    return [wx, wy, wz];
}
