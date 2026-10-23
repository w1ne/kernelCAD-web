// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
//   - Actuators exist only for `arm.tendon(..., { actuator })`: one
//     `<motor tendon=... gear="-1">` per driven cable. Everything else is
//     passive bodies. Single-body springs
//     declared via the existing kit don't generate joint moment in MuJoCo
//     either — that's the whole point of P6 surfacing the gap that #361
//     fixes via closed-loop tendons.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { MateRecord } from '../mates/mate';
import { parseConnectorRef } from '../mates/mate';
import type { Connector } from '../mates/connector';
import { resolveConnectorOrigin } from '../mates/connector';
import type { TendonRecord, TendonViaRef } from '../mates/tendon';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { partAtFor } from '../mates/partFrame';
import type { Vec3 } from '../../shared/intent/types';
import { verticesToMjcfMesh } from './stlToMjcfMesh';
import { xmlAttributionComment } from '../../shared/links/attribution';

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
    /** One line per part whose inertia the emitter had to correct (a
     *  non-positive principal moment, or principal moments that break
     *  A + B >= C), with the before / after principal moments. */
    readonly inertiaNotes: readonly string[];
}

/**
 * Build the MJCF for an Assembly. Throws on closed-loop graphs (the
 * caller surfaces this as `mechanism: 'unverified'` so the legacy
 * diagnostics still drive the exit code).
 */
export interface AssemblyToMjcfOptions {
    /** The assembly's lowered rest scene. Its part BREPs are reused instead
     *  of lowering every part again (each lower is a new OCCT shape that the
     *  WASM heap keeps for the rest of the process). */
    readonly scene?: SceneBackend;
}

export async function assemblyToMjcf(arm: Assembly, opts: AssemblyToMjcfOptions = {}): Promise<MjcfExportResult> {
    const parts = arm.__parts();
    const mates = arm.__mates();
    const tendons = arm.__tendons();
    if (parts.length === 0) {
        throw new Error('assemblyToMjcf: assembly has no parts; nothing to physics-check.');
    }

    const { partByName, childrenByParent, roots } = buildMateTree(parts, mates);

    const atOf = partAtFor(mates, parts, arm.__session().paramTable);
    // A scene shape carries the part's `at`; only parts without one share the
    // frame of `originalShape.lower()`, so only those reuse the scene BREP.
    const sceneShapes = new Map<string, OcctBackend>();
    for (const sp of opts.scene?.parts ?? []) {
        if (sp.shape instanceof OcctBackend && atOf(sp.name) === undefined) sceneShapes.set(sp.name, sp.shape);
    }
    const { inertials, collisionMeshes, inertiaNotes } = await buildPartAssets(parts, sceneShapes);

    const resolvedMateAxes = await resolveMateFrames(mates, partByName);

    const { resolvedTendons, sitesByPart, spatialChildrenByTendon } = await resolveTendonSites(tendons, partByName);

    // Emit MJCF by recursive body-tree walk.
    const jointOrder: { mjcfName: string; mateName: string }[] = [];
    const bodyOrder: string[] = [];
    const worldbodyBlocks = emitWorldbodyBlocks(
        roots,
        partByName,
        childrenByParent,
        inertials,
        collisionMeshes,
        resolvedMateAxes,
        sitesByPart,
        jointOrder,
        bodyOrder,
    );

    const tendonBlockLines = emitTendonBlock(resolvedTendons, spatialChildrenByTendon);
    const actuatorBlockLines = emitActuatorBlock(resolvedTendons);
    const assetBlockLines = emitAssetBlock(parts, collisionMeshes);
    const contactBlockLines = emitContactBlock(mates);

    // P11: `<size nconmax>` gives MuJoCo headroom for contact storage.
    // Its default is small (~100) and runs out on tight multi-part
    // assemblies. Active contacts scale with the number of part pairs, so
    // budget grows with part count: 500 floor for the small corpus,
    // +120/part beyond that (a 50-part assembly gets 6000) — well within
    // wasm heap limits while removing the fixed-cap ceiling that a large
    // collision-rich assembly could trip over.
    const nconmax = Math.max(500, parts.length * 120);
    const mjcf = [
        '<?xml version="1.0" ?>',
        xmlAttributionComment(),
        `<mujoco model="${escapeXml(arm.name)}">`,
        '  <option gravity="0 0 -9.81"/>',
        '  <compiler angle="radian"/>',
        `  <size nconmax="${nconmax}"/>`,
        ...assetBlockLines,
        '  <worldbody>',
        ...worldbodyBlocks,
        '  </worldbody>',
        ...tendonBlockLines,
        ...contactBlockLines,
        ...actuatorBlockLines,
        '</mujoco>',
        '',
    ].join('\n');

    return { mjcf, jointOrder, bodyOrder, inertiaNotes };
}

interface MateTree {
    readonly partByName: Map<string, AssemblyPartStored>;
    readonly childrenByParent: Map<string, { childName: string; mate: MateRecord }[]>;
    readonly roots: readonly AssemblyPartStored[];
}

function buildMateTree(parts: readonly AssemblyPartStored[], mates: readonly MateRecord[]): MateTree {
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
    return { partByName, childrenByParent, roots };
}

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
async function buildPartAssets(parts: readonly AssemblyPartStored[], sceneShapes: ReadonlyMap<string, OcctBackend> = new Map()): Promise<{
    inertials: Map<string, InertiaSpec>;
    collisionMeshes: Map<string, { vertex: string; assetName: string }>;
    inertiaNotes: string[];
}> {
    const inertials = new Map<string, InertiaSpec>();
    const collisionMeshes = new Map<string, { vertex: string; assetName: string }>();
    const inertiaNotes: string[] = [];
    for (const p of parts) {
        let lowered: OcctBackend | undefined = sceneShapes.get(p.name);
        try {
            lowered ??= (await p.originalShape.lower()) as OcctBackend;
            const density = p.density ?? DEFAULT_DENSITY_KG_M3;
            const mp = lowered.massProperties(density);
            // A declared `massKg` (catalog / datasheet mass) wins over
            // volume × density: CoM and inertia come from the geometry,
            // scaled to that mass (as the static-hold / motion-load checks
            // do in kinematic/partMass.ts).
            const k = p.massKg !== undefined && p.massKg > 0 && mp.mass > 0 ? p.massKg / mp.mass : 1;
            const massKg = Math.max(1e-6, mp.mass * k);
            const scaled = mp.inertia6.map((v) => v * k) as unknown as [number, number, number, number, number, number];
            // MuJoCo's <inertial> takes diaginertia OR fullinertia; we use
            // fullinertia to preserve the off-diagonal terms.
            //
            // MuJoCo rejects a body whose principal moments are not all
            // positive ("inertia must have positive eigenvalues") or break
            // the triangle inequality ("inertia must satisfy A + B >= C").
            // A thin plate sits exactly on that boundary (perpendicular
            // axis theorem: C = A + B), so round-off alone can break it.
            // One bad part bricks the whole physics gate, so correct the
            // tensor to the nearest valid one and log a note.
            const valid = validInertia6(scaled);
            if (valid.note !== undefined) inertiaNotes.push(`${p.name}: ${valid.note}`);
            inertials.set(p.name, {
                massKg,
                comLocalMm: mp.com,
                inertia6: valid.inertia6,
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
                // A coarse vertex cloud: MuJoCo collides with the convex hull
                // of a mesh geom, so an export-grade tessellation only costs
                // memory (it stays on the BREP and in the MJCF string).
                const mesh = verticesToMjcfMesh(lowered.collisionVertices());
                collisionMeshes.set(p.name, {
                    vertex: mesh.vertex,
                    assetName: mjcfMeshAssetName(p.name),
                });
            } catch {
                // Meshing failed (degenerate shape, empty tessellation, etc.).
                // Skip the `<asset><mesh>` for this part — the body still
                // emits inertia but won't contact.
            }
        }
    }
    return { inertials, collisionMeshes, inertiaNotes };
}

// Resolve mate connector frames. `origin` / `axis` come from the mate's
// `a` side (on the parent, PARENT-local); `childOrigin` is the `b`
// connector's origin in the CHILD's local frame. At rest the solver puts
// the two connector origins on top of each other, so the child body sits
// at origin - childOrigin in its parent and its joint anchor is
// childOrigin. Topology origins resolve through `resolveConnectorOrigin`.
type ResolvedMateFrame = { origin: Vec3; axis: Vec3; childOrigin: Vec3 };
async function resolveMateFrames(
    mates: readonly MateRecord[],
    partByName: Map<string, AssemblyPartStored>,
): Promise<Map<string, ResolvedMateFrame>> {
    const resolvedMateAxes = new Map<string, ResolvedMateFrame>();
    for (const m of mates) {
        const aRef = parseConnectorRef(m.a);
        const part = partByName.get(aRef.partName);
        if (part === undefined) continue;
        const connector = part.mateConnectors.find((c) => c.name === aRef.connectorName);
        if (connector === undefined) continue;
        const resolved = await resolveConnectorOrigin(part.originalShape, connector.origin);
        const axis = (connector.axis ?? [0, 0, 1]) as Vec3;
        let childOrigin: Vec3 = [0, 0, 0];
        const bRef = parseConnectorRef(m.b);
        const child = partByName.get(bRef.partName);
        const childConnector = child?.mateConnectors.find((c) => c.name === bRef.connectorName);
        if (child !== undefined && childConnector !== undefined) {
            childOrigin = (await resolveConnectorOrigin(child.originalShape, childConnector.origin)).value;
        }
        resolvedMateAxes.set(m.name, { origin: resolved.value, axis, childOrigin });
    }
    return resolvedMateAxes;
}

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
    partByName: Map<string, AssemblyPartStored>,
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

// P7: pre-resolve every tendon endpoint to (partName, site name,
// local-frame mm position). The site goes inside the owner body's
// `<body>` element; the `<spatial>` tendon references the sites by
// name. Mirror the mate-resolver pattern above — both use the same
// `resolveConnectorOrigin` to honor topology-bound connectors.
//
// P11 Slice 2 — build the routed `<spatial>` child sequence for every
// tendon that declares wrapGeoms: `<site from>` → (wrap geom, with any
// sidesite / separator sites) → `<site to>`. MuJoCo requires a `<site>`
// between two consecutive wrap `<geom>`s, so a separator site is
// injected at each subsequent wrap's origin. Sidesite + separator sites
// are registered into `sitesByPart` here so `emitBody` (which runs
// after this pass) materialises them inside the owning body.
async function resolveTendonSites(
    tendons: readonly TendonRecord[],
    partByName: Map<string, AssemblyPartStored>,
): Promise<{
    resolvedTendons: ResolvedTendon[];
    sitesByPart: Map<string, ResolvedTendonEndpoint[]>;
    spatialChildrenByTendon: Map<string, string[]>;
}> {
    const resolvedTendons: ResolvedTendon[] = [];
    const sitesByPart = new Map<string, ResolvedTendonEndpoint[]>();
    for (const t of tendons) {
        const fromE = await resolveTendonEndpoint(t, 'from', partByName);
        const toE = await resolveTendonEndpoint(t, 'to', partByName);
        resolvedTendons.push({ record: t, endpoints: [fromE, toE] });
        for (const ep of [fromE, toE]) {
            const list = sitesByPart.get(ep.partName) ?? [];
            list.push(ep);
            sitesByPart.set(ep.partName, list);
        }
    }

    const addExtraSite = (partName: string, siteName: string, localPosMm: Vec3): void => {
        const list = sitesByPart.get(partName) ?? [];
        list.push({ partName, siteName, localPosMm });
        sitesByPart.set(partName, list);
    };
    const spatialChildrenByTendon = new Map<string, string[]>();
    for (const rt of resolvedTendons) {
        const t = rt.record;
        // `via` and the legacy `wrapGeoms` are mutually exclusive (capture-validated).
        const route: readonly TendonViaRef[] = t.via.length > 0 ? t.via : t.wrapGeoms.map((w) => ({ wrap: w }));
        if (route.length === 0) continue;
        const [fromE, toE] = rt.endpoints;
        const children: string[] = [`      <site site="${escapeXml(fromE.siteName)}"/>`];
        let prevWasGeom = false;
        for (const [i, entry] of route.entries()) {
            if (typeof entry === 'string') {
                const parsed = parseConnectorRef(entry);
                const viaPart = partByName.get(parsed.partName);
                const conn = viaPart?.mateConnectors.find((c) => c.name === parsed.connectorName);
                if (viaPart === undefined || conn === undefined) continue; // capture-validated
                const siteName = `${t.name}__via${i}`;
                addExtraSite(viaPart.name, siteName, (await resolveConnectorOrigin(viaPart.originalShape, conn.origin)).value);
                children.push(`      <site site="${escapeXml(siteName)}"/>`);
                prevWasGeom = false;
                continue;
            }
            const w = entry.wrap;
            const ownerPart = partByName.get(w.partName);
            const wg = ownerPart?.wrapGeoms.find((g) => g.name === w.wrapName);
            if (ownerPart === undefined || wg === undefined) continue; // capture-validated
            if (prevWasGeom) {
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
            prevWasGeom = true;
        }
        children.push(`      <site site="${escapeXml(toE.siteName)}"/>`);
        spatialChildrenByTendon.set(t.name, children);
    }
    return { resolvedTendons, sitesByPart, spatialChildrenByTendon };
}

/** A mated child body's position in its parent: the parent-local connector
 *  origin minus the child-local one (they coincide at rest). */
function childBodyPos(frame: ResolvedMateFrame | undefined): Vec3 {
    if (frame === undefined) return [0, 0, 0];
    const o = frame.origin, c = frame.childOrigin;
    return [o[0] - c[0], o[1] - c[1], o[2] - c[2]];
}

// Emit MJCF by recursive body-tree walk.
function emitWorldbodyBlocks(
    roots: readonly AssemblyPartStored[],
    partByName: Map<string, AssemblyPartStored>,
    childrenByParent: Map<string, { childName: string; mate: MateRecord }[]>,
    inertials: Map<string, InertiaSpec>,
    collisionMeshes: Map<string, { vertex: string; assetName: string }>,
    resolvedMateAxes: Map<string, ResolvedMateFrame>,
    sitesByPart: Map<string, ResolvedTendonEndpoint[]>,
    jointOrder: { mjcfName: string; mateName: string }[],
    bodyOrder: string[],
): string[] {
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

        // Body position: root uses part.at; non-root sits where its mate
        // connector lands on the parent's. Both in mm; convert to m.
        const posMm: Vec3 = mateFromParent === undefined
            ? partAttachPos(part)
            : childBodyPos(resolvedMateAxes.get(mateFromParent.name));
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
            `${indent}  <inertial pos="${comM.map(fmtNum).join(' ')}" mass="${fmtNum(inertial.massKg)}" fullinertia="${[ixx, iyy, izz, ixy, ixz, iyz].map(fmtInertia).join(' ')}"/>`,
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
    return worldbodyBlocks;
}

// P7: emit the <tendon> block AFTER <worldbody>. Each spatial
// tendon references two sites by name; the sites were emitted
// inside their owner bodies above. Unit conversion:
//   restLengthMm    → springlength (m)   = mm × 1e-3
//   stiffnessNmm    → stiffness   (N/m)  = N/mm × 1e3
//   dampingNsmm     → damping     (N·s/m) = N·s/mm × 1e3
function emitTendonBlock(
    resolvedTendons: readonly ResolvedTendon[],
    spatialChildrenByTendon: Map<string, string[]>,
): string[] {
    const tendonBlockLines: string[] = [];
    if (resolvedTendons.length > 0) {
        tendonBlockLines.push('  <tendon>');
        for (const rt of resolvedTendons) {
            const t = rt.record;
            const springAttrs = tendonSpringAttrs(t);
            const dampingNsm = t.dampingNsmm * 1000;
            const dampingAttr = dampingNsm > 0 ? ` damping="${fmtNum(dampingNsm)}"` : '';
            tendonBlockLines.push(
                `    <spatial name="${escapeXml(t.name)}"${springAttrs}${dampingAttr}${tendonLookAttrs(t)}>`,
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
    return tendonBlockLines;
}

// Spring attrs; an actuated cable without spring fields stays inextensible.
function tendonSpringAttrs(t: TendonRecord): string {
    const rest = t.restLengthMm !== undefined ? ` springlength="${fmtNum(t.restLengthMm * MM_TO_M)}"` : '';
    const stiff = t.stiffnessNmm !== undefined ? ` stiffness="${fmtNum(t.stiffnessNmm * 1000)}"` : '';
    return rest + stiff;
}

/** `#rgb` / `#rrggbb` → "r g b 1" in 0..1, or undefined for any other color syntax. */
function cssHexToRgba(color: string): string | undefined {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (m === null) return undefined;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const ch = [0, 2, 4].map((i) => fmtNum(parseInt(h.slice(i, i + 2), 16) / 255));
    return `${ch.join(' ')} 1`;
}

// Strap tendons render as a ribbon of half the strap width; a declared
// material colors the tendon (MuJoCo's own viewer only).
function tendonLookAttrs(t: TendonRecord): string {
    const width = t.visualStyle === 'strap' ? ` width="${fmtNum((t.strapWidthMm / 2) * MM_TO_M)}"` : '';
    const rgba = t.material !== undefined ? cssHexToRgba(t.material.baseColor) : undefined;
    return width + (rgba !== undefined ? ` rgba="${rgba}"` : '');
}

// Motor per actuated tendon. gear=-1: a positive spatial-tendon force
// lengthens it, so ctrl >= 0 is cable tension (pull).
function emitActuatorBlock(resolvedTendons: readonly ResolvedTendon[]): string[] {
    const driven = resolvedTendons.filter((rt) => rt.record.actuator !== undefined);
    if (driven.length === 0) return [];
    return [
        '  <actuator>',
        ...driven.map((rt) => {
            const n = escapeXml(rt.record.name);
            return `    <motor name="${n}" tendon="${n}" gear="-1" ctrllimited="true" ctrlrange="0 ${fmtNum(rt.record.actuator!.maxForceN)}"/>`;
        }),
        '  </actuator>',
    ];
}

// P11 Slice 1: emit the `<asset>` block before `<worldbody>`. MJCF
// requires asset definitions ahead of every body that references
// them. One `<mesh>` per part that successfully exported STL;
// bodies whose mesh emission failed simply skip both the asset and
// the `<geom>` (they remain valid MuJoCo bodies, just inertia-only
// — the criterion 6 drop-test still observes their joint dynamics).
function emitAssetBlock(
    parts: readonly AssemblyPartStored[],
    collisionMeshes: Map<string, { vertex: string; assetName: string }>,
): string[] {
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
    return assetBlockLines;
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
function emitContactBlock(mates: readonly MateRecord[]): string[] {
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
    return contactBlockLines;
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
 * CHILD body's frame (not the parent). For a hinge between parent
 * connector origin O (parent-local) and child connector origin C
 * (child-local), the child body is positioned at O - C (via the body's
 * `pos`) and the joint anchor sits at C in the child's local frame.
 */
function mateToMjcfJoint(
    mate: MateRecord,
    resolved: Map<string, ResolvedMateFrame>,
    jointOrder: { mjcfName: string; mateName: string }[],
): string[] {
    const frame = resolved.get(mate.name) ?? { origin: [0, 0, 0] as Vec3, axis: [0, 0, 1] as Vec3, childOrigin: [0, 0, 0] as Vec3 };
    const axis = frame.axis;
    // Joint anchor in the child body's frame: the child connector origin.
    const anchor = frame.childOrigin.map((v) => fmtNum(v * MM_TO_M)).join(' ');
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
                `<joint name="${escapeXml(mjcfJointName)}" type="hinge" axis="${axis.map(fmtNum).join(' ')}" pos="${anchor}"${limitedAttrs}/>`,
            ];
        }
        case 'prismatic': {
            jointOrder.push({ mjcfName: mjcfJointName, mateName: mate.name });
            const limits = mate.limitsMm;
            const limitedAttrs = limits !== undefined
                ? ` limited="true" range="${fmtNum(limits[0] * MM_TO_M)} ${fmtNum(limits[1] * MM_TO_M)}"`
                : '';
            return [
                `<joint name="${escapeXml(mjcfJointName)}" type="slide" axis="${axis.map(fmtNum).join(' ')}" pos="${anchor}"${limitedAttrs}/>`,
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
                `<joint name="${escapeXml(mjcfJointName)}_x" type="slide" axis="${perpA.map(fmtNum).join(' ')}" pos="${anchor}"/>`,
                `<joint name="${escapeXml(mjcfJointName)}_y" type="slide" axis="${perpB.map(fmtNum).join(' ')}" pos="${anchor}"/>`,
                `<joint name="${escapeXml(mjcfJointName)}_rz" type="hinge" axis="${axis.map(fmtNum).join(' ')}" pos="${anchor}"/>`,
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
                `<joint name="${escapeXml(mjcfJointName)}" type="ball" pos="${anchor}"/>`,
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

/** Inertia components keep 10 significant digits. `fmtNum`'s 6 fixed
 *  decimals leave a 1e-4 kg·m² moment 3 digits, enough rounding to push a
 *  thin plate (C = A + B) past MuJoCo's A + B >= C check. */
function fmtInertia(n: number): string {
    if (!Number.isFinite(n) || n === 0) return '0';
    return n.toExponential(9);
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

/**
 * Regularize a symmetric inertia 6-vector to be positive-definite.
 *
 * Input/output layout matches `MassProperties.inertia6`:
 * `[ixx, ixy, ixz, iyy, iyz, izz]` (kg·m²).
 *
 * Why: MuJoCo's compiler diagonalises every body's inertia and rejects
 * the model with "inertia must have positive eigenvalues" if any
 * principal moment is ≤ 0. A degenerate / very-thin / rank-deficient
 * BREP (e.g. a zero-thickness plate, or a sliver whose volume integral
 * loses a principal axis to round-off) yields exactly such a tensor, and
 * a single bad part bricks the whole `--include-physics` gate. This is
 * the inertia analogue of the `Math.max(1e-6, mp.mass)` mass floor.
 *
 * Method: diagonalise the symmetric 3×3 via a Jacobi sweep (exact and
 * stable for 3×3 — no external dep), floor every eigenvalue to a small
 * positive `eps`, then reconstruct `I' = V · diag(λ') · Vᵀ`. This is the
 * correct way to enforce SPD: clamping only the diagonal blocks would
 * leave off-diagonal-dominated tensors (the actual failure mode of a
 * thin plate, whose products of inertia survive while one principal
 * moment collapses) still indefinite. Reconstructing from floored
 * eigenvalues guarantees the *result* is SPD regardless of where the
 * non-positivity lived.
 *
 * Floor: physically the smallest meaningful principal moment scales with
 * mass × (extent)². We don't have the body extent here, so we floor
 * relative to the tensor's own scale: `eps = max(FLOOR_ABS, FLOOR_FRAC ×
 * maxAbsEigenvalue)`. The relative term keeps a healthy tensor's tiny-but-
 * legitimate principal moment from being clobbered while still lifting a
 * genuine zero/negative axis to ~1e-6 of the largest moment — far below
 * any drift threshold the drop-test scores, so a regularized plate
 * behaves like the near-2D body it is.
 *
 * The absolute floor is 1e-9 kg·m² — NOT smaller — for two reasons. (1) It
 * must clear `fmtNum`'s `< 1e-9 → "0"` write-time cutoff: a floor below
 * that would be serialised as a literal `0` in `fullinertia="..."`, which
 * is exactly the non-positive value MuJoCo rejects, silently undoing the
 * regularization. (2) A principal moment of 1e-9 kg·m² is sub-milligram
 * point-mass scale; any genuine kernelCAD part has far larger moments, so
 * the absolute floor only ever bites a degenerate/near-2D body that has no
 * meaningful rotational inertia about that axis anyway. A HEALTHY body
 * whose eigenvalues are all already ≥ eps is returned bit-for-bit
 * unchanged (the Jacobi reconstruction path is skipped entirely).
 */
const INERTIA_EIGENVALUE_FLOOR_FRAC = 1e-6;
const INERTIA_EIGENVALUE_FLOOR_ABS = 1e-9;
export function regularizeInertia6(
    inertia6: readonly [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
    const [ixx, ixy, ixz, iyy, iyz, izz] = inertia6;
    // Sanitise non-finite inputs up front so the eigensolver can't spin.
    const a = [
        [finiteOrZero(ixx), finiteOrZero(ixy), finiteOrZero(ixz)],
        [finiteOrZero(ixy), finiteOrZero(iyy), finiteOrZero(iyz)],
        [finiteOrZero(ixz), finiteOrZero(iyz), finiteOrZero(izz)],
    ];
    const { values, vectors } = jacobiEigenSymmetric3(a);
    const maxAbs = Math.max(
        Math.abs(values[0]),
        Math.abs(values[1]),
        Math.abs(values[2]),
    );
    const eps = Math.max(INERTIA_EIGENVALUE_FLOOR_ABS, INERTIA_EIGENVALUE_FLOOR_FRAC * maxAbs);
    const flooredAlready =
        values[0] >= eps && values[1] >= eps && values[2] >= eps;
    if (flooredAlready) {
        // Healthy tensor — pass the ORIGINAL components through untouched
        // (avoid even round-off churn from the reconstruction).
        return [
            finiteOrZero(ixx),
            finiteOrZero(ixy),
            finiteOrZero(ixz),
            finiteOrZero(iyy),
            finiteOrZero(iyz),
            finiteOrZero(izz),
        ];
    }
    const lam = [
        Math.max(eps, values[0]),
        Math.max(eps, values[1]),
        Math.max(eps, values[2]),
    ];
    // I' = V · diag(lam) · Vᵀ. vectors[*][k] is eigenvector k (columns).
    const m = (r: number, c: number): number =>
        lam[0] * vectors[r][0] * vectors[c][0] +
        lam[1] * vectors[r][1] * vectors[c][1] +
        lam[2] * vectors[r][2] * vectors[c][2];
    return [m(0, 0), m(0, 1), m(0, 2), m(1, 1), m(1, 2), m(2, 2)];
}

/**
 * Relative margin kept inside MuJoCo's triangle inequality: after the
 * correction the largest principal moment is at most (1 - margin) × the
 * sum of the other two. Covers the 10-digit serialization and MuJoCo's own
 * eigen round-off; far below anything a drop test can see.
 */
const INERTIA_TRIANGLE_MARGIN = 1e-6;

/**
 * The nearest inertia tensor MuJoCo accepts: positive principal moments
 * (`regularizeInertia6`) that satisfy A + B >= C for every ordering.
 * When the largest moment C exceeds A + B, the two smaller moments grow by
 * half the excess each (C is the moment a thin plate gets right; the
 * in-plane ones lose the thickness term), with the principal axes kept.
 * A valid tensor comes back unchanged, with no note.
 */
export function validInertia6(
    inertia6: readonly [number, number, number, number, number, number],
): { inertia6: [number, number, number, number, number, number]; note?: string } {
    const spd = regularizeInertia6(inertia6);
    const [ixx, ixy, ixz, iyy, iyz, izz] = spd;
    const { values, vectors } = jacobiEigenSymmetric3([
        [ixx, ixy, ixz],
        [ixy, iyy, iyz],
        [ixz, iyz, izz],
    ]);
    const order = [0, 1, 2].sort((a, b) => values[a] - values[b]);
    const [lo, mid, hi] = order as [number, number, number];
    const excess = values[hi] - (1 - INERTIA_TRIANGLE_MARGIN) * (values[lo] + values[mid]);
    const spdChanged = spd.some((v, i) => v !== finiteOrZero(inertia6[i]!));
    const fmt = (v: readonly number[]): string => [...v].sort((a, b) => a - b).map((x) => x.toExponential(4)).join(', ');
    if (excess <= 0) {
        return spdChanged
            ? { inertia6: spd, note: `principal moments floored to positive (${fmt(values)} kg·m²)` }
            : { inertia6: spd };
    }
    const lam = [...values] as [number, number, number];
    lam[lo] += excess / 2;
    lam[mid] += excess / 2;
    const m = (r: number, c: number): number =>
        lam[0] * vectors[r][0] * vectors[c][0] +
        lam[1] * vectors[r][1] * vectors[c][1] +
        lam[2] * vectors[r][2] * vectors[c][2];
    return {
        inertia6: [m(0, 0), m(0, 1), m(0, 2), m(1, 1), m(1, 2), m(2, 2)],
        note: `principal moments ${fmt(values)} kg·m² break A + B >= C; corrected to ${fmt(lam)} kg·m²`,
    };
}

function finiteOrZero(n: number): number {
    return Number.isFinite(n) ? n : 0;
}

/**
 * Jacobi eigenvalue decomposition for a symmetric 3×3 matrix. Returns
 * the eigenvalues and an orthonormal eigenvector matrix `vectors` whose
 * COLUMN `k` (i.e. `vectors[*][k]`) is the eigenvector for `values[k]`.
 * Converges in a handful of sweeps for 3×3; capped to stay bounded on
 * pathological input.
 */
export function jacobiEigenSymmetric3(
    input: number[][],
): { values: [number, number, number]; vectors: number[][] } {
    // Work on a mutable copy.
    const a = input.map((row) => row.slice());
    // Identity eigenvector accumulator.
    const v = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ];
    const offDiag = (): number =>
        Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    const scale = Math.max(Math.abs(a[0][0]), Math.abs(a[1][1]), Math.abs(a[2][2]), 1);
    const tol = 1e-15 * scale;
    for (let sweep = 0; sweep < 50 && offDiag() > tol; sweep++) {
        for (const [p, q] of [
            [0, 1],
            [0, 2],
            [1, 2],
        ] as const) {
            const apq = a[p][q];
            if (Math.abs(apq) <= tol) continue;
            // Rotation angle that zeroes a[p][q].
            const theta = (a[q][q] - a[p][p]) / (2 * apq);
            const t =
                Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
            const c = 1 / Math.sqrt(t * t + 1);
            const s = t * c;
            // Apply Givens rotation a := Jᵀ a J.
            for (let k = 0; k < 3; k++) {
                const akp = a[k][p];
                const akq = a[k][q];
                a[k][p] = c * akp - s * akq;
                a[k][q] = s * akp + c * akq;
            }
            for (let k = 0; k < 3; k++) {
                const apk = a[p][k];
                const aqk = a[q][k];
                a[p][k] = c * apk - s * aqk;
                a[q][k] = s * apk + c * aqk;
            }
            // Accumulate eigenvectors.
            for (let k = 0; k < 3; k++) {
                const vkp = v[k][p];
                const vkq = v[k][q];
                v[k][p] = c * vkp - s * vkq;
                v[k][q] = s * vkp + c * vkq;
            }
        }
    }
    return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
}

/**
 * Sylvester's-criterion positive-definiteness check for a symmetric 3×3
 * inertia tensor given as the `[ixx, ixy, ixz, iyy, iyz, izz]` 6-vector.
 * Exported for tests (the emitter never calls it — the Jacobi
 * regularization above is unconditional). All three leading principal
 * minors must be strictly positive.
 */
export function isInertia6PositiveDefinite(
    inertia6: readonly [number, number, number, number, number, number],
): boolean {
    const [ixx, ixy, ixz, iyy, iyz, izz] = inertia6;
    if (!inertia6.every((n) => Number.isFinite(n))) return false;
    const m1 = ixx;
    const m2 = ixx * iyy - ixy * ixy;
    const det =
        ixx * (iyy * izz - iyz * iyz) -
        ixy * (ixy * izz - iyz * ixz) +
        ixz * (ixy * iyz - iyy * ixz);
    return m1 > 0 && m2 > 0 && det > 0;
}

// Re-export so callers (criterion 5/6) don't have to know the resolver
// shape; keeps the public surface tight.
export type { Connector };
