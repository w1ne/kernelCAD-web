// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// URDF + Fusion 360 + OnShape converged mate vocabulary (7 types).
// DOF table + connector-pair compatibility per spec
// `2026-05-11-assembly-mates-validator-design.md` §"v0.6 full mates+connector API".

import type { ConnectorType } from './connector';

export type MateType =
  | 'fastened'
  | 'revolute'
  | 'prismatic'
  | 'cylindrical'
  | 'planar'
  | 'ball'
  | 'pin_slot';

export const MATE_TYPES: readonly MateType[] = [
  'fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot',
] as const;

const DOF_TABLE: Record<MateType, number> = {
  fastened: 6,
  revolute: 5,
  prismatic: 5,
  cylindrical: 4,
  planar: 3,
  ball: 3,
  pin_slot: 4,
};

export function dofRemovedFor(t: MateType): number {
  return DOF_TABLE[t];
}

const PAIR_TABLE: Record<MateType, ReadonlyArray<readonly [ConnectorType, ConnectorType]>> = {
  fastened: [['frame', 'frame']],
  revolute: [['axis', 'axis']],
  prismatic: [['axis', 'axis']],
  cylindrical: [['axis', 'axis']],
  planar: [['planar', 'planar']],
  ball: [['ball', 'ball']],
  pin_slot: [['axis', 'axis']],
};

export function isCompatiblePair(
  mate: MateType,
  a: ConnectorType,
  b: ConnectorType,
): boolean {
  return PAIR_TABLE[mate].some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
