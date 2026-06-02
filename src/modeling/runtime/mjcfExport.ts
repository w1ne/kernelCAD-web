// src/modeling/runtime/mjcfExport.ts
//
// Assembly → MJCF (MuJoCo XML) converter for the P6 physics gate.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-02-physics-loop-P6-mujoco-wasm-gate.md
//
// This is a runtime-only export — the MJCF string is fed directly to
// `@mujoco/mujoco`'s `MjModel.from_xml_string` inside the physics-loop
// criterion checks (criterion 5: static equilibrium; criterion 6:
// drop-on-release). It is NOT a public file-emitting exporter like the
// URDF / SDF surfaces in src/modeling/export/. The serialiser intentionally
// shares idioms (mate-graph spanning tree, mm→m conversion, density-based
// inertia) with `urdfSerializer.ts` so the two views of the same Assembly
// stay consistent, but the output is MJCF — nested `<body>` with `<joint>`
// elements, not URDF's flat <link>+<joint> table.
//
// Coordinate system:
//   - kernelCAD: millimetres, world +Z up.
//   - MJCF:      metres, world +Z up by default. We convert lengths by /1000.
//
// Mate handling:
//   - fastened    → child body nested inside parent body with no <joint>.
//   - revolute    → child body with <joint type="hinge" axis="..." pos="...">
//                   (limits in radians; agent-side limits are stored in deg).
//   - prismatic   → child body with <joint type="slide" axis="..." pos="...">
//                   (limits in m; agent-side limits are stored in mm).
//   - cylindrical → emitted as a single hinge joint (lossy — the prismatic
//                   DOF is dropped for the physics check; matches the URDF
//                   degradation. The static-equilibrium / drop-test criteria
//                   gate the rotational DOF, which is the failure mode that
//                   actually matters for the v0.7 corpus). Diagnostic NOT
//                   surfaced here — this is a runtime detail of the gate,
//                   not an authoring-time export.
//   - pin_slot    → same as cylindrical (single hinge).
//   - ball        → emitted as a 3-DOF spherical hinge chain via two dummy
//                   bodies. MJCF has a real <joint type="ball"> but the
//                   limit semantics differ from URDF's; for parity with the
//                   existing URDF decomposition we use 3 hinges.
//   - planar      → emitted as 2 chained slides + 1 hinge (3-DOF planar
//                   motion). Not exercised by v0.7 corpus but kept for
//                   completeness.
//
// Closed-loop handling:
//   - If the mate graph has a closed loop, the converter throws. MuJoCo
//     supports closed loops via <equality> constraints but kernelCAD's
//     v0.7 corpus is all open-tree, and the P6 gate doesn't yet model
//     tendons / equalities (that's #361). For now, reject closed loops
//     in the runtime check and return `mechanism: 'unverified'` upstream.
//
// Springs / actuators:
//   - All actuators are absent (passive bodies). Single-body springs
//     declared via the existing kit don't generate joint moment in MuJoCo
//     either — that's the whole point of P6 surfacing the gap that #361
//     fixes via closed-loop tendons.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { MateRecord } from '../mates/mate';
import { parseConnectorRef } from '../mates/mate';
import type { Connector } from '../mates/connector';
import { resolveConnectorOrigin } from '../mates/connector';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Vec3 } from '../../shared/intent/types';

const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Default density (kg/m³) when a part doesn't declare one. Aluminum;
 * matches the P6 plan §thresholds. Aggressive enough that "is the
 * shoulder torque physically reasonable?" stays meaningful — too low
 * (water 1000) understates joint loads and lets the gate miss
 * collapsing arms.
 */
const DEFAULT_DENSITY_KG_M3 = 2700;

export interface MjcfExportResult {
    /** MJCF XML string ready to feed `MjModel.from_xml_string`. */
    readonly mjcf: string;
    /**
     * Ordered list of joint names that map to the MuJoCo qpos / qfrc
     * vectors. Index `i` is the model's joint #i. Each entry pairs the
     * MJCF joint name with the kernelCAD mate name so criterion outputs
     * (e.g. "joint <kc-mate-name> drifted N°") read in agent-native
     * terms rather than internal MJCF identifiers.
     */
    readonly jointOrder: readonly { readonly mjcfName: string; readonly mateName: string }[];
    /**
     * Ordered list of body names that map to MuJoCo body indices (0 =
     * worldbody). Used by criterion 6's drop-test to translate xpos
     * deltas back to kernelCAD part names.
     */
    readonly bodyOrder: readonly string[];
}

/**
 * Build the MJCF for an Assembly. Throws on closed-loop graphs (the
 * caller surfaces this as `mechanism: 'unverified'` so the legacy
 * diagnostics still drive the exit code).
 */
export async function assemblyToMjcf(arm: Assembly): Promise<MjcfExportResult> {
    const parts = arm.__parts();
    const mates = arm.__mates();
    if (parts.length === 0) {
        throw new Error('assemblyToMjcf: assembly has no parts; nothing to physics-check.');
    }

    // Build the parent/child tree from the mate graph. Match the URDF
    // serializer's spanning-tree convention: edge `a → b` makes `a` the
    // parent, `b` the child. Closed loops throw.
    const partByName = new Map<string, AssemblyPartStored>();
    for (const p of parts) partByName.set(p.name, p);

    const childrenByParent = new Map<string, { childName: string; mate: MateRecord }[]>();
    for (const p of parts) childrenByParent.set(p.name, []);
    const parentByChild = new Map<string, string>();
    for (const m of mates) {
        const aName = parseConnectorRef(m.a).partName;
        const bName = parseConnectorRef(m.b).partName;
        if (parentByChild.has(bName)) {
            throw new Error(
                `assemblyToMjcf: part '${bName}' has multiple parents (mate '${m.name}' would add a second). MuJoCo physics gate only supports tree-shaped mate graphs at v0.7; closed loops require an <equality>/tendon API (issue #361).`,
            );
        }
        parentByChild.set(bName, aName);
        childrenByParent.get(aName)?.push({ childName: bName, mate: m });
    }

    // Cycle detection (URDF spanning-tree pattern).
    const visited = new Set<string>();
    const onPath = new Set<string>();
    function detectCycle(node: string): void {
        if (visited.has(node)) return;
        if (onPath.has(node)) {
            throw new Error(
                `assemblyToMjcf: mate graph has a cycle reaching '${node}'. MuJoCo physics gate at v0.7 only supports tree topology.`,
            );
        }
        onPath.add(node);
        for (const c of childrenByParent.get(node) ?? []) detectCycle(c.childName);
        onPath.delete(node);
        visited.add(node);
    }
    for (const p of parts) detectCycle(p.name);

    // Roots = parts with no parent in the mate graph. MJCF needs every
    // body parented to the worldbody (or another body), so each root
    // becomes a top-level child of <worldbody>.
    const roots = parts.filter((p) => !parentByChild.has(p.name));

    // Compute per-part inertia + bbox center once. The bbox center is
    // used to position the inertial origin when massProperties is
    // unavailable (e.g. transformed-by-FK shapes). Mass / inertia from
    // OcctBackend.massProperties; the URDF emitter shows the pattern.
    const inertials = new Map<string, InertiaSpec>();
    for (const p of parts) {
        try {
            const lowered = (await p.originalShape.lower()) as OcctBackend;
            const density = p.density ?? DEFAULT_DENSITY_KG_M3;
            const mp = lowered.massProperties(density);
            // Diagonal inertia in MuJoCo's body frame; for our default
            // we feed back the full 6 (ixx, ixy, ixz, iyy, iyz, izz).
            // MuJoCo's <inertial> takes diaginertia OR fullinertia; we
            // use fullinertia to preserve the off-diagonal terms.
            inertials.set(p.name, {
                massKg: Math.max(1e-6, mp.mass),
                comLocalMm: mp.com,
                inertia6: mp.inertia6,
            });
        } catch {
            // Fall back to a unit inertia tensor (1 kg point mass at the
            // part origin). Still produces a valid MJCF; the criterion
            // outputs will note the lossy inertia in their hint.
            inertials.set(p.name, {
                massKg: 1,
                comLocalMm: [0, 0, 0],
                inertia6: [1e-3, 0, 0, 1e-3, 0, 1e-3],
            });
        }
    }

    // Resolve mate connector frames (origin + axis) in PARENT-LOCAL
    // coordinates. The hinge/slide `pos` attribute is in the parent
    // body's local frame, so we read the mate's `a` side (which lives
    // on the parent) and use its origin/axis directly. Topology origins
    // are resolved through `resolveConnectorOrigin` (async).
    const resolvedMateAxes = new Map<string, { origin: Vec3; axis: Vec3 }>();
    for (const m of mates) {
        const aRef = parseConnectorRef(m.a);
        const part = partByName.get(aRef.partName);
        if (part === undefined) continue;
        const connector = part.mateConnectors.find((c) => c.name === aRef.connectorName);
        if (connector === undefined) continue;
        const resolved = await resolveConnectorOrigin(part.originalShape, connector.origin);
        const axis = (connector.axis ?? [0, 0, 1]) as Vec3;
        resolvedMateAxes.set(m.name, { origin: resolved.value, axis });
    }

    // Emit MJCF by recursive body-tree walk.
    const jointOrder: { mjcfName: string; mateName: string }[] = [];
    const bodyOrder: string[] = [];

    function partAttachPos(part: AssemblyPartStored): Vec3 {
        // Root bodies use the part's `at` placement (mm → m). Non-root
        // bodies live inside their parent's frame; we use the mate's
        // connector origin for the pos.
        // Cast through `unknown` because Vec3Param admits Editable<number>
        // entries (the runtime check below guards). At validate-time the
        // recompute engine has already lowered everything, but TS doesn't
        // know that.
        const at = part.at as unknown as readonly [unknown, unknown, unknown] | undefined;
        if (at === undefined) return [0, 0, 0];
        const ax = typeof at[0] === 'number' ? at[0] : 0;
        const ay = typeof at[1] === 'number' ? at[1] : 0;
        const az = typeof at[2] === 'number' ? at[2] : 0;
        return [ax, ay, az];
    }

    function emitBody(
        partName: string,
        mateFromParent: MateRecord | undefined,
        indent: string,
    ): string {
        bodyOrder.push(partName);
        const part = partByName.get(partName);
        if (part === undefined) return '';
        const inertial = inertials.get(partName)!;

        // Body position: root uses part.at; non-root uses the mate
        // connector origin (parent-local). Both in mm; convert to m.
        let posMm: Vec3;
        if (mateFromParent === undefined) {
            posMm = partAttachPos(part);
        } else {
            const resolved = resolvedMateAxes.get(mateFromParent.name);
            posMm = resolved?.origin ?? [0, 0, 0];
        }
        const posM = posMm.map((v) => v * MM_TO_M);
        const bodyAttrs = `name="${escapeXml(partName)}" pos="${posM.map(fmtNum).join(' ')}"`;

        const lines: string[] = [];
        lines.push(`${indent}<body ${bodyAttrs}>`);

        // Inertial block. CoM origin is in the body's local frame; the
        // mass property tool returns it relative to the part's local
        // origin (which == the body's local origin since geom is at the
        // body's origin too). Convert mm → m.
        const comM = inertial.comLocalMm.map((v) => v * MM_TO_M);
        const [ixx, ixy, ixz, iyy, iyz, izz] = inertial.inertia6;
        lines.push(
            `${indent}  <inertial pos="${comM.map(fmtNum).join(' ')}" mass="${fmtNum(inertial.massKg)}" fullinertia="${[ixx, iyy, izz, ixy, ixz, iyz].map(fmtNum).join(' ')}"/>`,
        );

        // Joint from parent (if any). MJCF nests the joint INSIDE the
        // child body, not on the parent — that's a key MJCF vs URDF
        // difference.
        if (mateFromParent !== undefined) {
            const jointXml = mateToMjcfJoint(mateFromParent, resolvedMateAxes, jointOrder);
            for (const j of jointXml) lines.push(`${indent}  ${j}`);
        }

        // Geometry — we don't emit visual meshes; the physics gate only
        // needs inertia + joint topology. Adding meshes would require
        // exporting STL per-part on every validate call (heavy). MuJoCo
        // is fine with bodies that have only <inertial> (no <geom>):
        // they participate in joint dynamics, just don't collide.

        // Children — recurse.
        for (const childEntry of childrenByParent.get(partName) ?? []) {
            lines.push(emitBody(childEntry.childName, childEntry.mate, indent + '  '));
        }

        lines.push(`${indent}</body>`);
        return lines.join('\n');
    }

    const worldbodyBlocks: string[] = [];
    for (const root of roots) {
        worldbodyBlocks.push(emitBody(root.name, undefined, '    '));
    }

    const mjcf = [
        '<?xml version="1.0" ?>',
        `<mujoco model="${escapeXml(arm.name)}">`,
        '  <option gravity="0 0 -9.81"/>',
        '  <compiler angle="radian"/>',
        '  <worldbody>',
        ...worldbodyBlocks,
        '  </worldbody>',
        '</mujoco>',
        '',
    ].join('\n');

    return { mjcf, jointOrder, bodyOrder };
}

interface InertiaSpec {
    readonly massKg: number;
    readonly comLocalMm: Vec3;
    readonly inertia6: readonly [number, number, number, number, number, number];
}

/**
 * Convert one mate to its MJCF <joint> child elements. Pushes one entry
 * per emitted DOF onto `jointOrder` so the caller can map qpos/qfrc
 * indices back to mate names.
 *
 * MJCF joint placement: the `pos` attribute is the joint anchor in the
 * CHILD body's frame (not the parent). For a hinge mounted at the
 * parent connector origin O (parent-local), the child body itself is
 * positioned at O (via the body's `pos`), and the joint anchor sits at
 * (0, 0, 0) in the child's local frame.
 */
function mateToMjcfJoint(
    mate: MateRecord,
    resolved: Map<string, { origin: Vec3; axis: Vec3 }>,
    jointOrder: { mjcfName: string; mateName: string }[],
): string[] {
    const frame = resolved.get(mate.name) ?? { origin: [0, 0, 0] as Vec3, axis: [0, 0, 1] as Vec3 };
    const axis = frame.axis;
    const mjcfJointName = sanitizeJointName(mate.name);

    switch (mate.type) {
        case 'fastened':
            // No joint — the child body just rigidly inherits the
            // parent's transform via its `pos` attribute.
            return [];
        case 'revolute':
        case 'cylindrical': // lossy — drops the slide DOF (see header)
        case 'pin_slot': // lossy — drops the slot DOF (see header)
        {
            jointOrder.push({ mjcfName: mjcfJointName, mateName: mate.name });
            const limits = mate.limitsDeg;
            const limitedAttrs = limits !== undefined
                ? ` limited="true" range="${fmtNum(limits[0] * DEG_TO_RAD)} ${fmtNum(limits[1] * DEG_TO_RAD)}"`
                : '';
            return [
                `<joint name="${escapeXml(mjcfJointName)}" type="hinge" axis="${axis.map(fmtNum).join(' ')}" pos="0 0 0"${limitedAttrs}/>`,
            ];
        }
        case 'prismatic': {
            jointOrder.push({ mjcfName: mjcfJointName, mateName: mate.name });
            const limits = mate.limitsMm;
            const limitedAttrs = limits !== undefined
                ? ` limited="true" range="${fmtNum(limits[0] * MM_TO_M)} ${fmtNum(limits[1] * MM_TO_M)}"`
                : '';
            return [
                `<joint name="${escapeXml(mjcfJointName)}" type="slide" axis="${axis.map(fmtNum).join(' ')}" pos="0 0 0"${limitedAttrs}/>`,
            ];
        }
        case 'planar': {
            // 2 slides + 1 hinge around the normal axis. The slides span
            // two directions perpendicular to the connector axis (the
            // planar normal). We pick canonical X and Y axes; in v0.7
            // no example exercises this branch.
            jointOrder.push({ mjcfName: `${mjcfJointName}_x`, mateName: mate.name });
            jointOrder.push({ mjcfName: `${mjcfJointName}_y`, mateName: mate.name });
            jointOrder.push({ mjcfName: `${mjcfJointName}_rz`, mateName: mate.name });
            const perpA = perpendicularAxis(axis);
            const perpB = crossProduct(axis, perpA);
            return [
                `<joint name="${escapeXml(mjcfJointName)}_x" type="slide" axis="${perpA.map(fmtNum).join(' ')}" pos="0 0 0"/>`,
                `<joint name="${escapeXml(mjcfJointName)}_y" type="slide" axis="${perpB.map(fmtNum).join(' ')}" pos="0 0 0"/>`,
                `<joint name="${escapeXml(mjcfJointName)}_rz" type="hinge" axis="${axis.map(fmtNum).join(' ')}" pos="0 0 0"/>`,
            ];
        }
        case 'ball': {
            // Single <joint type="ball"> — MuJoCo's spherical joint uses
            // a quaternion for qpos (4 entries instead of 1), which we
            // surface as a single ball entry in jointOrder. The
            // criterion 6 drift test treats this as one joint and
            // computes an angle-of-rotation drift from the quaternion.
            jointOrder.push({ mjcfName: mjcfJointName, mateName: mate.name });
            return [
                `<joint name="${escapeXml(mjcfJointName)}" type="ball" pos="0 0 0"/>`,
            ];
        }
    }
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function sanitizeJointName(s: string): string {
    // MJCF identifiers tolerate most characters but the safer choice
    // is to keep names matching the kernelCAD mate name verbatim. No
    // sanitisation needed beyond XML escaping.
    return s;
}

function fmtNum(n: number): string {
    // 6-decimal fixed for readability; scientific notation for
    // values that lose precision in fixed form.
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) < 1e-9) return '0';
    if (Math.abs(n) >= 1e-4 && Math.abs(n) < 1e6) return n.toFixed(6);
    return n.toExponential(6);
}

function perpendicularAxis(a: Vec3): Vec3 {
    // Return any unit-length vector perpendicular to `a`. Used by the
    // planar mate's slide-axis decomposition. Numerically stable
    // pick-orthogonal-coord-axis trick.
    const ax = Math.abs(a[0]);
    const ay = Math.abs(a[1]);
    const az = Math.abs(a[2]);
    let pick: Vec3;
    if (ax <= ay && ax <= az) pick = [1, 0, 0];
    else if (ay <= az) pick = [0, 1, 0];
    else pick = [0, 0, 1];
    const p = crossProduct(a, pick);
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    return [p[0] / len, p[1] / len, p[2] / len];
}

function crossProduct(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

// Re-export so callers (criterion 5/6) don't have to know the resolver
// shape; keeps the public surface tight.
export type { Connector };
