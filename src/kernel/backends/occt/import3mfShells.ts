// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

interface MeshShellGeometry {
  min: [number, number, number];
  max: [number, number, number];
  signedVolume: number;
  origin: [number, number, number];
}

interface ShellBoundsNode {
  min: [number, number, number];
  max: [number, number, number];
  count: number;
  shells?: MeshShellGeometry[];
  left?: ShellBoundsNode;
  right?: ShellBoundsNode;
}

function meshShellGeometry(
  vertices: readonly number[],
  triangles: readonly [number, number, number][],
): MeshShellGeometry[] {
  const parent = triangles.map((_triangle, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) current = parent[current]!;
    while (parent[index] !== current) {
      const next = parent[index]!;
      parent[index] = current;
      index = next;
    }
    return current;
  };
  const owner = new Map<string, number>();
  triangles.forEach(([a, b, c], index) => {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const key = p < q ? `${p}_${q}` : `${q}_${p}`;
      const first = owner.get(key);
      if (first === undefined) owner.set(key, index);
      else parent[root(index)] = root(first);
    }
  });

  const roots = new Set<number>();
  triangles.forEach((_triangle, index) => roots.add(root(index)));
  if (roots.size < 2) return [];

  const shells = new Map<number, MeshShellGeometry>();
  triangles.forEach(([a, b, c], index) => {
    const id = root(index);
    let shell = shells.get(id);
    if (!shell) {
      shell = {
        min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
        max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
        signedVolume: 0,
        origin: [vertices[a * 3]!, vertices[a * 3 + 1]!, vertices[a * 3 + 2]!],
      };
      shells.set(id, shell);
    }

    const ax = vertices[a * 3]! - shell.origin[0];
    const ay = vertices[a * 3 + 1]! - shell.origin[1];
    const az = vertices[a * 3 + 2]! - shell.origin[2];
    const bx = vertices[b * 3]! - shell.origin[0];
    const by = vertices[b * 3 + 1]! - shell.origin[1];
    const bz = vertices[b * 3 + 2]! - shell.origin[2];
    const cx = vertices[c * 3]! - shell.origin[0];
    const cy = vertices[c * 3 + 1]! - shell.origin[1];
    const cz = vertices[c * 3 + 2]! - shell.origin[2];
    shell.signedVolume += (
      ax * (by * cz - bz * cy) +
      ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx)
    ) / 6;

    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = corner === 0 ? a : corner === 1 ? b : c;
      const x = vertices[vertex * 3]!;
      const y = vertices[vertex * 3 + 1]!;
      const z = vertices[vertex * 3 + 2]!;
      shell.min[0] = Math.min(shell.min[0], x);
      shell.min[1] = Math.min(shell.min[1], y);
      shell.min[2] = Math.min(shell.min[2], z);
      shell.max[0] = Math.max(shell.max[0], x);
      shell.max[1] = Math.max(shell.max[1], y);
      shell.max[2] = Math.max(shell.max[2], z);
    }
  });
  return [...shells.values()];
}

function mergeShellBounds(shells: readonly MeshShellGeometry[]): Pick<ShellBoundsNode, 'min' | 'max'> {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const shell of shells) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], shell.min[axis]!);
      max[axis] = Math.max(max[axis], shell.max[axis]!);
    }
  }
  return { min, max };
}

function buildShellBoundsTree(shells: MeshShellGeometry[]): ShellBoundsNode {
  const bounds = mergeShellBounds(shells);
  if (shells.length <= 8) return { ...bounds, count: shells.length, shells };

  let axis = 0;
  for (let candidate = 1; candidate < 3; candidate += 1) {
    if (bounds.max[candidate]! - bounds.min[candidate]! > bounds.max[axis]! - bounds.min[axis]!) {
      axis = candidate;
    }
  }
  const ordered = [...shells].sort((a, b) =>
    (a.min[axis]! + a.max[axis]!) - (b.min[axis]! + b.max[axis]!),
  );
  const middle = Math.floor(ordered.length / 2);
  return {
    ...bounds,
    count: shells.length,
    left: buildShellBoundsTree(ordered.slice(0, middle)),
    right: buildShellBoundsTree(ordered.slice(middle)),
  };
}

/** A bounds overlap is conservative: shells whose bounds touch or overlap
 * are refused rather than risk double-counting 3MF fill or joining solids. */
function shellBoundsOverlap(a: Pick<ShellBoundsNode, 'min' | 'max'>, b: Pick<ShellBoundsNode, 'min' | 'max'>): boolean {
  return a.min[0] <= b.max[0] && b.min[0] <= a.max[0] &&
    a.min[1] <= b.max[1] && b.min[1] <= a.max[1] &&
    a.min[2] <= b.max[2] && b.min[2] <= a.max[2];
}

function hasOverlappingShellBounds(shells: MeshShellGeometry[]): boolean {
  if (shells.length < 2) return false;
  const root = buildShellBoundsTree(shells);

  const anyCrossOverlap = (a: ShellBoundsNode, b: ShellBoundsNode): boolean => {
    if (!shellBoundsOverlap(a, b)) return false;
    if (a.shells && b.shells) {
      for (const first of a.shells) {
        for (const second of b.shells) {
          if (shellBoundsOverlap(first, second)) return true;
        }
      }
      return false;
    }
    if (!a.shells && (b.shells || a.count >= b.count)) {
      return anyCrossOverlap(a.left!, b) || anyCrossOverlap(a.right!, b);
    }
    return anyCrossOverlap(a, b.left!) || anyCrossOverlap(a, b.right!);
  };

  const anyOverlap = (node: ShellBoundsNode): boolean => {
    if (node.shells) {
      for (let first = 0; first < node.shells.length; first += 1) {
        for (let second = first + 1; second < node.shells.length; second += 1) {
          if (shellBoundsOverlap(node.shells[first]!, node.shells[second]!)) return true;
        }
      }
      return false;
    }
    return anyOverlap(node.left!) || anyOverlap(node.right!) || anyCrossOverlap(node.left!, node.right!);
  };

  return anyOverlap(root);
}

/** Only a set of outward-facing shells with separated bounds can safely become
 * a compound of independent solids under 3MF's Positive fill rule. */
export function multiShellGeometryIssue(
  vertices: readonly number[],
  triangles: readonly [number, number, number][],
): string | undefined {
  const shells = meshShellGeometry(vertices, triangles);
  if (shells.length < 2) return undefined;
  if (shells.some((shell) => !(shell.signedVolume > 0) || !Number.isFinite(shell.signedVolume))) {
    return 'contains an inward-facing or zero-volume shell; multi-shell import requires every shell to enclose positive volume.';
  }
  if (hasOverlappingShellBounds(shells)) {
    return 'contains touching, overlapping, or nested shell bounds; use separate component objects or a single mesh with the intended positive fill.';
  }
  return undefined;
}
