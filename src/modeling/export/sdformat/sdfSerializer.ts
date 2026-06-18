// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/sdformat/sdfSerializer.ts
//
// Pure SDFormat minimal-tier serializer. Emits <sdf><model> with
// per-link <pose> / <inertial> / <visual> / <collision>, plus <joint>
// blocks via mateToSdfJoint. Accepts closed kinematic loops (the URDF
// differentiator); ball mates emit native <joint type="ball"> with no
// decomposition.
//
// Simulator-facing frame conventions (verified against a real consumer):
//   - Every <link> carries a model-frame <pose> from the mate-graph solve
//     (solveMates at the default pose). Links emitted at identity stack at
//     the model origin and the spawned assembly snaps or explodes.
//   - A <joint> <pose> is relative to the CHILD link frame, so it is the
//     child-side connector origin — not the parent-side one.
//   - <axis><xyz> is expressed in the joint frame, which shares the child
//     link orientation: the child-side connector axis.
//   - Mesh geometry is kernelCAD-native mm; SDFormat consumes metres. Every
//     <mesh> carries <scale>0.001 0.001 0.001</scale> so visuals, collisions
//     and the (already-SI) inertials agree.
//   - The default mesh <uri> is the relative `meshes/<part>.stl`, resolved
//     against the .sdf file location — loadable without resource-path
//     environment setup.
//
// Structural validation happens here, not in a separate tool: every
// <joint>'s parent/child must reference a declared link; the version
// attribute is pinned to 1.10 — the newest spec the current simulator
// LTS generation parses (newer spec numbers are refused outright by the
// release consumers must actually run); no <sensor>/<plugin>/<world> in
// minimal tier.

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Transform } from '../../../shared/runtime/se3';
import { linkInertialBlock } from '../urdf/linkInertial';
import { solveMates } from '../../mates/solver';
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

const DEFAULT_MESH_PREFIX = 'meshes/';
const SDF_VERSION = '1.10';
const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;
/** kernelCAD shape geometry is mm; SDFormat consumes metres. */
const MESH_SCALE_BLOCK = '<scale>0.001 0.001 0.001</scale>';

export async function sdfSerialize(arm: Assembly, opts: SdfSerializeOptions): Promise<SdfSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const parts = arm.__parts();
  const meshPrefix = opts.meshPrefix ?? DEFAULT_MESH_PREFIX;
  const meshFormat = opts.meshFormat ?? 'stl';
  const meshPaths: MeshEmitRequest[] = [];

  // Per-link world poses at the default articulation pose. Without these
  // every link spawns at the model origin: visuals overlap and the physics
  // engine has to snap the joints together on the first step (closed loops
  // simply explode). A failed solve degrades to identity poses + a warning.
  const worldPoses = await solveLinkPoses(arm, diagnostics);

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
    const linkPose = worldPoses?.get(part.name);
    linkBlocks.push([
      `  <link name="${escapeXml(part.name)}">`,
      `    <pose>${linkPose !== undefined ? transformToPose(linkPose) : '0 0 0 0 0 0'}</pose>`,
      sdfInertial,
      `    <visual name="${escapeXml(part.name)}_visual">`,
      `      <geometry><mesh><uri>${meshUri}</uri>${MESH_SCALE_BLOCK}</mesh></geometry>`,
      `    </visual>`,
      `    <collision name="${escapeXml(part.name)}_collision">`,
      `      <geometry><mesh><uri>${meshUri}</uri>${MESH_SCALE_BLOCK}</mesh></geometry>`,
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

  // World anchor: a fixed virtual joint declared against the `world` frame
  // becomes a native SDFormat world-parent joint, so the model spawns
  // welded instead of free-falling.
  for (const vj of arm.__virtualJoints()) {
    if (vj.type !== 'fixed' || vj.parentFrame !== 'world') continue;
    if (!partNames.has(vj.childLink)) {
      diagnostics.push(danglingLinkRef(vj.name, vj.parentFrame, vj.childLink));
      return { sdf: '', meshPaths: [], diagnostics };
    }
    jointBlocks.push(
      `  <joint name="${escapeXml(vj.name)}" type="fixed"><parent>world</parent><child>${escapeXml(vj.childLink)}</child></joint>`,
    );
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

/** Solve the mate graph to per-link world transforms at the default pose.
 *  Returns undefined (and pushes a pose-unsolved warning) when the
 *  assembly has mates but the solve fails or does not converge. Assemblies
 *  without mates (single part / legacy joints only) solve trivially. */
async function solveLinkPoses(
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
): Promise<Map<string, Transform> | undefined> {
  try {
    // Articulated closed loops that already close at the default pose are
    // consistent — opt in to classifying them as solved so a 4-bar ships
    // real link poses instead of an identity-pose fallback.
    const solved = await solveMates(arm, undefined, { acceptConsistentArticulatedLoops: true });
    if (solved.status === 'solved' || solved.status === 'redundant-ok') {
      return solved.poses;
    }
    diagnostics.push(poseUnsolved(`mate-graph solve returned status '${solved.status}'`));
    return undefined;
  } catch (e) {
    diagnostics.push(poseUnsolved(e instanceof Error ? e.message : String(e)));
    return undefined;
  }
}

/** SE(3) transform (mm) -> SDF pose string `x y z roll pitch yaw` (m, rad).
 *  SDF pose rotation is extrinsic XYZ: R = Rz(yaw) * Ry(pitch) * Rx(roll). */
function transformToPose(t: Transform): string {
  const [x, y, z] = t.point([0, 0, 0]);
  // Rotation columns via direction transforms (no matrix accessor needed).
  const c0 = t.axisDir([1, 0, 0]);
  const c1 = t.axisDir([0, 1, 0]);
  const c2 = t.axisDir([0, 0, 1]);
  // Row-major elements R[row][col].
  const r00 = c0[0], r10 = c0[1], r20 = c0[2];
  const r11 = c1[1], r21 = c1[2];
  const r12 = c2[1], r22 = c2[2];
  let roll: number, pitch: number, yaw: number;
  const sinPitch = -r20;
  if (Math.abs(sinPitch) > 1 - 1e-9) {
    // Gimbal lock: pitch = ±90°, fold yaw into roll.
    pitch = sinPitch > 0 ? Math.PI / 2 : -Math.PI / 2;
    roll = Math.atan2(-r12, r11);
    yaw = 0;
  } else {
    pitch = Math.asin(sinPitch);
    roll = Math.atan2(r21, r22);
    yaw = Math.atan2(r10, r00);
  }
  const f = (n: number): string => {
    const s = n.toFixed(6);
    return s === '-0.000000' ? '0.000000' : s;
  };
  return `${f(x * MM_TO_M)} ${f(y * MM_TO_M)} ${f(z * MM_TO_M)} ${f(roll)} ${f(pitch)} ${f(yaw)}`;
}

function poseUnsolved(reason: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.sdf-gazebo.pose-unsolved',
    severity: 'warn',
    message: `Could not solve the mate graph to per-link poses (${reason}); all <link> poses were emitted at the model origin.`,
    hint: 'The mate graph could not be solved to per-link world poses, so every <link> was emitted at the model origin. The simulator will see overlapping links at spawn and joints will snap or explode. Run solve_mates to diagnose the unsolvable mate, fix the connector geometry, then re-export.',
    nextAction: NEXT_ACTIONS['export.sdf-gazebo.pose-unsolved'],
  };
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
