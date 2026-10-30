// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { Transform } from '../../../../src/shared/runtime/se3';
import { buildRigTree, collectRigWarnings, type SolvedRigAssembly, type RigNode } from '../../../../src/kernel/export/rigHierarchy';

function findNode(nodes: readonly RigNode[], name: string): RigNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findNode(node.children, name);
    if (found) return found;
  }
  return undefined;
}

function rigAssembly(overrides: Partial<SolvedRigAssembly> = {}): SolvedRigAssembly {
  return {
    groundedPart: 'base',
    parts: [
      { name: 'base', worldTransform: Transform.identity().toMat4() },
      { name: 'lid', worldTransform: Transform.translation(10, 0, 0).toMat4() },
    ],
    mates: [{ name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge', limitsDeg: [0, 110] }],
    connectorsByPartName: {
      base: [{ name: 'hinge', type: 'axis', origin: [10, 0, 0], axis: [0, 0, 1] }],
      lid: [{ name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] }],
    },
    ...overrides,
  };
}

function point(matrix: readonly number[], p: readonly [number, number, number]): [number, number, number] {
  return [
    matrix[0]! * p[0] + matrix[4]! * p[1] + matrix[8]! * p[2] + matrix[12]!,
    matrix[1]! * p[0] + matrix[5]! * p[1] + matrix[9]! * p[2] + matrix[13]!,
    matrix[2]! * p[0] + matrix[6]! * p[1] + matrix[10]! * p[2] + matrix[14]!,
  ];
}

function multiply(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!;
    }
  }
  return out;
}

describe('buildRigTree', () => {
  it('places a revolute lid under its hinge pivot and swings its far corner by 90 degrees', () => {
    const assembly = rigAssembly();
    const tree = buildRigTree(assembly);
    const pivot = findNode(tree, 'pivot:lid')!;
    const lid = findNode(tree, 'lid')!;
    expect(pivot.children).toContain(lid);
    expect(pivot.rig).toMatchObject({ type: 'rotate', axis: 'z', range: [0, 110], node: 'pivot:lid' });
    expect(pivot.matrix[12]).toBeCloseTo(10);

    const movedPivot = multiply(pivot.matrix, Transform.rotationAxisAngleDeg([0, 0, 1], 90).toMat4());
    const meshOffset = Transform.translation(10, 0, 0).inverse().toMat4();
    const farCornerWorld = [10, 20, 10] as const;
    const movedCorner = point(multiply(multiply(movedPivot, lid.matrix), meshOffset), farCornerWorld);
    expect(movedCorner[0]).toBeCloseTo(-10);
    expect(movedCorner[1]).toBeCloseTo(0);
    expect(movedCorner[2]).toBeCloseTo(10);
  });

  it('records prismatic limits in millimetres and aligns the local slide axis to z', () => {
    const tree = buildRigTree(rigAssembly({
      mates: [{ name: 'drawer-slide', type: 'prismatic', a: 'base.rail', b: 'lid.rail', limitsMm: [-20, 35] }],
      connectorsByPartName: {
        base: [{ name: 'rail', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] }],
        lid: [{ name: 'rail', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] }],
      },
    }));
    expect(findNode(tree, 'pivot:drawer-slide')?.rig).toMatchObject({
      type: 'slide', axis: 'z', range: [-20, 35],
    });
    const pivot = findNode(tree, 'pivot:drawer-slide')!;
    expect(pivot.matrix[8]).toBeCloseTo(0);
    expect(pivot.matrix[9]).toBeCloseTo(1);
    expect(pivot.matrix[10]).toBeCloseTo(0);
  });

  it('preserves both cylindrical degrees of freedom and both ranges', () => {
    const tree = buildRigTree(rigAssembly({
      mates: [{
        name: 'sleeve', type: 'cylindrical', a: 'base.axis', b: 'lid.axis',
        limitsDeg: [-90, 90], limitsMm: [0, 25],
      }],
      connectorsByPartName: {
        base: [{ name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] }],
        lid: [{ name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] }],
      },
    }));
    expect(findNode(tree, 'pivot:sleeve')?.rig).toMatchObject({
      type: 'rotate', axis: 'z', range: [-90, 90],
      degreesOfFreedom: ['rotate', 'slide'], slideRange: [0, 25],
    });
  });

  it('expresses explicit limits relative to a non-zero posed joint zero', () => {
    const tree = buildRigTree(rigAssembly({
      mates: [
        { name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge', limitsDeg: [0, 110], pose: 35 },
        { name: 'drawer-slide', type: 'prismatic', a: 'base.rail', b: 'lid.rail', limitsMm: [-20, 35], pose: 5 },
        { name: 'sleeve', type: 'cylindrical', a: 'base.axis', b: 'lid.axis', limitsDeg: [-90, 90], limitsMm: [0, 25], pose: 30 },
      ],
      connectorsByPartName: {
        base: [
          { name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
          { name: 'rail', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] },
          { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] },
        ],
        lid: [
          { name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
          { name: 'rail', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] },
          { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 1, 0] },
        ],
      },
    }));

    expect(findNode(tree, 'pivot:lid')?.rig?.range).toEqual([-35, 75]);
    expect(findNode(tree, 'pivot:drawer-slide')?.rig?.range).toEqual([-25, 30]);
    expect(findNode(tree, 'pivot:sleeve')?.rig).toMatchObject({
      range: [-120, 60],
      slideRange: [0, 25],
    });
  });

  it('keeps loop-closing mates outside the spanning tree and marks them closed', () => {
    const parts = ['base', 'b', 'c', 'd'].map((name, i) => ({
      name,
      worldTransform: Transform.translation(i * 10, 0, 0).toMat4(),
    }));
    const names = ['base', 'b', 'c', 'd'];
    const mates = names.map((name, i) => ({
      name: `edge-${i}`,
      type: 'revolute' as const,
      a: `${name}.joint`,
      b: `${names[(i + 1) % names.length]}.joint`,
    }));
    const connectorsByPartName = Object.fromEntries(names.map((name) => [name, [
      { name: 'joint', type: 'axis' as const, origin: [0, 0, 0] as const, axis: [0, 0, 1] as const },
    ]]));
    const tree = buildRigTree({ groundedPart: 'base', parts, mates, connectorsByPartName });
    const closedPivot = findNode(tree, 'pivot:edge-2');
    expect(closedPivot).toMatchObject({
      rig: { closed: true, node: 'pivot:edge-2' },
      children: [],
      warnings: [expect.stringMatching(/edge-2.*closes a loop/i)],
    });
    expect(tree.filter((node) => node.kind === 'part')).toHaveLength(1);
  });

  it('treats ball and planar mates as fixed and attaches actionable warnings', () => {
    const tree = buildRigTree(rigAssembly({
      mates: [
        { name: 'ball-link', type: 'ball', a: 'base.a', b: 'lid.a' },
        { name: 'plane-link', type: 'planar', a: 'base.b', b: 'lid.b' },
      ],
      connectorsByPartName: {
        base: [
          { name: 'a', type: 'ball', origin: [0, 0, 0] },
          { name: 'b', type: 'planar', origin: [0, 0, 0], normal: [0, 0, 1] },
        ],
        lid: [
          { name: 'a', type: 'ball', origin: [0, 0, 0] },
          { name: 'b', type: 'planar', origin: [0, 0, 0], normal: [0, 0, 1] },
        ],
      },
    }));
    expect(findNode(tree, 'pivot:ball-link')).toBeUndefined();
    expect(collectRigWarnings(tree)).toEqual(expect.arrayContaining([
      expect.stringMatching(/ball-link.*fastened/i),
      expect.stringMatching(/plane-link.*fastened/i),
    ]));
  });
});
