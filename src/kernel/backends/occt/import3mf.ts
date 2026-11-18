// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { unzipSync } from 'fflate';
import * as replicad from 'replicad';
import { OcctBackend } from './occtBackend';
import { buildManifoldShells, manifoldTopology, weldTriangles, type TriangleSoup } from './stlTopology';
import { getOC } from 'replicad';
import { promoteClosedShell } from './surfaceSewLowerer';
import { STL_DEFAULT_MAX_TRIANGLES } from '../../../shared/mesh/stlInfo';

const UNIT_TO_MM: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

export class ThreeMfImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThreeMfImportError';
  }
}

export interface ThreeMfMesh {
  /** Nine double-precision coordinates per triangle, already scaled to mm. */
  positions: TriangleSoup;
  unit: string;
  triangleCount: number;
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag);
  return match?.[1] ?? match?.[2];
}

function numberAttribute(tag: string, name: string): number {
  const value = attribute(tag, name);
  return value === undefined || value.trim() === '' ? Number.NaN : Number(value);
}

function getModelXml(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new ThreeMfImportError('3MF is not a readable ZIP archive.');
  }
  const names = Object.keys(files);
  const canonical = names.find((name) => name.toLowerCase() === '3d/3dmodel.model');
  const candidates = names.filter((name) => /^3d\/.+\.model$/i.test(name));
  const modelName = canonical ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (!modelName || !files[modelName]) {
    throw new ThreeMfImportError('3MF must contain one unambiguous 3D model part.');
  }
  return new TextDecoder().decode(files[modelName]);
}

interface ObjectMesh {
  vertices: number[];
  triangles: Array<[number, number, number]>;
}

function meshShellCount(triangles: readonly [number, number, number][]): number {
  const parent = triangles.map((_triangle, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) current = parent[current];
    while (parent[index] !== current) {
      const next = parent[index];
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
  return new Set(triangles.map((_triangle, index) => root(index))).size;
}

function parseObjectVertices(verticesXml: string, objectId: string): number[] {
  const vertices: number[] = [];
  const vertexRe = /<vertex\b([^>]*)\/?\s*>/gi;
  let vertex: RegExpExecArray | null;
  while ((vertex = vertexRe.exec(verticesXml)) !== null) {
    vertices.push(numberAttribute(vertex[1], 'x'), numberAttribute(vertex[1], 'y'), numberAttribute(vertex[1], 'z'));
  }
  if (vertices.length === 0 || vertices.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new ThreeMfImportError(`3MF object ${objectId} has invalid vertex coordinates.`);
  }
  return vertices;
}

function parseTriangleIndices(attributes: string, vertexCount: number, objectId: string): [number, number, number] {
  const indices = ['v1', 'v2', 'v3'].map((name) => numberAttribute(attributes, name));
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount)) {
    throw new ThreeMfImportError(`3MF object ${objectId} has a triangle that references a missing vertex.`);
  }
  return indices as [number, number, number];
}

function parseObjectTriangles(trianglesXml: string, vertexCount: number, objectId: string, maxTriangles: number) {
  const triangles: Array<[number, number, number]> = [];
  const triangleRe = /<triangle\b([^>]*)\/?\s*>/gi;
  let triangle: RegExpExecArray | null;
  while ((triangle = triangleRe.exec(trianglesXml)) !== null) {
    triangles.push(parseTriangleIndices(triangle[1], vertexCount, objectId));
    if (triangles.length > maxTriangles) {
      throw new ThreeMfImportError(`3MF object ${objectId} exceeds the ${maxTriangles} triangle import budget.`);
    }
  }
  if (triangles.length === 0) throw new ThreeMfImportError(`3MF object ${objectId} has no triangles.`);
  if (meshShellCount(triangles) > 1) {
    throw new ThreeMfImportError(`3MF object ${objectId} contains multiple mesh shells; import each closed body as a separate object.`);
  }
  return triangles;
}

function parseObjectMesh(objectId: string, body: string, maxTriangles: number): ObjectMesh {
  if (/<components\b/i.test(body)) {
    throw new ThreeMfImportError('3MF component assemblies are not supported; export each body as a mesh object.');
  }
  const mesh = /<mesh\b[^>]*>([\s\S]*?)<\/mesh\s*>/i.exec(body)?.[1];
  if (!mesh) throw new ThreeMfImportError(`3MF object ${objectId} is not a core triangle mesh.`);
  const verticesXml = /<vertices\b[^>]*>([\s\S]*?)<\/vertices\s*>/i.exec(mesh)?.[1];
  const trianglesXml = /<triangles\b[^>]*>([\s\S]*?)<\/triangles\s*>/i.exec(mesh)?.[1];
  if (verticesXml === undefined || trianglesXml === undefined) {
    throw new ThreeMfImportError(`3MF object ${objectId} is missing vertices or triangles.`);
  }
  const vertices = parseObjectVertices(verticesXml, objectId);
  const triangles = parseObjectTriangles(trianglesXml, vertices.length / 3, objectId, maxTriangles);
  return { vertices, triangles };
}

function parseObjectMeshes(xml: string, maxTriangles: number): Map<string, ObjectMesh> {
  const objects = new Map<string, ObjectMesh>();
  const re = /<object\b([^>]*)>([\s\S]*?)<\/object\s*>/gi;
  let object: RegExpExecArray | null;
  while ((object = re.exec(xml)) !== null) {
    const id = attribute(object[1], 'id');
    if (!id || objects.has(id)) throw new ThreeMfImportError('3MF contains an object with a missing or duplicate id.');
    objects.set(id, parseObjectMesh(id, object[2], maxTriangles));
  }
  if (objects.size === 0) throw new ThreeMfImportError('3MF model has no core triangle mesh objects.');
  return objects;
}

function parseTransform(value: string | undefined): number[] {
  if (value === undefined) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const transform = value.trim().split(/\s+/).map(Number);
  if (transform.length !== 12 || transform.some((number) => !Number.isFinite(number))) {
    throw new ThreeMfImportError('3MF build item has an invalid transform; expected 12 finite values.');
  }
  return transform;
}

interface ModelParts {
  unit: string;
  unitScale: number;
  objects: Map<string, ObjectMesh>;
  buildXml: string;
}

function parseModelParts(xml: string, maxTriangles: number): ModelParts {
  const modelTag = /<model\b([^>]*)>/i.exec(xml)?.[1];
  if (!modelTag) throw new ThreeMfImportError('3MF model part has no model element.');
  const requiredExtensions = attribute(modelTag, 'requiredextensions');
  if (requiredExtensions?.trim()) {
    throw new ThreeMfImportError(`3MF requires unsupported extensions: ${requiredExtensions.trim()}.`);
  }
  const unit = attribute(modelTag, 'unit') ?? 'millimeter';
  const unitScale = UNIT_TO_MM[unit];
  if (unitScale === undefined) throw new ThreeMfImportError(`3MF unit '${unit}' is not supported.`);
  if (!/<resources\b/i.test(xml)) throw new ThreeMfImportError('3MF model part has no resources element.');
  const objects = parseObjectMeshes(xml, maxTriangles);
  const buildXml = /<build\b[^>]*>([\s\S]*?)<\/build\s*>/i.exec(xml)?.[1];
  if (buildXml === undefined) throw new ThreeMfImportError('3MF model part has no build element.');
  return { unit, unitScale, objects, buildXml };
}

interface BuildItemMesh {
  positions: number[];
  triangleCount: number;
}

function appendTransformedTriangle(
  positions: number[],
  vertices: number[],
  triangle: [number, number, number],
  transform: number[],
  unitScale: number,
  reflected: boolean,
): void {
  const [a, b, c] = triangle;
  const indices = reflected ? [a, c, b] : [a, b, c];
  for (const index of indices) {
    const x = vertices[index * 3];
    const y = vertices[index * 3 + 1];
    const z = vertices[index * 3 + 2];
    positions.push(
      (transform[0] * x + transform[1] * y + transform[2] * z + transform[3]) * unitScale,
      (transform[4] * x + transform[5] * y + transform[6] * z + transform[7]) * unitScale,
      (transform[8] * x + transform[9] * y + transform[10] * z + transform[11]) * unitScale,
    );
  }
}

function transformBuildItem(
  tag: string,
  objects: Map<string, ObjectMesh>,
  unitScale: number,
  maxTriangles: number,
  currentTriangleCount: number,
): BuildItemMesh {
  const objectId = attribute(tag, 'objectid');
  const object = objectId === undefined ? undefined : objects.get(objectId);
  if (!object) throw new ThreeMfImportError(`3MF build item references missing object '${objectId ?? ''}'.`);
  const transform = parseTransform(attribute(tag, 'transform'));
  const triangleCount = object.triangles.length;
  if (currentTriangleCount + triangleCount > maxTriangles) {
    throw new ThreeMfImportError(`3MF build has ${currentTriangleCount + triangleCount} triangles, past the ${maxTriangles} import budget.`);
  }
  const determinant =
    transform[0] * (transform[5] * transform[10] - transform[6] * transform[9]) -
    transform[1] * (transform[4] * transform[10] - transform[6] * transform[8]) +
    transform[2] * (transform[4] * transform[9] - transform[5] * transform[8]);
  if (determinant === 0) throw new ThreeMfImportError('3MF build item has a singular transform.');
  const positions: number[] = [];
  for (const triangle of object.triangles) {
    appendTransformedTriangle(positions, object.vertices, triangle, transform, unitScale, determinant < 0);
  }
  return { positions, triangleCount };
}

/** Parse core 3MF mesh objects and build items into a double-precision triangle soup in mm. */
export function parse3mfMesh(bytes: Uint8Array, maxTriangles = STL_DEFAULT_MAX_TRIANGLES): ThreeMfMesh {
  const xml = getModelXml(bytes);
  const model = parseModelParts(xml, maxTriangles);
  const positions: number[] = [];
  let triangleCount = 0;
  const itemRe = /<item\b([^>]*)\/?\s*>/gi;
  let item: RegExpExecArray | null;
  while ((item = itemRe.exec(model.buildXml)) !== null) {
    const transformed = transformBuildItem(item[1], model.objects, model.unitScale, maxTriangles, triangleCount);
    triangleCount += transformed.triangleCount;
    for (const coordinate of transformed.positions) positions.push(coordinate);
  }
  if (positions.length === 0 || positions.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new ThreeMfImportError('3MF build contains no usable finite mesh triangles.');
  }
  return { positions: Float64Array.from(positions), unit: model.unit, triangleCount };
}

export interface Import3mfOptions {
  /** Vertex-weld tolerance in mm (default 1e-6). */
  tolerance?: number;
  /** Maximum imported triangles (default 200000). */
  maxTriangles?: number;
}

export interface Import3mfResult {
  backend: OcctBackend;
  isSolid: true;
  triangleCount: number;
  unit: string;
}

function promoteShells(shells: unknown[]): replicad.Shape3D[] {
  const solids = shells.map((shell) => promoteClosedShell(shell));
  if (solids.some((solid) => solid === null)) {
    for (const shell of shells) (shell as { delete?: () => void }).delete?.();
    for (const solid of solids) (solid as { delete?: () => void } | null)?.delete?.();
    throw new ThreeMfImportError('3MF mesh did not form BRepCheck-valid closed solids.');
  }
  return solids as replicad.Shape3D[];
}

function assembleSolids(solids: replicad.Shape3D[], shells: unknown[]): unknown {
  if (solids.length === 1) {
    (shells[0] as { delete?: () => void }).delete?.();
    return solids[0];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const compound = new oc.TopoDS_Compound();
  const builder = new oc.TopoDS_Builder();
  builder.MakeCompound(compound);
  solids.forEach((solid, index) => {
    builder.Add(compound, solid);
    (shells[index] as { delete?: () => void }).delete?.();
  });
  builder.delete?.();
  return compound;
}

/** Build validated faceted B-rep solids from a core 3MF mesh. */
export function import3mfBytes(bytes: Uint8Array, options: Import3mfOptions = {}): Import3mfResult {
  const maxTriangles = options.maxTriangles ?? STL_DEFAULT_MAX_TRIANGLES;
  const mesh = parse3mfMesh(bytes, maxTriangles);
  const tolerance = options.tolerance ?? 1e-6;
  const welded = weldTriangles(mesh.positions, tolerance);
  if (!welded || welded.triangles.length / 3 !== mesh.triangleCount) {
    throw new ThreeMfImportError('3MF mesh has invalid or degenerate triangles.');
  }
  const topology = manifoldTopology(welded);
  if (!topology) {
    throw new ThreeMfImportError('3MF mesh is open, non-manifold, or inconsistently oriented; a closed solid is required.');
  }
  const built = buildManifoldShells(welded, topology);
  if (!built) throw new ThreeMfImportError('OCCT could not construct all planar triangle faces from the 3MF mesh.');

  const solids = promoteShells(built.shells);
  const shape = assembleSolids(solids, built.shells);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(shape as any) as replicad.Shape3D;
  return { backend: new OcctBackend(wrapped), isSolid: true, triangleCount: mesh.triangleCount, unit: mesh.unit };
}
