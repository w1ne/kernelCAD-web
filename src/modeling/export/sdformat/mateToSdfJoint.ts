// src/modeling/export/sdformat/mateToSdfJoint.ts
//
// SDFormat joint lowering. Same shape as the URDF lowerer except
// (a) ball is native (no decomposition), (b) <pose> replaces
// <origin xyz rpy>, (c) limits live inside <axis><limit><lower>/<upper>.
// Cylindrical and pin_slot remain lossy — SDFormat lacks them too.
//
// Frame conventions (these differ from URDF and were verified against a
// real simulator consumer): an SDFormat <joint> <pose> is relative to the
// CHILD link frame, and <axis><xyz> is expressed in the joint frame (which
// shares the child link orientation). Both therefore come from the
// child-side (`mate.b`) connector — emitting the parent-side connector
// places the joint anchor at the wrong point and the link pivots around
// the wrong axis whenever the two connector origins differ.

import type { MateRecord } from '../../mates/mate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

type Vec3 = [number, number, number];

export interface ResolvedConnector {
  partName: string;
  origin: Vec3;
  axis: Vec3;
}
export type ConnectorResolver = (ref: string) => ResolvedConnector;

export interface MateToSdfJointResult {
  jointBlocks: string[];
  diagnostics: CompilerDiagnostic[];
}

const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

export function mateToSdfJoint(mate: MateRecord, resolver: ConnectorResolver): MateToSdfJointResult {
  const a = resolver(mate.a);
  const b = resolver(mate.b);
  const parent = a.partName;
  const child = b.partName;
  // Child-frame-relative anchor + joint-frame axis: both from the b side.
  const pose = poseTuple(b.origin);
  const axis = b.axis.map(n => n.toFixed(6)).join(' ');

  switch (mate.type) {
    case 'fastened':
      return { jointBlocks: [fixedJoint(mate.name, parent, child, pose)], diagnostics: [] };
    case 'revolute':
      return {
        jointBlocks: [singleDof(mate.name, 'revolute', parent, child, pose, axis, radLimits(mate.limitsDeg))],
        diagnostics: [],
      };
    case 'prismatic':
      return {
        jointBlocks: [singleDof(mate.name, 'prismatic', parent, child, pose, axis, mLimits(mate.limitsMm))],
        diagnostics: [],
      };
    case 'ball':
      return { jointBlocks: [ballJoint(mate.name, parent, child, pose)], diagnostics: [] };
    case 'planar':
      return { jointBlocks: [planarJoint(mate.name, parent, child, pose, axis)], diagnostics: [] };
    case 'cylindrical':
      return {
        jointBlocks: [singleDof(mate.name, 'revolute', parent, child, pose, axis, radLimits(mate.limitsDeg))],
        diagnostics: [lossy('export.sdf-gazebo.cylindrical-lossy', mate)],
      };
    case 'pin_slot':
      return {
        jointBlocks: [singleDof(mate.name, 'revolute', parent, child, pose, axis, radLimits(mate.limitsDeg))],
        diagnostics: [lossy('export.sdf-gazebo.pin-slot-lossy', mate)],
      };
  }
}

function poseTuple(originMm: Vec3): string {
  return `${(originMm[0] * MM_TO_M).toFixed(6)} ${(originMm[1] * MM_TO_M).toFixed(6)} ${(originMm[2] * MM_TO_M).toFixed(6)} 0 0 0`;
}
function radLimits(d: readonly [number, number] | undefined): string {
  return d ? `<limit><lower>${(d[0] * DEG_TO_RAD).toFixed(6)}</lower><upper>${(d[1] * DEG_TO_RAD).toFixed(6)}</upper></limit>` : '';
}
function mLimits(d: readonly [number, number] | undefined): string {
  return d ? `<limit><lower>${(d[0] * MM_TO_M).toFixed(6)}</lower><upper>${(d[1] * MM_TO_M).toFixed(6)}</upper></limit>` : '';
}
function fixedJoint(name: string, parent: string, child: string, pose: string): string {
  return `  <joint name="${escapeXml(name)}" type="fixed">\n    <parent>${escapeXml(parent)}</parent>\n    <child>${escapeXml(child)}</child>\n    <pose>${pose}</pose>\n  </joint>`;
}
function singleDof(name: string, type: 'revolute' | 'prismatic', parent: string, child: string, pose: string, axis: string, limit: string): string {
  return `  <joint name="${escapeXml(name)}" type="${type}">\n    <parent>${escapeXml(parent)}</parent>\n    <child>${escapeXml(child)}</child>\n    <pose>${pose}</pose>\n    <axis><xyz>${axis}</xyz>${limit}</axis>\n  </joint>`;
}
function ballJoint(name: string, parent: string, child: string, pose: string): string {
  return `  <joint name="${escapeXml(name)}" type="ball">\n    <parent>${escapeXml(parent)}</parent>\n    <child>${escapeXml(child)}</child>\n    <pose>${pose}</pose>\n  </joint>`;
}
function planarJoint(name: string, parent: string, child: string, pose: string, axis: string): string {
  return `  <joint name="${escapeXml(name)}" type="planar">\n    <parent>${escapeXml(parent)}</parent>\n    <child>${escapeXml(child)}</child>\n    <pose>${pose}</pose>\n    <axis><xyz>${axis}</xyz></axis>\n  </joint>`;
}
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type LossyCode = 'export.sdf-gazebo.cylindrical-lossy' | 'export.sdf-gazebo.pin-slot-lossy';

function lossy(code: LossyCode, mate: MateRecord): CompilerDiagnostic {
  const hints: Record<LossyCode, string> = {
    'export.sdf-gazebo.cylindrical-lossy': `SDFormat lacks a 2-DOF cylindrical joint; mate '${mate.name}' was emitted as a revolute and the prismatic DOF was dropped.`,
    'export.sdf-gazebo.pin-slot-lossy': `SDFormat lacks a pin-slot joint; mate '${mate.name}' was emitted as a revolute and the slot translation DOF was dropped.`,
  };
  return {
    target: 'export-occt',
    code,
    severity: 'warn',
    message: hints[code],
    hint: hints[code],
    nextAction: NEXT_ACTIONS[code],
  };
}
