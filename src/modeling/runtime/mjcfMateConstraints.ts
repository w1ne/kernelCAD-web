// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { MateRecord } from '../mates/mate';
import { parseConnectorRef } from '../mates/mate';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type { TransmissionIntentRecord } from '../capture/assembly';
import { escapeXml, fmtNum, sanitizeJointName } from './mjcfXmlFormat';

const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;

/** A coupling kind that this physics backend cannot faithfully map. */
export class UnsupportedMjcfCouplingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMjcfCouplingError';
  }
}

/**
 * Map authored single-scalar mate couplings to MuJoCo joint equalities.
 * `coupleMates(driven, { source, ratio, offset })` means
 * `qDriven = ratio * qSource + offset`; MJCF stores joint positions in
 * radians/metres, so convert the ratio as well as the offset.
 */
export function emitMateCouplingBlock(
  mates: readonly MateRecord[],
  couplings: readonly MateCouplingRecord[],
): string[] {
  if (couplings.length === 0) return [];
  const mateByName = new Map(mates.map((mate) => [mate.name, mate]));
  const lines = ['  <equality>'];
  for (const coupling of couplings) {
    const source = mateByName.get(coupling.source);
    const driven = mateByName.get(coupling.driven);
    if (source === undefined || driven === undefined) {
      throw new UnsupportedMjcfCouplingError(
        `Coupling '${coupling.driven}' from '${coupling.source}' cannot be represented because one of its mate names is missing. Declare both mates before requesting a physics verdict.`,
      );
    }
    const sourceCoordinate = scalarCoordinate(source);
    const drivenCoordinate = scalarCoordinate(driven);
    if (sourceCoordinate === undefined || drivenCoordinate === undefined) {
      const unsupported = sourceCoordinate === undefined ? source : driven;
      throw new UnsupportedMjcfCouplingError(
        `Coupling '${coupling.driven}' from '${coupling.source}' cannot be represented because mate '${unsupported.name}' has type '${unsupported.type}'. Physics supports scalar revolute, prismatic, cylindrical-angle, and pin-slot-angle couplings; this coupling remains unverified.`,
      );
    }

    // MuJoCo equality joint uses qDriven - qDriven0 = a0 + a1 *
    // (qSource - qSource0). Both emitted joints have qpos0 = 0.
    const ratioSi = coupling.ratio * drivenCoordinate.toSi / sourceCoordinate.toSi;
    const offsetSi = (coupling.offset ?? 0) * drivenCoordinate.toSi;
    lines.push(
      `    <joint name="${escapeXml(`kc-coupling-${coupling.driven}`)}" joint1="${escapeXml(sanitizeJointName(driven.name))}" joint2="${escapeXml(sanitizeJointName(source.name))}" polycoef="${fmtNum(offsetSi)} ${fmtNum(ratioSi)} 0 0 0" solref="0.001 1" solimp="0.9999 0.9999 0.001"/>`,
    );
  }
  lines.push('  </equality>');
  return lines;
}

type ScalarCoordinate = { readonly kind: 'angle' | 'length'; readonly toSi: number };

function scalarCoordinate(mate: MateRecord): ScalarCoordinate | undefined {
  switch (mate.type) {
    case 'revolute':
    case 'cylindrical': // MJCF intentionally models the rotational scalar only.
    case 'pin_slot': // MJCF intentionally models the rotational scalar only.
      return { kind: 'angle', toSi: DEG_TO_RAD };
    case 'prismatic':
      return { kind: 'length', toSi: MM_TO_M };
    default:
      return undefined;
  }
}

/**
 * Emit native collision exclusions for articulated mate pairs and ideal
 * gear meshes. A declared scalar equality already models a gear pair's
 * tooth transfer, so resolving tooth contact as well double-counts the
 * same constraint and can drive the gear ratio off its authored value.
 */
export function emitContactBlock(
  mates: readonly MateRecord[],
  couplings: readonly MateCouplingRecord[],
  transmissions: readonly TransmissionIntentRecord[],
  parts: readonly { readonly name: string }[],
): string[] {
  if (mates.length === 0 && transmissions.length === 0) return [];
  const groupOf = rigidGroups(mates);
  const partNames = new Set(parts.map((part) => part.name));
  const seen = new Set<string>();
  const lines: string[] = [];
  const exclude = (a: string, b: string) => {
    const key = [a, b].sort().join('\u0000');
    if (a === b || seen.has(key)) return;
    seen.add(key);
    lines.push(`    <exclude body1="${escapeXml(a)}" body2="${escapeXml(b)}"/>`);
  };

  appendMateExclusions(mates, groupOf, exclude);
  appendGearPairExclusions(transmissions, couplings, partNames, exclude);

  return lines.length === 0 ? [] : ['  <contact>', ...lines, '  </contact>'];
}

type AddContactExclusion = (a: string, b: string) => void;

function appendMateExclusions(
  mates: readonly MateRecord[],
  groupOf: ReadonlyMap<string, string[]>,
  exclude: AddContactExclusion,
): void {
  for (const group of new Set(groupOf.values())) {
    group.forEach((a, index) => group.slice(index + 1).forEach((b) => exclude(a, b)));
  }
  for (const mate of mates) {
    if (mate.type === 'fastened') continue;
    const [a, b] = mateEnds(mate);
    for (const memberA of groupOf.get(a) ?? [a]) {
      for (const memberB of groupOf.get(b) ?? [b]) exclude(memberA, memberB);
    }
  }
}

function appendGearPairExclusions(
  transmissions: readonly TransmissionIntentRecord[],
  couplings: readonly MateCouplingRecord[],
  partNames: ReadonlySet<string>,
  exclude: AddContactExclusion,
): void {
  for (const transmission of transmissions) {
    if (transmission.kind !== 'gear-pair') continue;
    const hasIdealCoupling = couplings.some((coupling) =>
      coupling.source === transmission.sourceMate && transmission.drivenMates.includes(coupling.driven),
    );
    if (!hasIdealCoupling) continue;
    for (let index = 0; index + 1 < transmission.path.length; index++) {
      const a = transmission.path[index]!;
      const b = transmission.path[index + 1]!;
      if (partNames.has(a) && partNames.has(b)) exclude(a, b);
    }
  }
}

const mateEnds = (mate: MateRecord) => [
  parseConnectorRef(mate.a).partName,
  parseConnectorRef(mate.b).partName,
] as const;

/** Union-find over fastened mates: part name → its rigid-group members. */
function rigidGroups(mates: readonly MateRecord[]): Map<string, string[]> {
  const parent = new Map<string, string>();
  const find = (name: string): string => {
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (const mate of mates) for (const name of mateEnds(mate)) if (!parent.has(name)) parent.set(name, name);
  for (const mate of mates) {
    if (mate.type !== 'fastened') continue;
    const [a, b] = mateEnds(mate);
    parent.set(find(a), find(b));
  }
  const members = new Map<string, string[]>();
  for (const name of parent.keys()) {
    const root = find(name);
    members.set(root, [...(members.get(root) ?? []), name]);
  }
  const groupOf = new Map<string, string[]>();
  for (const group of members.values()) for (const name of group) groupOf.set(name, group);
  return groupOf;
}
