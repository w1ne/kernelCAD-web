// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/urdf/mateToJoint.ts
//
// Lowers a kernelCAD MateRecord to one or more URDF <joint> blocks
// per the mate-mapping table in the B-rest design spec.
//
// Lossy mappings emit `export.urdf.<kind>-lossy` diagnostics with hint +
// nextAction; the agent decides whether to accept the lossy mapping or
// restructure the assembly.

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

export interface DummyLinkSpec {
  name: string;
  /** Negligible point mass. The serialiser stamps a 1e-6 kg inertial block. */
  massKg: number;
}

export interface MateToJointResult {
  jointBlocks: string[];
  diagnostics: CompilerDiagnostic[];
  dummyLinks?: DummyLinkSpec[];
}

const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

/** Lower a single MateRecord into URDF joint XML + diagnostics. */
export function mateToUrdfJoint(
  mate: MateRecord,
  resolver: ConnectorResolver,
): MateToJointResult {
  const a = resolver(mate.a);
  const b = resolver(mate.b);
  const parent = a.partName;
  const child = b.partName;
  const origin = a.origin;
  const axis = a.axis;

  switch (mate.type) {
    case 'fastened':
      return {
        jointBlocks: [fixedJoint(mate.name, parent, child, origin)],
        diagnostics: [],
      };
    case 'revolute': {
      const kind = mate.limitsDeg !== undefined ? 'revolute' : 'continuous';
      return {
        jointBlocks: [revoluteJoint(mate.name, kind, parent, child, origin, axis, mate.limitsDeg)],
        diagnostics: [],
      };
    }
    case 'prismatic':
      return {
        jointBlocks: [prismaticJoint(mate.name, parent, child, origin, axis, mate.limitsMm)],
        diagnostics: [],
      };
    case 'planar':
      return {
        jointBlocks: [planarJoint(mate.name, parent, child, origin, axis)],
        diagnostics: [],
      };
    case 'cylindrical': {
      const kind = mate.limitsDeg !== undefined ? 'revolute' : 'continuous';
      return {
        jointBlocks: [revoluteJoint(mate.name, kind, parent, child, origin, axis, mate.limitsDeg)],
        diagnostics: [lossyDiag('export.urdf.cylindrical-lossy', mate)],
      };
    }
    case 'pin_slot': {
      const kind = mate.limitsDeg !== undefined ? 'revolute' : 'continuous';
      return {
        jointBlocks: [revoluteJoint(mate.name, kind, parent, child, origin, axis, mate.limitsDeg)],
        diagnostics: [lossyDiag('export.urdf.pin-slot-lossy', mate)],
      };
    }
    case 'ball': {
      // 3 chained revolutes around X, Y, Z with 2 dummy intermediate links.
      const dummy1 = `__${mate.name}_dummy_X`;
      const dummy2 = `__${mate.name}_dummy_Y`;
      const jx = revoluteJoint(`${mate.name}_x`, 'continuous', parent, dummy1, origin, [1, 0, 0], undefined);
      const jy = revoluteJoint(`${mate.name}_y`, 'continuous', dummy1, dummy2, [0, 0, 0], [0, 1, 0], undefined);
      const jz = revoluteJoint(`${mate.name}_z`, 'continuous', dummy2, child, [0, 0, 0], [0, 0, 1], undefined);
      return {
        jointBlocks: [jx, jy, jz],
        diagnostics: [lossyDiag('export.urdf.ball-decomposed', mate)],
        dummyLinks: [
          { name: dummy1, massKg: 1e-6 },
          { name: dummy2, massKg: 1e-6 },
        ],
      };
    }
  }
}

// XML emit helpers -------------------------------------------------------

function fixedJoint(name: string, parent: string, child: string, originMm: Vec3): string {
  return [
    `  <joint name="${escapeXml(name)}" type="fixed">`,
    `    <parent link="${escapeXml(parent)}"/>`,
    `    <child link="${escapeXml(child)}"/>`,
    `    <origin xyz="${xyzMmToM(originMm)}" rpy="0 0 0"/>`,
    `  </joint>`,
  ].join('\n');
}

function revoluteJoint(
  name: string,
  kind: 'revolute' | 'continuous',
  parent: string,
  child: string,
  originMm: Vec3,
  axis: Vec3,
  limitsDeg: readonly [number, number] | undefined,
): string {
  const limitLine = kind === 'revolute' && limitsDeg
    ? `    <limit lower="${(limitsDeg[0] * DEG_TO_RAD).toFixed(6)}" upper="${(limitsDeg[1] * DEG_TO_RAD).toFixed(6)}" effort="1.0" velocity="1.0"/>`
    : '';
  return [
    `  <joint name="${escapeXml(name)}" type="${kind}">`,
    `    <parent link="${escapeXml(parent)}"/>`,
    `    <child link="${escapeXml(child)}"/>`,
    `    <origin xyz="${xyzMmToM(originMm)}" rpy="0 0 0"/>`,
    `    <axis xyz="${axis.map(n => n.toFixed(6)).join(' ')}"/>`,
    ...(limitLine ? [limitLine] : []),
    `  </joint>`,
  ].join('\n');
}

function prismaticJoint(
  name: string,
  parent: string,
  child: string,
  originMm: Vec3,
  axis: Vec3,
  limitsMm: readonly [number, number] | undefined,
): string {
  const limitLine = limitsMm
    ? `    <limit lower="${(limitsMm[0] * MM_TO_M).toFixed(6)}" upper="${(limitsMm[1] * MM_TO_M).toFixed(6)}" effort="1.0" velocity="1.0"/>`
    : '';
  return [
    `  <joint name="${escapeXml(name)}" type="prismatic">`,
    `    <parent link="${escapeXml(parent)}"/>`,
    `    <child link="${escapeXml(child)}"/>`,
    `    <origin xyz="${xyzMmToM(originMm)}" rpy="0 0 0"/>`,
    `    <axis xyz="${axis.map(n => n.toFixed(6)).join(' ')}"/>`,
    ...(limitLine ? [limitLine] : []),
    `  </joint>`,
  ].join('\n');
}

function planarJoint(name: string, parent: string, child: string, originMm: Vec3, normal: Vec3): string {
  return [
    `  <joint name="${escapeXml(name)}" type="planar">`,
    `    <parent link="${escapeXml(parent)}"/>`,
    `    <child link="${escapeXml(child)}"/>`,
    `    <origin xyz="${xyzMmToM(originMm)}" rpy="0 0 0"/>`,
    `    <axis xyz="${normal.map(n => n.toFixed(6)).join(' ')}"/>`,
    `  </joint>`,
  ].join('\n');
}

function xyzMmToM(v: Vec3): string {
  return v.map(n => (n * MM_TO_M).toFixed(6)).join(' ');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type LossyCode =
  | 'export.urdf.cylindrical-lossy'
  | 'export.urdf.pin-slot-lossy'
  | 'export.urdf.ball-decomposed';

function lossyDiag(code: LossyCode, mate: MateRecord): CompilerDiagnostic {
  const hintByCode: Record<LossyCode, string> = {
    'export.urdf.cylindrical-lossy': `URDF lacks a 2-DOF cylindrical joint; mate '${mate.name}' was emitted as a single revolute and the prismatic DOF was dropped.`,
    'export.urdf.pin-slot-lossy': `URDF lacks a pin-slot joint; mate '${mate.name}' was emitted as a single revolute and the slot translation DOF was dropped.`,
    'export.urdf.ball-decomposed': `URDF lacks a spherical joint; mate '${mate.name}' was decomposed into three chained revolutes with two synthesised dummy links.`,
  };
  return {
    target: 'export-occt',
    code,
    severity: 'warn',
    message: hintByCode[code],
    hint: hintByCode[code],
    nextAction: NEXT_ACTIONS[code],
  };
}
