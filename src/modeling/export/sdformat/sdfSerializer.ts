// src/modeling/export/sdformat/sdfSerializer.ts
//
// Pure SDFormat 1.12 minimal-tier serializer. Emits <sdf><model> with
// per-link <inertial> / <visual> / <collision>, plus <joint> blocks via
// mateToSdfJoint. Accepts closed kinematic loops (the URDF differentiator);
// ball mates emit native <joint type="ball"> with no decomposition.
//
// Structural validation happens here, not in a separate tool: every
// <joint>'s parent/child must reference a declared link; the version
// attribute is fixed at 1.12; no <sensor>/<plugin>/<world> in minimal tier.

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { linkInertialBlock } from '../urdf/linkInertial';
import { mateToSdfJoint, type ConnectorResolver } from './mateToSdfJoint';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface SdfSerializeOptions {
  density?: number;
  meshPrefix?: string;
  meshFormat?: 'stl' | 'dae';
}

export interface MeshEmitRequest {
  partName: string;
  shape: OcctBackend;
  relPath: string;
}

export interface SdfSerializeResult {
  sdf: string;
  meshPaths: MeshEmitRequest[];
  diagnostics: CompilerDiagnostic[];
}

const DEFAULT_MESH_PREFIX = 'model://kernelcad_export/meshes/';
const SDF_VERSION = '1.12';
const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;

export async function sdfSerialize(arm: Assembly, opts: SdfSerializeOptions): Promise<SdfSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const parts = arm.__parts();
  const meshPrefix = opts.meshPrefix ?? DEFAULT_MESH_PREFIX;
  const meshFormat = opts.meshFormat ?? 'stl';
  const meshPaths: MeshEmitRequest[] = [];

  // Per-part link blocks. Reuses the URDF linkInertialBlock — same
  // semantics; the wrapping XML differs.
  const linkBlocks: string[] = [];
  for (const part of parts) {
    const density = part.density ?? opts.density;
    const shape = await part.originalShape.lower();
    const inertial = linkInertialBlock(shape, density);
    diagnostics.push(...inertial.diagnostics);
    // URDF emits ixx/ixy/.../izz as attributes; SDF nests them as elements
    // inside <inertia>. Convert the URDF block to the SDF shape.
    const sdfInertial = urdfInertialToSdf(inertial.xml);
    const meshRel = `meshes/${part.name}.${meshFormat}`;
    const meshUri = `${meshPrefix}${part.name}.${meshFormat}`;
    meshPaths.push({ partName: part.name, shape, relPath: meshRel });
    linkBlocks.push([
      `  <link name="${escapeXml(part.name)}">`,
      sdfInertial,
      `    <visual name="${escapeXml(part.name)}_visual">`,
      `      <geometry><mesh><uri>${meshUri}</uri></mesh></geometry>`,
      `    </visual>`,
      `    <collision name="${escapeXml(part.name)}_collision">`,
      `      <geometry><mesh><uri>${meshUri}</uri></mesh></geometry>`,
      `    </collision>`,
      `  </link>`,
    ].join('\n'));
  }

  // Joint blocks via mateToSdfJoint + legacy joint records.
  const partNames = new Set(parts.map(p => p.name));
  const resolver = makeConnectorResolver(parts);
  const jointBlocks: string[] = [];

  for (const j of arm.__joints()) {
    const parent = parts.find(p => p.id === j.parentPartId)?.name ?? '';
    const child = parts.find(p => p.id === j.childPartId)?.name ?? '';
    if (!partNames.has(parent) || !partNames.has(child)) {
      diagnostics.push(danglingLinkRef(j.name, parent, child));
      return { sdf: '', meshPaths: [], diagnostics };
    }
    jointBlocks.push(legacyJointToSdf(j, parent, child));
  }
  for (const m of arm.__mates()) {
    const r = mateToSdfJoint(m, resolver);
    diagnostics.push(...r.diagnostics);
    jointBlocks.push(...r.jointBlocks);
  }

  const sdf = [
    `<?xml version="1.0"?>`,
    `<sdf version="${SDF_VERSION}">`,
    `  <model name="${escapeXml(arm.name)}">`,
    ...linkBlocks,
    ...jointBlocks,
    `  </model>`,
    `</sdf>`,
    ``,
  ].join('\n');
  return { sdf, meshPaths, diagnostics };
}

function urdfInertialToSdf(urdfBlock: string): string {
  // Convert <inertia ixx="..." ixy="..." .../> to SDF's nested form.
  const ixx = urdfBlock.match(/ixx="([^"]+)"/)?.[1] ?? '0';
  const ixy = urdfBlock.match(/ixy="([^"]+)"/)?.[1] ?? '0';
  const ixz = urdfBlock.match(/ixz="([^"]+)"/)?.[1] ?? '0';
  const iyy = urdfBlock.match(/iyy="([^"]+)"/)?.[1] ?? '0';
  const iyz = urdfBlock.match(/iyz="([^"]+)"/)?.[1] ?? '0';
  const izz = urdfBlock.match(/izz="([^"]+)"/)?.[1] ?? '0';
  const mass = urdfBlock.match(/<mass value="([^"]+)"/)?.[1] ?? '0';
  const com = urdfBlock.match(/<origin xyz="([^"]+)"/)?.[1] ?? '0 0 0';
  return [
    `    <inertial>`,
    `      <pose>${com} 0 0 0</pose>`,
    `      <mass>${mass}</mass>`,
    `      <inertia>`,
    `        <ixx>${ixx}</ixx><ixy>${ixy}</ixy><ixz>${ixz}</ixz>`,
    `        <iyy>${iyy}</iyy><iyz>${iyz}</iyz><izz>${izz}</izz>`,
    `      </inertia>`,
    `    </inertial>`,
  ].join('\n');
}

function legacyJointToSdf(j: AssemblyJointStored, parent: string, child: string): string {
  const pose = `${(j.origin[0] * MM_TO_M).toFixed(6)} ${(j.origin[1] * MM_TO_M).toFixed(6)} ${(j.origin[2] * MM_TO_M).toFixed(6)} 0 0 0`;
  const axis = (j.axis ?? [0, 0, 1]).map(n => n.toFixed(6)).join(' ');
  switch (j.kind) {
    case 'fixed':
      return `  <joint name="${escapeXml(j.name)}" type="fixed"><parent>${escapeXml(parent)}</parent><child>${escapeXml(child)}</child><pose>${pose}</pose></joint>`;
    case 'revolute': {
      const limit = j.limitsDeg
        ? `<limit><lower>${(j.limitsDeg[0] * DEG_TO_RAD).toFixed(6)}</lower><upper>${(j.limitsDeg[1] * DEG_TO_RAD).toFixed(6)}</upper></limit>`
        : '';
      return `  <joint name="${escapeXml(j.name)}" type="revolute"><parent>${escapeXml(parent)}</parent><child>${escapeXml(child)}</child><pose>${pose}</pose><axis><xyz>${axis}</xyz>${limit}</axis></joint>`;
    }
    case 'prismatic': {
      const limit = j.limitsMm
        ? `<limit><lower>${(j.limitsMm[0] * MM_TO_M).toFixed(6)}</lower><upper>${(j.limitsMm[1] * MM_TO_M).toFixed(6)}</upper></limit>`
        : '';
      return `  <joint name="${escapeXml(j.name)}" type="prismatic"><parent>${escapeXml(parent)}</parent><child>${escapeXml(child)}</child><pose>${pose}</pose><axis><xyz>${axis}</xyz>${limit}</axis></joint>`;
    }
    case 'ball':
      return `  <joint name="${escapeXml(j.name)}" type="ball"><parent>${escapeXml(parent)}</parent><child>${escapeXml(child)}</child><pose>${pose}</pose></joint>`;
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

function danglingLinkRef(jointName: string, parent: string, child: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.sdf-gazebo.dangling-link-ref',
    severity: 'error',
    message: `Joint '${jointName}' references undeclared link(s): parent='${parent}', child='${child}'.`,
    hint: 'Every joint must reference parts declared via arm.part(). Call inspect_robot to see the link/joint shape before export.',
    nextAction: NEXT_ACTIONS['export.sdf-gazebo.dangling-link-ref'],
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
