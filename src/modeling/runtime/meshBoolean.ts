// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Indexed triangle mesh in millimetres. Positions are xyz triples. */
export interface BooleanTriangleMesh {
  positions: ArrayLike<number>;
  indices: ArrayLike<number>;
}

export type MeshBooleanOperation = 'union' | 'subtract' | 'intersect';

export interface MeshBooleanResult {
  positions: Float32Array;
  indices: Uint32Array;
  volume: number;
}

export class MeshBooleanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeshBooleanError';
  }
}

const DEFAULT_WELD_TOLERANCE = 1e-6;
let manifoldPromise: Promise<import('manifold-3d/manifold').ManifoldToplevel> | undefined;

async function getManifold(): Promise<import('manifold-3d/manifold').ManifoldToplevel> {
  manifoldPromise ??= (async () => {
    const { default: initialize } = await import('manifold-3d');
    const wasm = await initialize();
    wasm.setup();
    return wasm;
  })();
  return manifoldPromise;
}

interface WeldedMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

function validateMeshSize(mesh: BooleanTriangleMesh): void {
  if (mesh.positions.length < 12 || mesh.positions.length % 3 !== 0
    || mesh.indices.length < 12 || mesh.indices.length % 3 !== 0) {
    throw new MeshBooleanError('Mesh must contain at least four vertices and four triangles.');
  }
}

function findWeldedVertex(
  buckets: Map<string, number[]>,
  positions: number[],
  point: [number, number, number],
  tolerance: number,
): number | undefined {
  const cell = point.map(value => Math.floor(value / tolerance));
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const candidates = buckets.get(`${cell[0] + dx},${cell[1] + dy},${cell[2] + dz}`) ?? [];
        for (const candidate of candidates) {
          const offset = candidate * 3;
          if (Math.hypot(positions[offset] - point[0], positions[offset + 1] - point[1], positions[offset + 2] - point[2]) <= tolerance) {
            return candidate;
          }
        }
      }
    }
  }
  return undefined;
}

function weldVertices(mesh: BooleanTriangleMesh, tolerance: number): { positions: number[]; vertexMap: Uint32Array } {
  const weldedPositions: number[] = [];
  const buckets = new Map<string, number[]>();
  const vertexMap = new Uint32Array(mesh.positions.length / 3);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2];
    if (![x, y, z].every(Number.isFinite)) throw new MeshBooleanError('Mesh contains a non-finite vertex.');
    const point: [number, number, number] = [x, y, z];
    let match = findWeldedVertex(buckets, weldedPositions, point, tolerance);
    if (match === undefined) {
      match = weldedPositions.length / 3;
      if (![x, y, z].every(value => Number.isFinite(Math.fround(value)))) {
        throw new MeshBooleanError('Mesh vertex exceeds the supported Float32 coordinate range.');
      }
      weldedPositions.push(x, y, z);
      const key = point.map(value => Math.floor(value / tolerance)).join(',');
      const list = buckets.get(key) ?? [];
      list.push(match);
      buckets.set(key, list);
    }
    vertexMap[i / 3] = match;
  }
  return { positions: weldedPositions, vertexMap };
}

function validateTriangleIndices(mesh: BooleanTriangleMesh, vertexMap: Uint32Array): number[][] {
  const triangles: number[][] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const tri = [0, 1, 2].map(k => {
      const index = mesh.indices[i + k];
      if (!Number.isInteger(index) || index < 0 || index >= vertexMap.length) {
        throw new MeshBooleanError(`Triangle index ${index} is out of range.`);
      }
      return vertexMap[index];
    });
    if (new Set(tri).size !== 3) throw new MeshBooleanError('Mesh contains a degenerate triangle after vertex welding.');
    triangles.push(tri);
  }
  return triangles;
}

function validateTriangleAreas(triangles: number[][], positions: number[], tolerance: number): void {
  for (const tri of triangles) {
    const p = tri.map(v => positions.slice(v * 3, v * 3 + 3));
    const ab = p[1].map((value, i) => value - p[0][i]);
    const ac = p[2].map((value, i) => value - p[0][i]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(...cross) <= tolerance * tolerance) throw new MeshBooleanError('Mesh contains a zero-area triangle.');
  }
}

function validateClosedTopology(triangles: number[][]): void {
  const edges = new Map<string, { count: number; orientation: number }>();
  for (const tri of triangles) {
    for (let k = 0; k < 3; k++) {
      const a = tri[k], b = tri[(k + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const edge = edges.get(key) ?? { count: 0, orientation: 0 };
      edge.count++;
      edge.orientation += a < b ? 1 : -1;
      edges.set(key, edge);
    }
  }
  for (const edge of edges.values()) {
    if (edge.count !== 2) throw new MeshBooleanError('Mesh is open or has a non-manifold edge; Boolean inputs must be closed 2-manifold surfaces.');
    if (edge.orientation !== 0) throw new MeshBooleanError('Mesh triangle winding is inconsistent across an edge.');
  }
}

function validateAndWeld(mesh: BooleanTriangleMesh, tolerance: number): WeldedMesh {
  validateMeshSize(mesh);
  const { positions, vertexMap } = weldVertices(mesh, tolerance);
  const triangles = validateTriangleIndices(mesh, vertexMap);
  validateTriangleAreas(triangles, positions, tolerance);
  validateClosedTopology(triangles);
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(triangles.flat()) };
}

/** Perform a robust solid Boolean on two closed triangle meshes. */
export async function booleanTriangleMeshes(
  operation: MeshBooleanOperation,
  left: BooleanTriangleMesh,
  right: BooleanTriangleMesh,
  options: { tolerance?: number } = {},
): Promise<MeshBooleanResult> {
  if (!['union', 'subtract', 'intersect'].includes(operation)) {
    throw new MeshBooleanError("operation must be 'union', 'subtract', or 'intersect'.");
  }
  const tolerance = options.tolerance ?? DEFAULT_WELD_TOLERANCE;
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new MeshBooleanError('Tolerance must be a positive finite number.');
  const a = validateAndWeld(left, tolerance);
  const b = validateAndWeld(right, tolerance);
  const wasm = await getManifold();
  let leftManifold: import('manifold-3d/manifold').Manifold | undefined;
  let rightManifold: import('manifold-3d/manifold').Manifold | undefined;
  let result: import('manifold-3d/manifold').Manifold | undefined;
  let mesh: import('manifold-3d/manifold').Mesh | undefined;
  try {
    leftManifold = manifoldFromMesh(wasm, a, tolerance);
    rightManifold = manifoldFromMesh(wasm, b, tolerance);
    result = applyBoolean(operation, leftManifold, rightManifold);
    if (result.status() !== 'NoError') throw new MeshBooleanError(`Manifold Boolean failed: ${result.status()}.`);
    const volume = Math.abs(result.volume());
    if (!Number.isFinite(volume)) throw new MeshBooleanError('Manifold Boolean returned a non-finite volume.');
    mesh = result.getMesh();
    return { ...readResultMesh(mesh), volume };
  } catch (error) {
    if (error instanceof MeshBooleanError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new MeshBooleanError(`Mesh Boolean failed. Check that both inputs are closed, consistently oriented manifold meshes. ${message}`);
  } finally {
    result?.delete();
    rightManifold?.delete();
    leftManifold?.delete();
  }
}

function manifoldFromMesh(
  wasm: import('manifold-3d/manifold').ManifoldToplevel,
  mesh: WeldedMesh,
  tolerance: number,
): import('manifold-3d/manifold').Manifold {
  // Mesh is a plain input value object; Manifold exposes no Mesh.delete().
  // ofMesh creates the owned WASM allocation that must be deleted by callers.
  return wasm.Manifold.ofMesh(new wasm.Mesh({
    numProp: 3,
    vertProperties: mesh.positions,
    triVerts: mesh.indices,
    tolerance,
  }));
}

function applyBoolean(
  operation: MeshBooleanOperation,
  left: import('manifold-3d/manifold').Manifold,
  right: import('manifold-3d/manifold').Manifold,
): import('manifold-3d/manifold').Manifold {
  if (operation === 'union') return left.add(right);
  if (operation === 'subtract') return left.subtract(right);
  return left.intersect(right);
}

function readResultMesh(mesh: import('manifold-3d/manifold').Mesh): Pick<MeshBooleanResult, 'positions' | 'indices'> {
  const positions = new Float32Array(mesh.numVert * 3);
  for (let i = 0; i < mesh.numVert; i++) positions.set(mesh.position(i), i * 3);
  return { positions, indices: Uint32Array.from(mesh.triVerts) };
}
