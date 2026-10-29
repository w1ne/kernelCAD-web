// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Minimal solved-assembly projection consumed by the GLB hierarchy writer. */
export interface SolvedRigAssembly {
  readonly groundedPart: string;
  readonly parts: readonly SolvedRigPart[];
  readonly mates: readonly RigMate[];
  /** Resolved connector frames in each part's local frame (millimetres). */
  readonly connectorsByPartName: Readonly<Record<string, readonly RigConnector[]>>;
}

export interface SolvedRigPart {
  readonly name: string;
  /** Column-major rigid transform from part-local coordinates to assembly world. */
  readonly worldTransform: readonly number[];
}

export interface RigConnector {
  readonly name: string;
  readonly type: 'frame' | 'axis' | 'planar' | 'ball';
  readonly origin: readonly [number, number, number];
  readonly axis?: readonly [number, number, number];
  readonly normal?: readonly [number, number, number];
}

export interface RigMate {
  readonly name: string;
  readonly type: 'fastened' | 'revolute' | 'prismatic' | 'cylindrical' | 'planar' | 'ball' | 'pin_slot';
  readonly a: string;
  readonly b: string;
  readonly limitsDeg?: readonly [number, number];
  readonly limitsMm?: readonly [number, number];
}

export interface RigEntry {
  readonly type: 'rotate' | 'slide';
  /** Axis expressed in the pivot node's local coordinate system. */
  readonly axis: 'x' | 'y' | 'z';
  /** Degrees for rotate; metres for slide. */
  readonly range: readonly [number, number];
  readonly node: string;
  readonly closed?: true;
  /** Cylindrical mates expose their second, axial degree of freedom too. */
  readonly degreesOfFreedom?: readonly ['rotate', 'slide'];
  readonly slideRange?: readonly [number, number];
}

export interface RigNode {
  readonly name: string;
  readonly kind: 'part' | 'pivot';
  /** Column-major local transform in kernelCAD millimetres/Z-up coordinates. */
  matrix: number[];
  readonly children: RigNode[];
  readonly rig?: RigEntry;
  readonly warnings: string[];
}

const IDENTITY = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

/**
 * Build a strict scene tree from a solved assembly. The first traversal is a
 * deterministic spanning tree rooted at the grounded part; closing edges get
 * standalone, empty pivot nodes so their rig metadata points at a real glTF
 * node without pretending that a closed loop is tree structure.
 */
export function buildRigTree(solvedAssembly: SolvedRigAssembly): RigNode[] {
  const partByName = new Map(solvedAssembly.parts.map((part) => [part.name, part]));
  if (partByName.size !== solvedAssembly.parts.length) {
    throw new Error('buildRigTree: part names must be unique.');
  }
  const rootPart = partByName.get(solvedAssembly.groundedPart) ?? solvedAssembly.parts[0];
  if (rootPart === undefined) return [];

  const nodes = new Map<string, RigNode>();
  for (const part of solvedAssembly.parts) {
    nodes.set(part.name, {
      name: part.name,
      kind: 'part',
      matrix: [...IDENTITY],
      children: [],
      warnings: [],
    });
  }
  const adjacency = new Map<string, Array<{ mate: RigMate; other: string; thisConnector: string; otherConnector: string }>>();
  for (const part of solvedAssembly.parts) adjacency.set(part.name, []);
  for (const mate of solvedAssembly.mates) {
    const a = splitConnectorRef(mate.a);
    const b = splitConnectorRef(mate.b);
    if (!adjacency.has(a.part) || !adjacency.has(b.part)) {
      throw new Error(`buildRigTree: mate '${mate.name}' references an unknown part.`);
    }
    adjacency.get(a.part)!.push({ mate, other: b.part, thisConnector: a.connector, otherConnector: b.connector });
    adjacency.get(b.part)!.push({ mate, other: a.part, thisConnector: b.connector, otherConnector: a.connector });
  }

  const roots: RigNode[] = [];
  const visited = new Set<string>();
  const seenMate = new Set<string>();
  const componentRoots = [rootPart, ...solvedAssembly.parts.filter((part) => part.name !== rootPart.name)];
  for (const componentRoot of componentRoots) {
    if (visited.has(componentRoot.name)) continue;
    const rootNode = nodes.get(componentRoot.name)!;
    rootNode.matrix = [...componentRoot.worldTransform];
    roots.push(rootNode);
    visited.add(componentRoot.name);
    const queue = [componentRoot.name];
    while (queue.length > 0) {
      const parentName = queue.shift()!;
      const parentNode = nodes.get(parentName)!;
      const parentPart = partByName.get(parentName)!;
      for (const edge of adjacency.get(parentName) ?? []) {
        if (seenMate.has(edge.mate.name)) continue;
        seenMate.add(edge.mate.name);
        if (visited.has(edge.other)) {
          const loopNode = makeClosedLoopNode(solvedAssembly, edge.mate, parentName, edge.thisConnector);
          if (loopNode !== undefined) roots.push(loopNode);
          else if (edge.mate.type === 'ball' || edge.mate.type === 'planar' || edge.mate.type === 'pin_slot') {
            parentNode.warnings.push(
              `Mate '${edge.mate.name}' (${edge.mate.type}) closes a loop and is exported as fastened; it is not nested in the rig tree.`,
            );
          }
          continue;
        }
        const childNode = nodes.get(edge.other)!;
        const childPart = partByName.get(edge.other)!;
        const childWorld = childPart.worldTransform;
        const parentWorld = parentPart.worldTransform;
        if (isMovingMate(edge.mate.type)) {
          const connector = findConnector(solvedAssembly, parentName, edge.thisConnector, edge.mate.name);
          const pivotWorld = connectorWorldFrame(parentWorld, connector);
          const pivotNode = makePivotNode(edge.mate, false, multiplyMatrices(invertRigidMatrix(parentWorld), pivotWorld));
          childNode.matrix = multiplyMatrices(invertRigidMatrix(pivotWorld), childWorld);
          pivotNode.children.push(childNode);
          parentNode.children.push(pivotNode);
        } else {
          childNode.matrix = multiplyMatrices(invertRigidMatrix(parentWorld), childWorld);
          parentNode.children.push(childNode);
          if (edge.mate.type === 'ball' || edge.mate.type === 'planar' || edge.mate.type === 'pin_slot') {
            childNode.warnings.push(
              `Mate '${edge.mate.name}' (${edge.mate.type}) is exported as fastened; this mate type is not represented as a GLB pivot.`,
            );
          }
        }
        visited.add(edge.other);
        queue.push(edge.other);
      }
    }
  }
  return roots;
}

export function flattenRigNodes(nodes: readonly RigNode[]): RigNode[] {
  const result: RigNode[] = [];
  const visit = (node: RigNode): void => {
    result.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

export function collectRigWarnings(nodes: readonly RigNode[]): string[] {
  return flattenRigNodes(nodes).flatMap((node) => node.warnings);
}

/** Canonical rig payload shared by GLB extras and the asset manifest helpers. */
export function buildRigMetadata(solvedAssembly: SolvedRigAssembly): {
  rig: Record<string, RigEntry>;
  warnings: string[];
} {
  return rigMetadataFromTree(buildRigTree(solvedAssembly));
}

export function rigMetadataFromTree(nodes: readonly RigNode[]): {
  rig: Record<string, RigEntry>;
  warnings: string[];
} {
  return {
    rig: Object.fromEntries(
      flattenRigNodes(nodes)
        .filter((node) => node.rig !== undefined)
        .map((node) => [node.name.slice('pivot:'.length), node.rig!]),
    ),
    warnings: collectRigWarnings(nodes),
  };
}

function makeClosedLoopNode(
  assembly: SolvedRigAssembly,
  mate: RigMate,
  parentPartName: string,
  parentConnectorName: string,
): RigNode | undefined {
  if (!isMovingMate(mate.type)) return undefined;
  const part = assembly.parts.find((item) => item.name === parentPartName)!;
  const connector = findConnector(assembly, parentPartName, parentConnectorName, mate.name);
  const worldFrame = connectorWorldFrame(part.worldTransform, connector);
  const node = makePivotNode(mate, true, worldFrame);
  node.warnings.push(`Mate '${mate.name}' closes a loop and is recorded as closed; it is not nested in the rig tree.`);
  return node;
}

function makePivotNode(mate: RigMate, closed: boolean, matrix: readonly number[]): RigNode {
  const name = `pivot:${mate.name}`;
  const range = mate.type === 'prismatic'
    ? toMetres(mate.limitsMm ?? [-1000, 1000])
    : (mate.limitsDeg ?? [-180, 180]);
  const rig: RigEntry = {
    type: mate.type === 'prismatic' ? 'slide' : 'rotate',
    axis: 'z',
    range,
    node: name,
    ...(closed ? { closed: true as const } : {}),
    ...(mate.type === 'cylindrical' ? {
      degreesOfFreedom: ['rotate', 'slide'] as const,
      slideRange: toMetres(mate.limitsMm ?? [-1000, 1000]),
    } : {}),
  };
  return { name, kind: 'pivot', matrix: [...matrix], children: [], rig, warnings: [] };
}

function isMovingMate(type: RigMate['type']): boolean {
  return type === 'revolute' || type === 'prismatic' || type === 'cylindrical';
}

function toMetres(range: readonly [number, number]): readonly [number, number] {
  return [range[0] / 1000, range[1] / 1000];
}

function splitConnectorRef(ref: string): { part: string; connector: string } {
  const separator = ref.indexOf('.');
  if (separator <= 0 || separator === ref.length - 1) {
    throw new Error(`buildRigTree: invalid connector reference '${ref}'.`);
  }
  return { part: ref.slice(0, separator), connector: ref.slice(separator + 1) };
}

function findConnector(
  assembly: SolvedRigAssembly,
  partName: string,
  connectorName: string,
  mateName: string,
): RigConnector {
  const connector = assembly.connectorsByPartName[partName]?.find((item) => item.name === connectorName);
  if (connector === undefined) {
    throw new Error(`buildRigTree: mate '${mateName}' has no resolved connector '${partName}.${connectorName}'.`);
  }
  return connector;
}

function connectorWorldFrame(partWorld: readonly number[], connector: RigConnector): number[] {
  const point = transformPoint(partWorld, connector.origin);
  const localAxis = connector.axis ?? connector.normal ?? [0, 0, 1];
  const axis = normalize(transformDirection(partWorld, localAxis));
  const reference: readonly [number, number, number] = Math.abs(axis[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1];
  const x = normalize(cross(reference, axis));
  const y = normalize(cross(axis, x));
  return [
    x[0], x[1], x[2], 0,
    y[0], y[1], y[2], 0,
    axis[0], axis[1], axis[2], 0,
    point[0], point[1], point[2], 1,
  ];
}

export function multiplyMatrices(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!;
    }
  }
  return out;
}

export function invertRigidMatrix(matrix: readonly number[]): number[] {
  const out: number[] = [...IDENTITY];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) out[col * 4 + row] = matrix[row * 4 + col]!;
  }
  for (let row = 0; row < 3; row++) {
    out[12 + row] = -(out[row]! * matrix[12]! + out[4 + row]! * matrix[13]! + out[8 + row]! * matrix[14]!);
  }
  return out;
}

function transformPoint(matrix: readonly number[], p: readonly [number, number, number]): [number, number, number] {
  return [
    matrix[0]! * p[0] + matrix[4]! * p[1] + matrix[8]! * p[2] + matrix[12]!,
    matrix[1]! * p[0] + matrix[5]! * p[1] + matrix[9]! * p[2] + matrix[13]!,
    matrix[2]! * p[0] + matrix[6]! * p[1] + matrix[10]! * p[2] + matrix[14]!,
  ];
}

function transformDirection(matrix: readonly number[], v: readonly [number, number, number]): [number, number, number] {
  return [
    matrix[0]! * v[0] + matrix[4]! * v[1] + matrix[8]! * v[2],
    matrix[1]! * v[0] + matrix[5]! * v[1] + matrix[9]! * v[2],
    matrix[2]! * v[0] + matrix[6]! * v[1] + matrix[10]! * v[2],
  ];
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(...v);
  if (length < 1e-12) throw new Error('buildRigTree: connector axis must be non-zero.');
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
