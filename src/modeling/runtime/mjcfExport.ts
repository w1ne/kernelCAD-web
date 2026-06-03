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
import type { TendonRecord } from '../mates/tendon';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Vec3 } from '../../shared/intent/types';
import { stlToMjcfMesh } from './stlToMjcfMesh';

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
    const tendons = arm.__tendons();
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

    // Compute per-part inertia + collision mesh once. The bbox center is
    // used to position the inertial origin when massProperties is
    // unavailable (e.g. transformed-by-FK shapes). Mass / inertia from
    // OcctBackend.massProperties; the URDF emitter shows the pattern.
    //
    // P11 Slice 1: also lower the part to its OCCT backend and pull a
    // binary-STL tessellation, formatted as an inline `<mesh vertex="...">`
    // string. Reuses `OcctBackend.exportSTLAsync()` (the same emitter the
    // URDF writer feeds into per-link STL files) so collision geom and
    // visual mesh stay byte-identical. Mesh-emission failures fall back
    // to "inertia only" with no geom — the part stays in the kinematic
    // tree but can't contact other bodies; criterion 6 will reflect that.
    const inertials = new Map<string, InertiaSpec>();
    const collisionMeshes = new Map<string, { vertex: string; assetName: string }>();
    for (const p of parts) {
        let lowered: OcctBackend | undefined;
        try {
            lowered = (await p.originalShape.lower()) as OcctBackend;
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
        if (lowered !== undefined) {
            try {
                const stl = await lowered.exportSTLAsync();
                const mesh = stlToMjcfMesh(stl);
                collisionMeshes.set(p.name, {
                    vertex: mesh.vertex,
                    assetName: mjcfMeshAssetName(p.name),
                });
            } catch {
                // STL export or parse failed (degenerate shape, empty
                // tessellation, etc.). Skip the `<asset><mesh>` for this
                // part — the body still emits inertia but won't contact.
            }
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

    // P7: pre-resolve every tendon endpoint to (partName, site name,
    // local-frame mm position). The site goes inside the owner body's
    // `<body>` element; the `<spatial>` tendon references the sites by
    // name. Mirror the mate-resolver pattern above — both use the same
    // `resolveConnectorOrigin` to honor topology-bound connectors.
    interface ResolvedTendonEndpoint {
        readonly partName: string;
        readonly siteName: string;
        readonly localPosMm: Vec3;
    }
    interface ResolvedTendon {
        readonly record: TendonRecord;
        readonly endpoints: readonly [ResolvedTendonEndpoint, ResolvedTendonEndpoint];
    }
    async function resolveTendonEndpoint(
        tendon: TendonRecord,
        side: 'from' | 'to',
    ): Promise<ResolvedTendonEndpoint> {
        const ref = side === 'from' ? tendon.from : tendon.to;
        const parsed = parseConnectorRef(ref);
        const part = partByName.get(parsed.partName);
        if (part === undefined) {
            throw new Error(
                `assemblyToMjcf: tendon '${tendon.name}' ${side} references unknown part '${parsed.partName}'.`,
            );
        }
        const connector = part.mateConnectors.find((c) => c.name === parsed.connectorName);
        if (connector === undefined) {
            throw new Error(
                `assemblyToMjcf: tendon '${tendon.name}' ${side} references unknown connector '${parsed.connectorName}' on part '${parsed.partName}'.`,
            );
        }
        const resolved = await resolveConnectorOrigin(part.originalShape, connector.origin);
        return {
            partName: part.name,
            siteName: `${tendon.name}__${side}`,
            localPosMm: resolved.value,
        };
    }
    const resolvedTendons: ResolvedTendon[] = [];
    const sitesByPart = new Map<string, ResolvedTendonEndpoint[]>();
    for (const t of tendons) {
        const fromE = await resolveTendonEndpoint(t, 'from');
        const toE = await resolveTendonEndpoint(t, 'to');
        resolvedTendons.push({ record: t, endpoints: [fromE, toE] });
        for (const ep of [fromE, toE]) {
            const list = sitesByPart.get(ep.partName) ?? [];
            list.push(ep);
            sitesByPart.set(ep.partName, list);
        }
    }

    // P11 Slice 2 — build the routed `<spatial>` child sequence for every
    // tendon that declares wrapGeoms: `<site from>` → (wrap geom, with any
    // sidesite / separator sites) → `<site to>`. MuJoCo requires a `<site>`
    // between two consecutive wrap `<geom>`s, so a separator site is
    // injected at each subsequent wrap's origin. Sidesite + separator sites
    // are registered into `sitesByPart` here so `emitBody` (which runs
    // after this pass) materialises them inside the owning body.
    const addExtraSite = (partName: string, siteName: string, localPosMm: Vec3): void => {
        const list = sitesByPart.get(partName) ?? [];
        list.push({ partName, siteName, localPosMm });
        sitesByPart.set(partName, list);
    };
    const spatialChildrenByTendon = new Map<string, string[]>();
    for (const rt of resolvedTendons) {
        const t = rt.record;
        if (t.wrapGeoms.length === 0) continue;
        const [fromE, toE] = rt.endpoints;
        const children: string[] = [`      <site site="${escapeXml(fromE.siteName)}"/>`];
        t.wrapGeoms.forEach((w, i) => {
            const ownerPart = partByName.get(w.partName);
            const wg = ownerPart?.wrapGeoms.find((g) => g.name === w.wrapName);
            if (ownerPart === undefined || wg === undefined) return; // capture-validated
            if (i > 0) {
                const sepName = `${t.name}__wrap${i}_sep`;
                addExtraSite(w.partName, sepName, wg.origin);
                children.push(`      <site site="${escapeXml(sepName)}"/>`);
            }
            let sidesiteAttr = '';
            if (w.sidesite !== undefined) {
                const sideName = `${t.name}__wrap${i}_side`;
                addExtraSite(w.partName, sideName, [w.sidesite[0], w.sidesite[1], w.sidesite[2]]);
                sidesiteAttr = ` sidesite="${escapeXml(sideName)}"`;
            }
            children.push(
                `      <geom geom="${escapeXml(mjcfWrapGeomName(w.partName, w.wrapName))}"${sidesiteAttr}/>`,
            );
        });
        children.push(`      <site site="${escapeXml(toE.siteName)}"/>`);
        spatialChildrenByTendon.set(t.name, children);
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

        // P7: tendon endpoints owned by this body. Each <site> sits in
        // the body's local frame; the spatial tendon (outside the
        // worldbody) references these sites by name and computes
        // segment length from their world-frame positions each step.
        const sitesHere = sitesByPart.get(partName) ?? [];
        for (const ep of sitesHere) {
            const sitePosM = ep.localPosMm.map((v) => v * MM_TO_M);
            lines.push(
                `${indent}  <site name="${escapeXml(ep.siteName)}" pos="${sitePosM.map(fmtNum).join(' ')}"/>`,
            );
        }

        // P11 Slice 1: collision geom from the part's tessellated BREP.
        // Without `<geom>`, MuJoCo treats every body as a point-mass with
        // joint constraints — drop-tests "pass" on geometry that
        // physically interpenetrates. We register one mesh under
        // `<asset>` per part (above) and reference it here with
        // `contype="1" conaffinity="1"` so part-pair contacts are active.
        // Friction triple matches MuJoCo's default for general body
        // contacts (sliding, torsional, rolling) — sufficient for
        // static-equilibrium and drop-test scoring.
        const collision = collisionMeshes.get(partName);
        if (collision !== undefined) {
            lines.push(
                `${indent}  <geom type="mesh" mesh="${escapeXml(collision.assetName)}" contype="1" conaffinity="1" group="1" friction="1.0 0.005 0.0001"/>`,
            );
        }

        // P11 Slice 2 — collision-OFF wrap cylinders for tendon routing.
        // `contype="0" conaffinity="0"` so they never generate body-body
        // contacts; a `<spatial>` tendon references them by name and the
        // solver routes the cable tangent to the cylinder surface, so a
        // balance spring rides over the arm instead of cutting through it.
        // `fromto` endpoints are origin ± (unit axis)·halfLength, mm→m.
        for (const wg of part.wrapGeoms) {
            const ax = wg.axis;
            const len = Math.hypot(ax[0], ax[1], ax[2]) || 1;
            const u: Vec3 = [ax[0] / len, ax[1] / len, ax[2] / len];
            const halfMm = wg.halfLengthMm ?? WRAP_GEOM_INFINITE_HALF_LEN_MM;
            const p1 = [
                (wg.origin[0] - u[0] * halfMm) * MM_TO_M,
                (wg.origin[1] - u[1] * halfMm) * MM_TO_M,
                (wg.origin[2] - u[2] * halfMm) * MM_TO_M,
            ];
            const p2 = [
                (wg.origin[0] + u[0] * halfMm) * MM_TO_M,
                (wg.origin[1] + u[1] * halfMm) * MM_TO_M,
                (wg.origin[2] + u[2] * halfMm) * MM_TO_M,
            ];
            lines.push(
                `${indent}  <geom name="${escapeXml(mjcfWrapGeomName(partName, wg.name))}" type="cylinder" contype="0" conaffinity="0" group="3" fromto="${[...p1, ...p2].map(fmtNum).join(' ')}" size="${fmtNum(wg.radiusMm * MM_TO_M)}"/>`,
            );
        }

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

    // P7: emit the <tendon> block AFTER <worldbody>. Each spatial
    // tendon references two sites by name; the sites were emitted
    // inside their owner bodies above. Unit conversion:
    //   restLengthMm    → springlength (m)   = mm × 1e-3
    //   stiffnessNmm    → stiffness   (N/m)  = N/mm × 1e3
    //   dampingNsmm     → damping     (N·s/m) = N·s/mm × 1e3
    const tendonBlockLines: string[] = [];
    if (resolvedTendons.length > 0) {
        tendonBlockLines.push('  <tendon>');
        for (const rt of resolvedTendons) {
            const t = rt.record;
            const springLenM = t.restLengthMm * MM_TO_M;
            const stiffnessNm = t.stiffnessNmm * 1000;
            const dampingNsm = t.dampingNsmm * 1000;
            const dampingAttr = dampingNsm > 0 ? ` damping="${fmtNum(dampingNsm)}"` : '';
            tendonBlockLines.push(
                `    <spatial name="${escapeXml(t.name)}" springlength="${fmtNum(springLenM)}" stiffness="${fmtNum(stiffnessNm)}"${dampingAttr}>`,
            );
            // P11 Slice 2: emit the routed child sequence (sites + wrap
            // geoms) when this tendon declares wrapGeoms; otherwise the
            // straight two-site spatial (pre-Slice-2 behavior).
            const routed = spatialChildrenByTendon.get(t.name);
            if (routed !== undefined) {
                for (const c of routed) tendonBlockLines.push(c);
            } else {
                for (const ep of rt.endpoints) {
                    tendonBlockLines.push(`      <site site="${escapeXml(ep.siteName)}"/>`);
                }
            }
            tendonBlockLines.push('    </spatial>');
        }
        tendonBlockLines.push('  </tendon>');
    }

    // P11 Slice 1: emit the `<asset>` block before `<worldbody>`. MJCF
    // requires asset definitions ahead of every body that references
    // them. One `<mesh>` per part that successfully exported STL;
    // bodies whose mesh emission failed simply skip both the asset and
    // the `<geom>` (they remain valid MuJoCo bodies, just inertia-only
    // — the criterion 6 drop-test still observes their joint dynamics).
    const assetBlockLines: string[] = [];
    if (collisionMeshes.size > 0) {
        assetBlockLines.push('  <asset>');
        // Preserve part-declaration order so the snapshot is deterministic.
        for (const p of parts) {
            const m = collisionMeshes.get(p.name);
            if (m === undefined) continue;
            // `scale` converts the mm vertex stream to MuJoCo's metre
            // world. The rest of the MJCF (body `pos`, `<inertial>`,
            // gravity, the drop-test drift thresholds) is in metres via
            // MM_TO_M; the inline mesh vertices are the one payload still
            // in millimetres, so MuJoCo must rescale them at compile time.
            // Without this the collision hull is 1000× oversized and every
            // part interpenetrates the origin, exploding the drop-test.
            assetBlockLines.push(
                `    <mesh name="${escapeXml(m.assetName)}" scale="${MM_TO_M} ${MM_TO_M} ${MM_TO_M}" vertex="${m.vertex}"/>`,
            );
        }
        assetBlockLines.push('  </asset>');
    }

    // P11 Slice 1: emit a `<contact><exclude>` block for every mate's
    // parent-child pair. A clevis fork-and-tongue pair (and every other
    // joint primitive that nests one body inside another) is
    // intentionally interpenetrating at the joint anchor — the
    // constraint comes from the joint, not from contact. Without the
    // exclude, MuJoCo treats the BREP overlap at every clevis as a deep
    // penetration and applies enormous repulsive forces that kick the
    // chain apart on the first integration step. The standard MJCF
    // robotics idiom (see mujoco_menagerie + every Anglepoise/cable
    // demo) is one `<exclude>` per kinematic-tree edge. Non-adjacent
    // body pairs keep their default contact, so the genuine "free
    // body falls onto another" failure modes Slice 1 was built to
    // catch are still detectable.
    const contactBlockLines: string[] = [];
    if (mates.length > 0) {
        contactBlockLines.push('  <contact>');
        for (const m of mates) {
            const aName = parseConnectorRef(m.a).partName;
            const bName = parseConnectorRef(m.b).partName;
            contactBlockLines.push(
                `    <exclude body1="${escapeXml(aName)}" body2="${escapeXml(bName)}"/>`,
            );
        }
        contactBlockLines.push('  </contact>');
    }

    // P11 Slice 1: `<size nconmax="500"/>` gives MuJoCo headroom for
    // contact storage. Default is small (~100) and runs out on tight
    // multi-part assemblies; 500 absorbs the v0.7 corpus without bumping
    // wasm heap pressure noticeably.
    const mjcf = [
        '<?xml version="1.0" ?>',
        `<mujoco model="${escapeXml(arm.name)}">`,
        '  <option gravity="0 0 -9.81"/>',
        '  <compiler angle="radian"/>',
        '  <size nconmax="500"/>',
        ...assetBlockLines,
        '  <worldbody>',
        ...worldbodyBlocks,
        '  </worldbody>',
        ...tendonBlockLines,
        ...contactBlockLines,
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

/**
 * Slugified per-part mesh asset name. MJCF mesh names must be unique
 * inside `<asset>`; we slug the kernelCAD part name into a stable
 * `part-<slug>` form so `<geom mesh="...">` references stay readable
 * in diagnostic output. Run-collapses non-alphanumeric chars to single
 * '-' separators; leading/trailing separators are trimmed.
 */
function mjcfMeshAssetName(partName: string): string {
    const slug = partName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `part-${slug.length > 0 ? slug : 'unnamed'}`;
}

function mjcfSlug(s: string): string {
    const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug.length > 0 ? slug : 'unnamed';
}

/**
 * Globally-unique MJCF geom name for a part's wrap cylinder. MuJoCo geom
 * names must be unique model-wide and a `<spatial><geom geom="...">`
 * routing child references this exact string, so it folds in both the
 * owning part and the wrap-geom name.
 */
function mjcfWrapGeomName(partName: string, wrapName: string): string {
    return `wrap-${mjcfSlug(partName)}-${mjcfSlug(wrapName)}`;
}

/**
 * Substitute half-length (mm) for a wrap geom declared with no explicit
 * `halfLengthMm` (MuJoCo's true-infinite cylinder). `<geom fromto>`
 * requires finite endpoints; 1 m half-length covers any realistic
 * kinematic arm while the cylinder stays contact-disabled, so the
 * over-length is invisible to the solver and only ever serves as a
 * tendon-wrap rail.
 */
const WRAP_GEOM_INFINITE_HALF_LEN_MM = 1000;

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
