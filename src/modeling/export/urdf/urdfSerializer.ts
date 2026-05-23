// src/modeling/export/urdf/urdfSerializer.ts
//
// Pure URDF serializer. Walks an Assembly, validates tree-shape via the
// joint/mate-graph parent count, lowers each MateRecord through mateToJoint,
// emits one <link> per part with <inertial> + <visual> + <collision>,
// returns the .urdf string + mesh-emission requests + diagnostics.
//
// The IO wrapper (urdfWrite.ts) takes this output, writes the .urdf to disk,
// and exports per-link STL files into the sibling meshes/ dir.

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { mateToUrdfJoint, type ConnectorResolver, type DummyLinkSpec } from './mateToJoint';
import { linkInertialBlock } from './linkInertial';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface UrdfSerializeOptions {
  /** Default density applied to parts without `arm.part(..., { density })`. */
  density?: number;
  /** Mesh URI prefix; default `package://kernelcad_export/meshes/`. */
  meshPrefix?: string;
  /** Mesh file extension; only `stl` is supported in this build. */
  meshFormat?: 'stl' | 'dae';
}

export interface MeshEmitRequest {
  partName: string;
  shape: OcctBackend;
  relPath: string;
}

export interface UrdfSerializeResult {
  urdf: string;
  meshPaths: MeshEmitRequest[];
  diagnostics: CompilerDiagnostic[];
}

const DEFAULT_MESH_PREFIX = 'package://kernelcad_export/meshes/';
const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

export async function urdfSerialize(arm: Assembly, opts: UrdfSerializeOptions): Promise<UrdfSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const parts = arm.__parts();
  const legacyJoints = arm.__joints();
  const mates = arm.__mates();

  // Closed-loop detection: build a parent map (child -> [parents]) from
  // legacy joints + mates, refuse on multi-parent, then run a DFS cycle
  // check on the spanning-tree-projected single-parent graph.
  const parentByChild = new Map<string, string[]>();
  const recordEdge = (parent: string, child: string): void => {
    if (parent === child) return;
    const list = parentByChild.get(child) ?? [];
    list.push(parent);
    parentByChild.set(child, list);
  };
  for (const j of legacyJoints) {
    const parent = parts.find(p => p.id === j.parentPartId)?.name ?? String(j.parentPartId);
    const child = parts.find(p => p.id === j.childPartId)?.name ?? String(j.childPartId);
    recordEdge(parent, child);
  }
  for (const m of mates) {
    recordEdge(m.a.split('.')[0], m.b.split('.')[0]);
  }
  const closedLoopRefusal = (partName: string, reason: string): UrdfSerializeResult => {
    diagnostics.push({
      target: 'export-occt',
      code: 'export.urdf.closed-loop',
      severity: 'error',
      message: `Assembly has a closed kinematic loop: ${reason}.`,
      hint: `URDF requires a tree topology. Switch to export_model with format: 'sdf-gazebo' which supports closed loops natively, or restructure the mate graph so each part has at most one parent and forms a tree (root-to-leaf chain) — affected part: '${partName}'.`,
      nextAction: NEXT_ACTIONS['export.urdf.closed-loop'],
    });
    return { urdf: '', meshPaths: [], diagnostics };
  };
  for (const [child, ps] of parentByChild.entries()) {
    if (ps.length > 1) {
      return closedLoopRefusal(child, `part '${child}' has ${ps.length} parents`);
    }
  }
  // DFS cycle detection on the directed parent->child graph (each node has
  // at most one parent, so we walk from each child upward).
  const visited = new Set<string>();
  const onPath = new Set<string>();
  const dfs = (node: string): string | null => {
    if (visited.has(node)) return null;
    if (onPath.has(node)) return node;
    onPath.add(node);
    const parents = parentByChild.get(node) ?? [];
    for (const p of parents) {
      const cyc = dfs(p);
      if (cyc !== null) return cyc;
    }
    onPath.delete(node);
    visited.add(node);
    return null;
  };
  for (const part of parts) {
    const cyc = dfs(part.name);
    if (cyc !== null) {
      return closedLoopRefusal(cyc, `cycle reached '${cyc}' in the joint/mate graph`);
    }
  }

  const meshPrefix = opts.meshPrefix ?? DEFAULT_MESH_PREFIX;
  const meshFormat = opts.meshFormat ?? 'stl';

  // Per-part visual + collision + inertial. Lower the captured Shape to
  // OcctBackend so we can call massProperties on it.
  const linkBlocks: string[] = [];
  const meshPaths: MeshEmitRequest[] = [];
  const allDummyLinks: DummyLinkSpec[] = [];

  for (const part of parts) {
    const partName = part.name;
    const density = part.density ?? opts.density;
    const lowered = await part.originalShape.lower();
    const inertial = linkInertialBlock(lowered, density);
    diagnostics.push(...inertial.diagnostics);
    const meshRel = `meshes/${partName}.${meshFormat}`;
    const meshFilename = `${meshPrefix}${partName}.${meshFormat}`;
    meshPaths.push({ partName, shape: lowered, relPath: meshRel });
    linkBlocks.push([
      `  <link name="${escapeXml(partName)}">`,
      inertial.xml,
      `    <visual>`,
      `      <origin xyz="0 0 0" rpy="0 0 0"/>`,
      `      <geometry><mesh filename="${meshFilename}"/></geometry>`,
      `    </visual>`,
      `    <collision>`,
      `      <origin xyz="0 0 0" rpy="0 0 0"/>`,
      `      <geometry><mesh filename="${meshFilename}"/></geometry>`,
      `    </collision>`,
      `  </link>`,
    ].join('\n'));
  }

  // Legacy joint records.
  const jointBlocks: string[] = [];
  for (const j of legacyJoints) {
    const block = legacyJointToUrdf(j, parts, allDummyLinks);
    jointBlocks.push(block);
    if (j.kind === 'ball') {
      diagnostics.push({
        target: 'export-occt',
        code: 'export.urdf.ball-decomposed',
        severity: 'warn',
        message: `URDF lacks a spherical joint; legacy joint '${j.name}' was decomposed into three chained revolutes with two synthesised dummy links.`,
        hint: `URDF lacks a spherical joint; legacy joint '${j.name}' was decomposed into three chained revolutes with two synthesised dummy links. Switch to format: 'sdf-gazebo' for a native ball joint.`,
        nextAction: NEXT_ACTIONS['export.urdf.ball-decomposed'],
      });
    }
  }

  // Mate records via mateToUrdfJoint.
  const resolver = makeConnectorResolver(parts);
  for (const m of mates) {
    const r = mateToUrdfJoint(m, resolver);
    jointBlocks.push(...r.jointBlocks);
    diagnostics.push(...r.diagnostics);
    if (r.dummyLinks) allDummyLinks.push(...r.dummyLinks);
  }

  // Synthesised dummy links from ball decomposition.
  for (const d of allDummyLinks) {
    linkBlocks.push([
      `  <link name="${escapeXml(d.name)}">`,
      `    <inertial>`,
      `      <origin xyz="0 0 0" rpy="0 0 0"/>`,
      `      <mass value="${d.massKg}"/>`,
      `      <inertia ixx="1e-9" ixy="0" ixz="0" iyy="1e-9" iyz="0" izz="1e-9"/>`,
      `    </inertial>`,
      `  </link>`,
    ].join('\n'));
  }

  const urdf = [
    `<?xml version="1.0"?>`,
    `<robot name="${escapeXml(arm.name)}">`,
    ...linkBlocks,
    ...jointBlocks,
    `</robot>`,
    ``,
  ].join('\n');

  return { urdf, meshPaths, diagnostics };
}

function legacyJointToUrdf(
  j: AssemblyJointStored,
  parts: readonly AssemblyPartStored[],
  dummyLinks: DummyLinkSpec[],
): string {
  const parentName = parts.find(p => p.id === j.parentPartId)?.name ?? String(j.parentPartId);
  const childName = parts.find(p => p.id === j.childPartId)?.name ?? String(j.childPartId);
  const origin = j.origin.map(n => (n * MM_TO_M).toFixed(6)).join(' ');
  const axis = (j.axis ?? [0, 0, 1]).map(n => n.toFixed(6)).join(' ');
  switch (j.kind) {
    case 'fixed':
      return `  <joint name="${escapeXml(j.name)}" type="fixed"><parent link="${escapeXml(parentName)}"/><child link="${escapeXml(childName)}"/><origin xyz="${origin}" rpy="0 0 0"/></joint>`;
    case 'revolute': {
      const kind = j.limitsDeg ? 'revolute' : 'continuous';
      const limit = j.limitsDeg
        ? `<limit lower="${(j.limitsDeg[0] * DEG_TO_RAD).toFixed(6)}" upper="${(j.limitsDeg[1] * DEG_TO_RAD).toFixed(6)}" effort="1.0" velocity="1.0"/>`
        : '';
      return `  <joint name="${escapeXml(j.name)}" type="${kind}"><parent link="${escapeXml(parentName)}"/><child link="${escapeXml(childName)}"/><origin xyz="${origin}" rpy="0 0 0"/><axis xyz="${axis}"/>${limit}</joint>`;
    }
    case 'prismatic': {
      const limit = j.limitsMm
        ? `<limit lower="${(j.limitsMm[0] * MM_TO_M).toFixed(6)}" upper="${(j.limitsMm[1] * MM_TO_M).toFixed(6)}" effort="1.0" velocity="1.0"/>`
        : '';
      return `  <joint name="${escapeXml(j.name)}" type="prismatic"><parent link="${escapeXml(parentName)}"/><child link="${escapeXml(childName)}"/><origin xyz="${origin}" rpy="0 0 0"/><axis xyz="${axis}"/>${limit}</joint>`;
    }
    case 'ball': {
      // 3-revolute decomposition (parallels the MateRecord branch in
      // mateToJoint.ts so legacy joint shapes share the same dummy-link
      // synthesis convention).
      const dummy1 = `__${j.name}_dummy_X`;
      const dummy2 = `__${j.name}_dummy_Y`;
      dummyLinks.push(
        { name: dummy1, massKg: 1e-6 },
        { name: dummy2, massKg: 1e-6 },
      );
      return [
        `  <joint name="${escapeXml(j.name)}_x" type="continuous"><parent link="${escapeXml(parentName)}"/><child link="${escapeXml(dummy1)}"/><origin xyz="${origin}" rpy="0 0 0"/><axis xyz="1 0 0"/></joint>`,
        `  <joint name="${escapeXml(j.name)}_y" type="continuous"><parent link="${escapeXml(dummy1)}"/><child link="${escapeXml(dummy2)}"/><origin xyz="0 0 0" rpy="0 0 0"/><axis xyz="0 1 0"/></joint>`,
        `  <joint name="${escapeXml(j.name)}_z" type="continuous"><parent link="${escapeXml(dummy2)}"/><child link="${escapeXml(childName)}"/><origin xyz="0 0 0" rpy="0 0 0"/><axis xyz="0 0 1"/></joint>`,
      ].join('\n');
    }
  }
}

function makeConnectorResolver(parts: readonly AssemblyPartStored[]): ConnectorResolver {
  return (ref: string) => {
    const [partName, connName] = ref.split('.');
    const part = parts.find(p => p.name === partName);
    const c = part?.mateConnectors.find(x => x.name === connName);
    const origin = (c?.origin && c.origin.kind === 'vec3')
      ? c.origin.value as [number, number, number]
      : [0, 0, 0] as [number, number, number];
    const axis = (c?.axis ?? [0, 0, 1]) as [number, number, number];
    return { partName, origin, axis };
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
