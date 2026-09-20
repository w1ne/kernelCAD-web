// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/usd/usdIsaacSerializer.ts
//
// Pure USDA (ASCII USD) serializer for the UsdPhysics schema — a robot
// articulation a GPU physics simulator can ingest directly, without a
// URDF/SDF import step in between.
//
// Stage layout (metres, Z-up, `metersPerUnit = 1`):
//
//   /<robot>                 Xform, PhysicsArticulationRootAPI
//     /Links/<link>          Xform, PhysicsRigidBodyAPI + PhysicsMassAPI,
//                            placed at its solved world pose
//       /visual              Mesh → references ./meshes/<link>.usda,
//                            bound to /<robot>/Materials/<link>
//       /collision           Mesh → same layer, PhysicsCollisionAPI +
//                            PhysicsMeshCollisionAPI, purpose "guide"
//     /Joints/<joint>        PhysicsFixedJoint | PhysicsRevoluteJoint |
//                            PhysicsPrismaticJoint (+ PhysicsDriveAPI when
//                            a drive is declared for that joint)
//     /Materials/<link>      Material + UsdPreviewSurface shader
//
// Reuse, not reimplementation:
//   - joint declarations: `arm.__mates()` / `arm.__joints()` with the same
//     connector resolution the URDF emitter uses,
//   - link world poses: `solveMates` at the default pose, the same solve the
//     SDF emitter uses for its per-link <pose>,
//   - mass / CoM / inertia: `OcctBackend.massProperties(density)`, with the
//     default-density warning from the shared URDF `linkInertialBlock`,
//   - inertia SPD guarantee: `regularizeInertia6` + `jacobiEigenSymmetric3`
//     from the MJCF exporter, so PhysX and MuJoCo see the same tensor,
//   - appearance: `lookupMaterialFromLineage` / `lookupColorFromLineage`, the
//     precedence the GLB exporter uses (a `.finish()`, `.material()`,
//     `.color()`, or an `arm.part(..., { material })` default finish),
//   - geometry: `meshShapeForExport`, the export-grade tessellation.
//
// Geometry lives in one `.usda` mesh layer per link, referenced by relative
// path. An STL cannot be referenced as a USD layer, so the URDF/SDF STL
// sidecar is not reused as-is — the sidecar CONVENTION is (files next to the
// output, reported in mesh_files); the payload is native USD.
//
// Fail-closed, not lossy: a mate kind with no UsdPhysics joint that preserves
// its DOF count (planar / cylindrical / pin_slot / ball) raises
// export.usd.joint-unsupported, and a link with non-finite / non-positive
// mass raises export.usd.mass-missing. A physics stage silently missing a DOF
// or a mass is worse than a refused export.

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import type { MateRecord } from '../../mates/mate';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import {
  lookupColorFromLineage,
  lookupMaterialFromLineage,
} from '../../../kernel/backends/occt/lookupSourceColor';
import { resolveColor, DEFAULT_COLOR } from '../../../shared/render/palette';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { Transform } from '../../../shared/runtime/se3';
import { linkInertialBlock } from '../urdf/linkInertial';
import { jacobiEigenSymmetric3, regularizeInertia6 } from '../../runtime/mjcfExport';
import { solveMates } from '../../mates/solver';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

type Vec3 = readonly [number, number, number];
/** USD quaternion literal order: (real, i, j, k). */
type Quat = [number, number, number, number];

export interface UsdJointDrive {
  /** Drive stiffness. Revolute: per degree (USD angular units); prismatic: per metre. */
  stiffness: number;
  /** Drive damping, same unit convention as stiffness. */
  damping: number;
  /** Optional force / torque cap. Omitted → unbounded (the schema default). */
  maxForce?: number;
  /** Optional drive target: degrees for revolute, metres for prismatic. */
  targetPosition?: number;
}

export interface UsdIsaacSerializeOptions {
  /** Default density (kg/m^3) for parts without `arm.part(..., { density | material })`. */
  density?: number;
  /** Relative directory prefix for the per-link mesh layers; default `./meshes/`. */
  meshPrefix?: string;
  /**
   * Joint drives keyed by joint (mate) name. kernelCAD's mate vocabulary
   * declares kinematics (type, axis, limits) but no actuator gains, so a drive
   * is emitted ONLY when declared here — a stage never carries invented
   * zero-gain drives, which would actively hold a joint at its target.
   */
  drives?: Record<string, UsdJointDrive>;
  /**
   * Collision approximation for dynamic links. PhysX cannot simulate a raw
   * triangle mesh on a moving body; `convexHull` is the fast default,
   * `convexDecomposition` keeps concave links (forks, clevises) honest.
   */
  collisionApproximation?: 'convexHull' | 'convexDecomposition';
}

export interface UsdMeshLayer {
  partName: string;
  /** Path relative to the directory of the root .usda. */
  relPath: string;
  usda: string;
}

export interface UsdIsaacSerializeResult {
  usda: string;
  meshLayers: UsdMeshLayer[];
  diagnostics: CompilerDiagnostic[];
}

const DEFAULT_MESH_PREFIX = './meshes/';
const MM_TO_M = 1e-3;
const EPS = 1e-9;

// ----- small numeric helpers -------------------------------------------------

function f(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  // Boolean / integration round-off (~1e-20) is not a coordinate; print 0 so
  // the stage diffs cleanly between runs. Every real stage quantity — even a
  // sub-gram part's inertia — sits many orders of magnitude above this.
  if (abs < 1e-15) return '0.000000';
  const s = abs !== 0 && (abs < 1e-4 || abs >= 1e7) ? n.toExponential(6) : n.toFixed(6);
  return s === '-0.000000' ? '0.000000' : s;
}

function tuple(v: readonly number[]): string {
  return `(${v.map(f).join(', ')})`;
}

function normalize(v: Vec3): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < EPS ? [0, 0, 1] : [v[0] / len, v[1] / len, v[2] / len];
}

function quatMul(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

function quatConj(q: Quat): Quat {
  return [q[0], -q[1], -q[2], -q[3]];
}

function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len < EPS) return [1, 0, 0, 0];
  // Canonical hemisphere (w >= 0) so identical rotations print identically.
  const s = q[0] < 0 ? -1 / len : 1 / len;
  return [q[0] * s, q[1] * s, q[2] * s, q[3] * s];
}

/** Shortest-arc rotation taking unit vector u onto unit vector v. */
export function quatFromTo(uIn: Vec3, vIn: Vec3): Quat {
  const u = normalize(uIn);
  const v = normalize(vIn);
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  if (dot < -1 + 1e-9) {
    // Antiparallel: 180° about any axis perpendicular to u.
    const helper: Vec3 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const axis = normalize([
      u[1] * helper[2] - u[2] * helper[1],
      u[2] * helper[0] - u[0] * helper[2],
      u[0] * helper[1] - u[1] * helper[0],
    ]);
    return [0, axis[0], axis[1], axis[2]];
  }
  return quatNormalize([
    1 + dot,
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]);
}

/** Rotation matrix given by its COLUMNS → quaternion (Shoemake). */
function quatFromColumns(c0: Vec3, c1: Vec3, c2: Vec3): Quat {
  const m00 = c0[0], m10 = c0[1], m20 = c0[2];
  const m01 = c1[0], m11 = c1[1], m21 = c1[2];
  const m02 = c2[0], m12 = c2[1], m22 = c2[2];
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    q = [0.25 / s, (m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [(m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s];
  }
  return quatNormalize(q);
}

function transformQuat(t: Transform): Quat {
  return quatFromColumns(t.axisDir([1, 0, 0]), t.axisDir([0, 1, 0]), t.axisDir([0, 0, 1]));
}

/** Pick the joint-axis token. A connector axis that already IS +X/+Y/+Z keeps
 *  that token with an identity frame (the readable common case); any other
 *  direction uses token X plus a frame rotation carrying +X onto the axis. */
function axisTokenAndFrame(axis: Vec3): { token: 'X' | 'Y' | 'Z'; frame: Quat } {
  const a = normalize(axis);
  const canon: Array<['X' | 'Y' | 'Z', Vec3]> = [['X', [1, 0, 0]], ['Y', [0, 1, 0]], ['Z', [0, 0, 1]]];
  for (const [token, unit] of canon) {
    if (Math.abs(a[0] - unit[0]) < 1e-9 && Math.abs(a[1] - unit[1]) < 1e-9 && Math.abs(a[2] - unit[2]) < 1e-9) {
      return { token, frame: [1, 0, 0, 0] };
    }
  }
  return { token: 'X', frame: quatFromTo([1, 0, 0], a) };
}

function unitFor(token: 'X' | 'Y' | 'Z'): Vec3 {
  return token === 'X' ? [1, 0, 0] : token === 'Y' ? [0, 1, 0] : [0, 0, 1];
}

/** USD prim names: [A-Za-z_][A-Za-z0-9_]*, unique within a scope. */
function makeNamer(): (raw: string) => string {
  const used = new Map<string, string>();
  const taken = new Set<string>();
  return (raw: string) => {
    const prior = used.get(raw);
    if (prior !== undefined) return prior;
    let base = raw.replace(/[^A-Za-z0-9_]/g, '_');
    if (!/^[A-Za-z_]/.test(base)) base = `_${base}`;
    let name = base;
    for (let i = 1; taken.has(name); i++) name = `${base}_${i}`;
    taken.add(name);
    used.set(raw, name);
    return name;
  };
}

/** sRGB hex → linear color3f, which is what UsdPreviewSurface expects. */
function hexToLinear(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0xbfc4c8;
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [lin((n >> 16) & 0xff), lin((n >> 8) & 0xff), lin(n & 0xff)];
}

// ----- per-link blocks -------------------------------------------------------

interface LinkInertia {
  mass: number;
  com: Vec3;
  diagonal: [number, number, number];
  principalAxes: Quat;
}

/** Mass properties → the UsdPhysics MassAPI representation: principal moments
 *  in a principal frame. The tensor is first run through the MJCF exporter's
 *  SPD regularization, then diagonalised with the same Jacobi solver, so the
 *  emitted moments are the eigenvalues of a tensor PhysX will accept. */
export function linkInertia(
  mp: { mass: number; com: Vec3; inertia6: readonly [number, number, number, number, number, number] },
): LinkInertia {
  const reg = regularizeInertia6(mp.inertia6);
  const [ixx, ixy, ixz, iyy, iyz, izz] = reg;
  const { values, vectors } = jacobiEigenSymmetric3([
    [ixx, ixy, ixz],
    [ixy, iyy, iyz],
    [ixz, iyz, izz],
  ]);
  const col = (k: number): [number, number, number] => [vectors[0][k], vectors[1][k], vectors[2][k]];
  const c0 = col(0);
  const c1 = col(1);
  let c2 = col(2);
  // Eigenvectors are only defined up to sign; force a right-handed frame so
  // the quaternion conversion sees a proper rotation (det = +1).
  const det =
    c0[0] * (c1[1] * c2[2] - c1[2] * c2[1]) -
    c1[0] * (c0[1] * c2[2] - c0[2] * c2[1]) +
    c2[0] * (c0[1] * c1[2] - c0[2] * c1[1]);
  if (det < 0) c2 = [-c2[0], -c2[1], -c2[2]];
  return {
    mass: mp.mass,
    com: [mp.com[0] * MM_TO_M, mp.com[1] * MM_TO_M, mp.com[2] * MM_TO_M],
    diagonal: [values[0], values[1], values[2]],
    principalAxes: quatFromColumns(c0, c1, c2),
  };
}

function meshLayerText(primName: string, shape: OcctBackend): string {
  const meshed = meshShapeForExport(shape.getReplicadShape());
  const pts: string[] = [];
  for (let i = 0; i < meshed.vertices.length; i += 3) {
    pts.push(tuple([
      meshed.vertices[i] * MM_TO_M,
      meshed.vertices[i + 1] * MM_TO_M,
      meshed.vertices[i + 2] * MM_TO_M,
    ]));
  }
  const triCount = Math.floor(meshed.triangles.length / 3);
  return [
    '#usda 1.0',
    '(',
    `    defaultPrim = "${primName}"`,
    '    metersPerUnit = 1',
    '    upAxis = "Z"',
    ')',
    '',
    `def Mesh "${primName}"`,
    '{',
    `    int[] faceVertexCounts = [${new Array(triCount).fill(3).join(', ')}]`,
    `    int[] faceVertexIndices = [${meshed.triangles.slice(0, triCount * 3).join(', ')}]`,
    `    point3f[] points = [${pts.join(', ')}]`,
    '    uniform token subdivisionScheme = "none"',
    '    uniform token orientation = "rightHanded"',
    '}',
    '',
  ].join('\n');
}

/** Resolve the material's base color hex: PBR base color, then the lineage
 *  color, then the default. */
function resolveMaterialBaseHex(pbr: PBRMaterial | undefined, color: string | undefined): string {
  return resolveColor(pbr?.baseColor) ?? resolveColor(color) ?? DEFAULT_COLOR;
}

/** Resolve the shader opacity: explicit PBR opacity, else derive from
 *  transmission, else fully opaque. */
function resolveMaterialOpacity(pbr: PBRMaterial | undefined): number {
  return pbr?.opacity ?? (pbr?.transmission !== undefined && pbr.transmission > 0
    ? Math.max(0.05, 1 - pbr.transmission)
    : 1);
}

/** Append the optional UsdPreviewSurface inputs (clearcoat, ior, opacity). */
function appendOptionalSurfaceInputs(lines: string[], pbr: PBRMaterial | undefined, opacity: number): void {
  if (pbr?.clearcoat !== undefined) lines.push(`                float inputs:clearcoat = ${f(pbr.clearcoat)}`);
  if (pbr?.clearcoatRoughness !== undefined) lines.push(`                float inputs:clearcoatRoughness = ${f(pbr.clearcoatRoughness)}`);
  if (pbr?.ior !== undefined) lines.push(`                float inputs:ior = ${f(pbr.ior)}`);
  if (opacity < 1) lines.push(`                float inputs:opacity = ${f(opacity)}`);
}

function materialBlock(rootPath: string, primName: string, pbr: PBRMaterial | undefined, color: string | undefined): string {
  const baseHex = resolveMaterialBaseHex(pbr, color);
  const diffuse = hexToLinear(baseHex);
  const opacity = resolveMaterialOpacity(pbr);
  const matPath = `${rootPath}/Materials/${primName}`;
  const lines = [
    `        def Material "${primName}"`,
    '        {',
    `            token outputs:surface.connect = <${matPath}/PreviewSurface.outputs:surface>`,
    '',
    '            def Shader "PreviewSurface"',
    '            {',
    '                uniform token info:id = "UsdPreviewSurface"',
    `                color3f inputs:diffuseColor = ${tuple(diffuse)}`,
    `                float inputs:metallic = ${f(pbr?.metalness ?? 0)}`,
    `                float inputs:roughness = ${f(pbr?.roughness ?? 0.5)}`,
  ];
  appendOptionalSurfaceInputs(lines, pbr, opacity);
  lines.push(
    '                token outputs:surface',
    '            }',
    '        }',
  );
  return lines.join('\n');
}

// ----- serializer phases -----------------------------------------------------

/** Reject joint/mate kinds with no UsdPhysics joint that preserves their DOF
 *  count, and drives that do not name a revolute/prismatic joint. The caller
 *  fails closed when any appended diagnostic is an error. */
function appendPreflightDiagnostics(
  legacyJoints: readonly AssemblyJointStored[],
  mates: readonly MateRecord[],
  opts: UsdIsaacSerializeOptions,
  armName: string,
  diagnostics: CompilerDiagnostic[],
): void {
  // Fail closed on unsupported joint kinds BEFORE any expensive work.
  for (const j of legacyJoints) {
    if (j.kind !== 'fixed' && j.kind !== 'revolute' && j.kind !== 'prismatic') {
      diagnostics.push(unsupportedJointDiag(j.name, j.kind));
    }
  }
  for (const m of mates) {
    if (m.type !== 'fastened' && m.type !== 'revolute' && m.type !== 'prismatic') {
      diagnostics.push(unsupportedJointDiag(m.name, m.type));
    }
  }

  // Declared drives must name a joint that can carry one.
  const drivable = new Set<string>([
    ...mates.filter((m) => m.type === 'revolute' || m.type === 'prismatic').map((m) => m.name),
    ...legacyJoints.filter((j) => j.kind === 'revolute' || j.kind === 'prismatic').map((j) => j.name),
  ]);
  for (const [name, drive] of Object.entries(opts.drives ?? {})) {
    if (!drivable.has(name)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'cli.invalid-args',
        severity: 'error',
        message: `options.drives names '${name}', which is not a revolute or prismatic joint of assembly '${armName}'.`,
        hint: `Key options.drives by the name of a revolute or prismatic mate. Drivable joints: ${[...drivable].join(', ') || '(none)'}.`,
        nextAction: NEXT_ACTIONS['cli.invalid-args'],
      });
    } else if (![drive.stiffness, drive.damping].every((n) => Number.isFinite(n) && n >= 0)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'cli.invalid-args',
        severity: 'error',
        message: `options.drives.${name}: stiffness and damping must be finite and >= 0.`,
        hint: `Pass numeric, non-negative gains, e.g. options.drives.${name} = { stiffness: 1000, damping: 100 }.`,
        nextAction: NEXT_ACTIONS['cli.invalid-args'],
      });
    }
  }
}

interface LinkBlockContext {
  records: readonly FeatureRecord[];
  poses: Map<string, Transform> | undefined;
  rootPath: string;
  meshPrefix: string;
  approximation: 'convexHull' | 'convexDecomposition';
  defaultDensity: number | undefined;
  linkName: (raw: string) => string;
  diagnostics: CompilerDiagnostic[];
}

/** Emit the Xform + visual/collision mesh blocks, material blocks and mesh
 *  layers for every part. Mass errors are appended to ctx.diagnostics. */
async function buildLinkBlocks(
  parts: readonly AssemblyPartStored[],
  ctx: LinkBlockContext,
): Promise<{ linkBlocks: string[]; materialBlocks: string[]; meshLayers: UsdMeshLayer[] }> {
  const linkBlocks: string[] = [];
  const materialBlocks: string[] = [];
  const meshLayers: UsdMeshLayer[] = [];

  for (const part of parts) {
    const prim = ctx.linkName(part.name);
    const density = part.density ?? ctx.defaultDensity;
    const lowered = await part.originalShape.lower();
    if (density === undefined) {
      ctx.diagnostics.push(...linkInertialBlock(lowered, undefined).diagnostics);
    }
    const mp = lowered.massProperties(density ?? 1000);
    if (!Number.isFinite(mp.mass) || mp.mass <= 0) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'export.usd.mass-missing',
        severity: 'error',
        message: `Link '${part.name}' has a non-finite or non-positive mass (${mp.mass}).`,
        hint: `Link '${part.name}' cannot carry a physical mass. Pass density or a named material on arm.part('${part.name}', shape, { material: 'steel' }), or check the part's shape is a closed solid.`,
        nextAction: NEXT_ACTIONS['export.usd.mass-missing'],
      });
      continue;
    }
    const inertia = linkInertia(mp);

    const sourceRecord = ctx.records.find((r) => r.id === part.originalShape.id);
    const pbr = sourceRecord ? lookupMaterialFromLineage(sourceRecord, ctx.records) : undefined;
    const color = sourceRecord ? lookupColorFromLineage(sourceRecord, ctx.records) : undefined;
    const hasAppearance = pbr !== undefined || color !== undefined;
    if (hasAppearance) materialBlocks.push(materialBlock(ctx.rootPath, prim, pbr, color));

    const relPath = `${ctx.meshPrefix}${prim}.usda`;
    meshLayers.push({ partName: part.name, relPath, usda: meshLayerText(prim, lowered) });

    const pose = ctx.poses?.get(part.name);
    const translate = pose ? pose.point([0, 0, 0]).map((n) => n * MM_TO_M) : [0, 0, 0];
    const orient = pose ? transformQuat(pose) : ([1, 0, 0, 0] as Quat);

    linkBlocks.push([
      `        def Xform "${prim}" (`,
      '            prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysicsMassAPI"]',
      '        )',
      '        {',
      `            double3 xformOp:translate = ${tuple(translate)}`,
      `            quatf xformOp:orient = ${tuple(orient)}`,
      '            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient"]',
      `            float physics:mass = ${f(inertia.mass)}`,
      `            point3f physics:centerOfMass = ${tuple(inertia.com)}`,
      `            float3 physics:diagonalInertia = ${tuple(inertia.diagonal)}`,
      `            quatf physics:principalAxes = ${tuple(inertia.principalAxes)}`,
      '',
      '            def Mesh "visual" (',
      ...(hasAppearance ? ['                prepend apiSchemas = ["MaterialBindingAPI"]'] : []),
      `                prepend references = @${relPath}@`,
      '            )',
      '            {',
      ...(hasAppearance ? [`                rel material:binding = <${ctx.rootPath}/Materials/${prim}>`] : []),
      '            }',
      '',
      '            def Mesh "collision" (',
      '                prepend apiSchemas = ["PhysicsCollisionAPI", "PhysicsMeshCollisionAPI"]',
      `                prepend references = @${relPath}@`,
      '            )',
      '            {',
      `                uniform token physics:approximation = "${ctx.approximation}"`,
      '                uniform token purpose = "guide"',
      '            }',
      '        }',
    ].join('\n'));
  }

  return { linkBlocks, materialBlocks, meshLayers };
}

/** Emit the UsdPhysics joint blocks for the legacy joints then the mates, in
 *  declaration order. */
function buildJointBlocks(
  legacyJoints: readonly AssemblyJointStored[],
  mates: readonly MateRecord[],
  parts: readonly AssemblyPartStored[],
  poses: Map<string, Transform> | undefined,
  opts: UsdIsaacSerializeOptions,
  rootPath: string,
  linkName: (raw: string) => string,
  jointName: (raw: string) => string,
): string[] {
  const jointBlocks: string[] = [];
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const partNameById = (id: string): string => parts.find((p) => p.id === id)?.name ?? id;

  const emitJoint = (spec: {
    name: string;
    kind: 'fixed' | 'revolute' | 'prismatic';
    parent: string;
    child: string;
    parentOrigin: Vec3;
    parentAxis: Vec3;
    childOrigin: Vec3;
    childAxis: Vec3;
    limits?: readonly [number, number];
  }): void => {
    const { token, frame } = axisTokenAndFrame(spec.parentAxis);
    const T0 = poses?.get(spec.parent);
    const T1 = poses?.get(spec.child);
    let localPos1: Vec3;
    let localRot1: Quat;
    if (T0 && T1) {
      // Derive the child-side frame from the solved poses so both sides name
      // the SAME world frame at rest — otherwise a twist between the two
      // connector frames reads as a non-zero joint angle and offsets limits.
      localPos1 = T1.inverse().point(T0.point(spec.parentOrigin));
      localRot1 = quatNormalize(quatMul(quatMul(quatConj(transformQuat(T1)), transformQuat(T0)), frame));
    } else {
      localPos1 = spec.childOrigin;
      localRot1 = quatFromTo(unitFor(token), spec.childAxis);
    }
    const drive = spec.kind !== 'fixed' ? opts.drives?.[spec.name] : undefined;
    const driveNs = spec.kind === 'revolute' ? 'angular' : 'linear';
    const jointType = spec.kind === 'fixed'
      ? 'PhysicsFixedJoint'
      : spec.kind === 'revolute' ? 'PhysicsRevoluteJoint' : 'PhysicsPrismaticJoint';

    const lines = [
      `        def ${jointType} "${jointName(spec.name)}"${drive ? ' (' : ''}`,
      ...(drive ? [`            prepend apiSchemas = ["PhysicsDriveAPI:${driveNs}"]`, '        )'] : []),
      '        {',
      `            rel physics:body0 = <${rootPath}/Links/${linkName(spec.parent)}>`,
      `            rel physics:body1 = <${rootPath}/Links/${linkName(spec.child)}>`,
      `            point3f physics:localPos0 = ${tuple(spec.parentOrigin.map((n) => n * MM_TO_M))}`,
      `            quatf physics:localRot0 = ${tuple(frame)}`,
      `            point3f physics:localPos1 = ${tuple(localPos1.map((n) => n * MM_TO_M))}`,
      `            quatf physics:localRot1 = ${tuple(localRot1)}`,
    ];
    if (spec.kind !== 'fixed') {
      lines.push(`            uniform token physics:axis = "${token}"`);
      if (spec.limits) {
        // Revolute limits are degrees in UsdPhysics; prismatic limits are
        // stage distance units (metres here).
        const scale = spec.kind === 'revolute' ? 1 : MM_TO_M;
        lines.push(`            float physics:lowerLimit = ${f(spec.limits[0] * scale)}`);
        lines.push(`            float physics:upperLimit = ${f(spec.limits[1] * scale)}`);
      }
    }
    if (drive) {
      lines.push(`            uniform token drive:${driveNs}:physics:type = "force"`);
      lines.push(`            float drive:${driveNs}:physics:stiffness = ${f(drive.stiffness)}`);
      lines.push(`            float drive:${driveNs}:physics:damping = ${f(drive.damping)}`);
      if (drive.maxForce !== undefined) lines.push(`            float drive:${driveNs}:physics:maxForce = ${f(drive.maxForce)}`);
      if (drive.targetPosition !== undefined) lines.push(`            float drive:${driveNs}:physics:targetPosition = ${f(drive.targetPosition)}`);
    }
    lines.push('        }');
    jointBlocks.push(lines.join('\n'));
  };

  for (const j of legacyJoints) {
    const kind = j.kind as 'fixed' | 'revolute' | 'prismatic';
    emitJoint({
      name: j.name,
      kind,
      parent: partNameById(j.parentPartId),
      child: partNameById(j.childPartId),
      parentOrigin: j.origin,
      parentAxis: j.axis ?? [0, 0, 1],
      childOrigin: [0, 0, 0],
      childAxis: j.axis ?? [0, 0, 1],
      limits: kind === 'revolute' ? j.limitsDeg : kind === 'prismatic' ? j.limitsMm : undefined,
    });
  }

  for (const m of mates) {
    const a = resolveConnector(partByName, m.a);
    const b = resolveConnector(partByName, m.b);
    const kind = m.type === 'fastened' ? 'fixed' : (m.type as 'revolute' | 'prismatic');
    emitJoint({
      name: m.name,
      kind,
      parent: a.partName,
      child: b.partName,
      parentOrigin: a.origin,
      parentAxis: a.axis,
      childOrigin: b.origin,
      childAxis: b.axis,
      limits: kind === 'revolute' ? m.limitsDeg : kind === 'prismatic' ? m.limitsMm : undefined,
    });
  }

  return jointBlocks;
}

/** Join the per-prim blocks into the final stage text. */
function assembleUsda(
  rootName: string,
  linkBlocks: readonly string[],
  jointBlocks: readonly string[],
  materialBlocks: readonly string[],
): string {
  return [
    '#usda 1.0',
    '(',
    `    defaultPrim = "${rootName}"`,
    '    metersPerUnit = 1',
    '    upAxis = "Z"',
    ')',
    '',
    `def Xform "${rootName}" (`,
    '    prepend apiSchemas = ["PhysicsArticulationRootAPI"]',
    ')',
    '{',
    '    def Xform "Links"',
    '    {',
    linkBlocks.join('\n\n'),
    '    }',
    '',
    '    def Scope "Joints"',
    '    {',
    jointBlocks.join('\n\n'),
    '    }',
    ...(materialBlocks.length > 0
      ? ['', '    def Scope "Materials"', '    {', materialBlocks.join('\n\n'), '    }']
      : []),
    '}',
    '',
  ].join('\n');
}

// ----- serializer ------------------------------------------------------------

export async function usdIsaacSerialize(
  arm: Assembly,
  opts: UsdIsaacSerializeOptions,
): Promise<UsdIsaacSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const parts = arm.__parts();
  const legacyJoints = arm.__joints();
  const mates = arm.__mates();
  const meshPrefix = opts.meshPrefix ?? DEFAULT_MESH_PREFIX;
  const approximation = opts.collisionApproximation ?? 'convexHull';

  const rootName = makeNamer()(arm.name || 'Robot');
  const rootPath = `/${rootName}`;
  const linkName = makeNamer();
  const jointName = makeNamer();
  const records = arm.__session().getRecords();

  appendPreflightDiagnostics(legacyJoints, mates, opts, arm.name, diagnostics);
  if (diagnostics.some((d) => d.severity === 'error')) {
    return { usda: '', meshLayers: [], diagnostics };
  }

  const poses = await solveLinkPoses(arm, diagnostics);

  const { linkBlocks, materialBlocks, meshLayers } = await buildLinkBlocks(parts, {
    records,
    poses,
    rootPath,
    meshPrefix,
    approximation,
    defaultDensity: opts.density,
    linkName,
    diagnostics,
  });

  if (diagnostics.some((d) => d.severity === 'error')) {
    return { usda: '', meshLayers: [], diagnostics };
  }

  const jointBlocks = buildJointBlocks(legacyJoints, mates, parts, poses, opts, rootPath, linkName, jointName);

  const usda = assembleUsda(rootName, linkBlocks, jointBlocks, materialBlocks);

  return { usda, meshLayers, diagnostics };
}

function resolveConnector(
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  ref: string,
): { partName: string; origin: Vec3; axis: Vec3 } {
  const [partName, connName] = ref.split('.');
  const c = partByName.get(partName)?.mateConnectors.find((x) => x.name === connName);
  const origin = (c?.origin && c.origin.kind === 'vec3')
    ? c.origin.value as [number, number, number]
    : [0, 0, 0] as [number, number, number];
  const axis = (c?.axis ?? [0, 0, 1]) as [number, number, number];
  return { partName, origin, axis };
}

async function solveLinkPoses(
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
): Promise<Map<string, Transform> | undefined> {
  if (arm.__mates().length === 0) return undefined;
  try {
    const solved = await solveMates(arm, undefined, { acceptConsistentArticulatedLoops: true });
    if (solved.status === 'solved' || solved.status === 'redundant-ok') return solved.poses;
    diagnostics.push(poseUnsolved(`mate-graph solve returned status '${solved.status}'`));
  } catch (e) {
    diagnostics.push(poseUnsolved(e instanceof Error ? e.message : String(e)));
  }
  return undefined;
}

function poseUnsolved(reason: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.usd.pose-unsolved',
    severity: 'warn',
    message: `Could not solve the mate graph to per-link poses (${reason}); every link was placed at the stage origin.`,
    hint: 'The simulator will spawn overlapping links and the joints will snap them apart. Run solve_mates to find the unsolvable mate, fix the connector geometry, then re-export.',
    nextAction: NEXT_ACTIONS['export.usd.pose-unsolved'],
  };
}

function unsupportedJointDiag(name: string, kind: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.usd.joint-unsupported',
    severity: 'error',
    message: `Joint '${name}' is a '${kind}' mate, which has no UsdPhysics joint that preserves its degrees of freedom.`,
    hint: `Joint '${name}' ('${kind}') cannot be lowered without dropping a DOF. Use a fastened, revolute or prismatic mate, or export format: 'sdf-gazebo', which carries the full mate vocabulary.`,
    nextAction: NEXT_ACTIONS['export.usd.joint-unsupported'],
  };
}

