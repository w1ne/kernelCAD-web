// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/usd/usdIsaacSerializer.ts
//
// Pure USDA (ASCII USD) serializer for the UsdPhysics schema, targeting
// Isaac Sim / Isaac Lab robot articulation import. Walks an Assembly the
// same way urdfSerialize does (parts + legacy joints + mates), reuses
// linkInertialBlock for mass/inertia/COM, and lowers fixed/revolute/
// prismatic mates to PhysicsFixedJoint/PhysicsRevoluteJoint/
// PhysicsPrismaticJoint prims. Mate kinds without a PhysicsJoint
// equivalent (planar/cylindrical/pin_slot/ball) fail closed with
// export.usd.joint-unsupported rather than lowering lossily, since a
// physics stage silently missing a DOF is worse than a refused export.
//
// Collision/visual geometry follows the URDF/SDF convention exactly: the
// companion mesh writer (emitCompanionMeshes in script-runtime/export.ts)
// always emits binary STL regardless of extension, so meshPaths here use
// the same `meshes/<part>.stl` sidecar layout, referenced from each body
// prim by relative asset path. Isaac Sim imports STL geometry directly.

import type { Assembly } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { linkInertialBlock } from '../urdf/linkInertial';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface UsdIsaacSerializeOptions {
  /** Default density (kg/m^3) applied to parts without `arm.part(..., { density })`. */
  density?: number;
  /** Mesh asset relative path prefix; default `./meshes/`. */
  meshPrefix?: string;
}

export interface MeshEmitRequest {
  partName: string;
  shape: OcctBackend;
  relPath: string;
}

export interface UsdIsaacSerializeResult {
  usda: string;
  meshPaths: MeshEmitRequest[];
  diagnostics: CompilerDiagnostic[];
}

const DEFAULT_MESH_PREFIX = './meshes/';
const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

/** Mate/legacy-joint kinds this serializer can lower to a UsdPhysics joint prim. */
type SupportedJointKind = 'fixed' | 'revolute' | 'prismatic';

function sanitizePrimName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

export async function usdIsaacSerialize(
  arm: Assembly,
  opts: UsdIsaacSerializeOptions,
): Promise<UsdIsaacSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const parts = arm.__parts();
  const legacyJoints = arm.__joints();
  const mates = arm.__mates();

  const meshPrefix = opts.meshPrefix ?? DEFAULT_MESH_PREFIX;
  const meshPaths: MeshEmitRequest[] = [];
  const rootName = sanitizePrimName(arm.name || 'Robot');

  const bodyBlocks: string[] = [];
  for (const part of parts) {
    const primName = sanitizePrimName(part.name);
    const density = part.density ?? opts.density;
    const lowered = await part.originalShape.lower();
    const inertial = linkInertialBlock(lowered, density);
    diagnostics.push(...inertial.diagnostics);
    const mp = lowered.massProperties(density ?? 1000);
    const meshRel = `${meshPrefix}${part.name}.stl`;
    meshPaths.push({ partName: part.name, shape: lowered, relPath: meshRel });

    if (!Number.isFinite(mp.mass) || mp.mass <= 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'export.usd.mass-missing',
        severity: 'error',
        message: `Link '${part.name}' has a non-finite or non-positive mass (${mp.mass}).`,
        hint: `Link '${part.name}' has a non-finite or non-positive mass. Pass density on arm.part('${part.name}', shape, { density }), or check the part's shape is closed and manifold.`,
        nextAction: NEXT_ACTIONS['export.usd.mass-missing'],
      });
      continue;
    }

    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    const com = mp.com.map(n => n * MM_TO_M);
    bodyBlocks.push([
      `    def Xform "${primName}" (`,
      `        prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysicsMassAPI"]`,
      `    )`,
      `    {`,
      `        float physics:mass = ${mp.mass.toFixed(6)}`,
      `        point3f physics:centerOfMass = (${com[0].toFixed(6)}, ${com[1].toFixed(6)}, ${com[2].toFixed(6)})`,
      `        float3 physics:diagonalInertia = (${ixx.toExponential(6)}, ${iyy.toExponential(6)}, ${izz.toExponential(6)})`,
      `        # off-diagonal terms (ixy, ixz, iyz), USD MassAPI carries only the diagonal:`,
      `        # ixy=${ixy.toExponential(6)} ixz=${ixz.toExponential(6)} iyz=${iyz.toExponential(6)}`,
      ``,
      `        def Mesh "visual" (`,
      `            prepend apiSchemas = ["MaterialBindingAPI"]`,
      `        )`,
      `        {`,
      `            asset:reference = @${meshRel}@`,
      `        }`,
      ``,
      `        def Mesh "collision" (`,
      `            prepend apiSchemas = ["PhysicsCollisionAPI"]`,
      `        )`,
      `        {`,
      `            asset:reference = @${meshRel}@`,
      `        }`,
      `    }`,
    ].join('\n'));
  }

  const jointBlocks: string[] = [];

  const lowerJoint = (
    name: string,
    kind: SupportedJointKind,
    parentName: string,
    childName: string,
    originMm: readonly [number, number, number],
    axis: readonly [number, number, number],
    limitsLower: number | undefined,
    limitsUpper: number | undefined,
    angular: boolean,
  ): void => {
    const jointType = kind === 'fixed'
      ? 'PhysicsFixedJoint'
      : kind === 'revolute'
        ? 'PhysicsRevoluteJoint'
        : 'PhysicsPrismaticJoint';
    const primName = sanitizePrimName(name);
    const origin = originMm.map(n => n * MM_TO_M);
    const lines = [
      `    def ${jointType} "${primName}"`,
      `    {`,
      `        rel physics:body0 = </${rootName}/${sanitizePrimName(parentName)}>`,
      `        rel physics:body1 = </${rootName}/${sanitizePrimName(childName)}>`,
      `        point3f physics:localPos0 = (${origin[0].toFixed(6)}, ${origin[1].toFixed(6)}, ${origin[2].toFixed(6)})`,
      `        point3f physics:localPos1 = (0, 0, 0)`,
    ];
    if (kind !== 'fixed') {
      lines.push(`        vector3f physics:axis = (${axis[0].toFixed(6)}, ${axis[1].toFixed(6)}, ${axis[2].toFixed(6)})`);
      if (limitsLower !== undefined && limitsUpper !== undefined) {
        const scale = angular ? (180 / Math.PI) : 1;
        lines.push(`        float physics:lowerLimit = ${(limitsLower * scale).toFixed(6)}`);
        lines.push(`        float physics:upperLimit = ${(limitsUpper * scale).toFixed(6)}`);
      }
      lines.push(`        float physics:drive:linear:stiffness = 0`);
      lines.push(`        float physics:drive:linear:damping = 0`);
    }
    lines.push(`    }`);
    jointBlocks.push(lines.join('\n'));
  };

  const partName = (id: string): string => parts.find(p => p.id === id)?.name ?? id;

  for (const j of legacyJoints) {
    const parent = partName(j.parentPartId);
    const child = partName(j.childPartId);
    if (j.kind === 'fixed' || j.kind === 'revolute' || j.kind === 'prismatic') {
      const limits = j.kind === 'revolute'
        ? (j.limitsDeg ? [j.limitsDeg[0] * DEG_TO_RAD, j.limitsDeg[1] * DEG_TO_RAD] as const : undefined)
        : (j.kind === 'prismatic' ? (j.limitsMm ? [j.limitsMm[0] * MM_TO_M, j.limitsMm[1] * MM_TO_M] as const : undefined) : undefined);
      lowerJoint(
        j.name, j.kind, parent, child, j.origin, (j.axis ?? [0, 0, 1]),
        limits?.[0], limits?.[1], j.kind === 'revolute',
      );
    } else {
      diagnostics.push(unsupportedJointDiag(j.name, j.kind));
    }
  }

  const resolveConnector = (ref: string): { partName: string; origin: [number, number, number]; axis: [number, number, number] } => {
    const [pName, connName] = ref.split('.');
    const part = parts.find(p => p.name === pName);
    const c = part?.mateConnectors.find(x => x.name === connName);
    const origin = (c?.origin && c.origin.kind === 'vec3')
      ? c.origin.value as [number, number, number]
      : [0, 0, 0] as [number, number, number];
    const axis = (c?.axis ?? [0, 0, 1]) as [number, number, number];
    return { partName: pName, origin, axis };
  };

  for (const m of mates) {
    const a = resolveConnector(m.a);
    const b = resolveConnector(m.b);
    if (m.type === 'fastened') {
      lowerJoint(m.name, 'fixed', a.partName, b.partName, a.origin, a.axis, undefined, undefined, false);
    } else if (m.type === 'revolute') {
      const limits = m.limitsDeg ? [m.limitsDeg[0] * DEG_TO_RAD, m.limitsDeg[1] * DEG_TO_RAD] as const : undefined;
      lowerJoint(m.name, 'revolute', a.partName, b.partName, a.origin, a.axis, limits?.[0], limits?.[1], true);
    } else if (m.type === 'prismatic') {
      const limits = m.limitsMm ? [m.limitsMm[0] * MM_TO_M, m.limitsMm[1] * MM_TO_M] as const : undefined;
      lowerJoint(m.name, 'prismatic', a.partName, b.partName, a.origin, a.axis, limits?.[0], limits?.[1], false);
    } else {
      diagnostics.push(unsupportedJointDiag(m.name, m.type));
    }
  }

  const fatal = diagnostics.some(d => d.severity === 'error');
  if (fatal) {
    return { usda: '', meshPaths: [], diagnostics };
  }

  const usda = [
    `#usda 1.0`,
    `(`,
    `    defaultPrim = "${rootName}"`,
    `    metersPerUnit = 1`,
    `    upAxis = "Z"`,
    `)`,
    ``,
    `def Xform "${rootName}" (`,
    `    prepend apiSchemas = ["PhysicsArticulationRootAPI"]`,
    `)`,
    `{`,
    ...bodyBlocks,
    ...jointBlocks,
    `}`,
    ``,
  ].join('\n');

  return { usda, meshPaths, diagnostics };
}

function unsupportedJointDiag(name: string, kind: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.usd.joint-unsupported',
    severity: 'error',
    message: `Joint/mate '${name}' has kind '${kind}', which has no UsdPhysics joint equivalent in this exporter.`,
    hint: `Joint/mate '${name}' has kind '${kind}'. The USD Isaac exporter only lowers fixed, revolute and prismatic mates. Restructure the mate graph, or export format: 'sdf-gazebo' which supports the full mate vocabulary.`,
    nextAction: NEXT_ACTIONS['export.usd.joint-unsupported'],
  };
}
