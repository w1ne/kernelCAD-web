// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import * as replicad from 'replicad';
import { OcctBackend } from './occtBackend';
import { buildManifoldShells, manifoldTopology, weldTriangles, type TriangleSoup } from './stlTopology';
import { getOC } from 'replicad';
import { promoteClosedShell } from './surfaceSewLowerer';
import { STL_DEFAULT_MAX_TRIANGLES } from '../../../shared/mesh/stlInfo';
import {
  assertRequiredExtensions,
  attribute,
  partKey,
  productionPrefix,
  read3mfPackage,
  ThreeMfImportError,
  type ThreeMfPackage,
} from './import3mfPackage';

export { ThreeMfImportError } from './import3mfPackage';

const UNIT_TO_MM: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

export interface ThreeMfMesh {
  /** Nine double-precision coordinates per triangle, already scaled to mm. */
  positions: TriangleSoup;
  /** One transformed mesh per component instance, as views into `positions`. */
  bodies: TriangleSoup[];
  unit: string;
  triangleCount: number;
}

function numberAttribute(tag: string, name: string): number {
  const value = attribute(tag, name);
  return value === undefined || value.trim() === '' ? Number.NaN : Number(value);
}

interface ObjectMesh {
  vertices: number[];
  triangles: Array<[number, number, number]>;
}

interface ObjectComponent {
  objectId: string;
  /** Production extension `p:path`: the model part that holds `objectId`. */
  path?: string;
  transform: number[];
}

/** How a model part's XML names the Production `path` attribute, and whether it may use it. */
interface PartContext {
  pathAttribute?: string;
  isRoot: boolean;
}

type ObjectResource = { kind: 'mesh'; mesh: ObjectMesh } | { kind: 'components'; components: ObjectComponent[] };

const MAX_COMPONENT_DEPTH = 64;

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

function parseComponent(tag: string, objectId: string, part: PartContext): ObjectComponent {
  const childObjectId = attribute(tag, 'objectid');
  if (!childObjectId) throw new ThreeMfImportError(`3MF component in object ${objectId} has no objectid.`);
  const path = part.pathAttribute === undefined ? undefined : attribute(tag, part.pathAttribute);
  if (path !== undefined && !part.isRoot) {
    throw new ThreeMfImportError(
      `3MF component in object ${objectId} references '${path}'; only the root model part may reference other model parts.`,
    );
  }
  return { objectId: childObjectId, path, transform: parseTransform(attribute(tag, 'transform')) };
}

function parseObjectMesh(objectId: string, body: string, maxTriangles: number, part: PartContext): ObjectResource {
  const mesh = /<mesh\b[^>]*>([\s\S]*?)<\/mesh\s*>/i.exec(body)?.[1];
  const componentsXml = /<components\b[^>]*>([\s\S]*?)<\/components\s*>/i.exec(body)?.[1];
  if (mesh !== undefined && componentsXml !== undefined) {
    throw new ThreeMfImportError(`3MF object ${objectId} contains both a mesh and components.`);
  }
  if (componentsXml !== undefined) {
    const components: ObjectComponent[] = [];
    const componentRe = /<component\b([^>]*)\/?\s*>/gi;
    let component: RegExpExecArray | null;
    while ((component = componentRe.exec(componentsXml)) !== null) {
      components.push(parseComponent(component[1], objectId, part));
    }
    if (components.length === 0) throw new ThreeMfImportError(`3MF object ${objectId} has no components.`);
    return { kind: 'components', components };
  }
  if (mesh === undefined) throw new ThreeMfImportError(`3MF object ${objectId} is not a core triangle mesh or component object.`);
  const verticesXml = /<vertices\b[^>]*>([\s\S]*?)<\/vertices\s*>/i.exec(mesh)?.[1];
  const trianglesXml = /<triangles\b[^>]*>([\s\S]*?)<\/triangles\s*>/i.exec(mesh)?.[1];
  if (verticesXml === undefined || trianglesXml === undefined) {
    throw new ThreeMfImportError(`3MF object ${objectId} is missing vertices or triangles.`);
  }
  const vertices = parseObjectVertices(verticesXml, objectId);
  const triangles = parseObjectTriangles(trianglesXml, vertices.length / 3, objectId, maxTriangles);
  return { kind: 'mesh', mesh: { vertices, triangles } };
}

function parseObjectMeshes(xml: string, maxTriangles: number, part: PartContext): Map<string, ObjectResource> {
  const objects = new Map<string, ObjectResource>();
  const re = /<object\b([^>]*)>([\s\S]*?)<\/object\s*>/gi;
  let object: RegExpExecArray | null;
  while ((object = re.exec(xml)) !== null) {
    const id = attribute(object[1], 'id');
    if (!id || objects.has(id)) throw new ThreeMfImportError('3MF contains an object with a missing or duplicate id.');
    objects.set(id, parseObjectMesh(id, object[2], maxTriangles, part));
  }
  if (objects.size === 0) throw new ThreeMfImportError('3MF model has no core triangle mesh objects.');
  return objects;
}

function parseTransform(value: string | undefined): number[] {
  if (value === undefined) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const values = value.trim().split(/\s+/).map(Number);
  if (values.length !== 12 || values.some((number) => !Number.isFinite(number))) {
    throw new ThreeMfImportError('3MF build item has an invalid transform; expected 12 finite values.');
  }
  // 3MF serializes a row-vector 4×3 matrix. Normalize it to the 3×4
  // column-vector form used by the mesh transform and composition helpers.
  return [
    values[0], values[3], values[6], values[9],
    values[1], values[4], values[7], values[10],
    values[2], values[5], values[8], values[11],
  ];
}

function transformDeterminant(transform: number[]): number {
  return transform[0] * (transform[5] * transform[10] - transform[6] * transform[9]) -
    transform[1] * (transform[4] * transform[10] - transform[6] * transform[8]) +
    transform[2] * (transform[4] * transform[9] - transform[5] * transform[8]);
}

/** Compose a child-to-parent transform with the parent-to-world transform. */
function composeTransforms(parent: number[], child: number[]): number[] {
  const result = new Array<number>(12).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      result[row * 4 + column] = parent[row * 4] * child[column]
        + parent[row * 4 + 1] * child[4 + column]
        + parent[row * 4 + 2] * child[8 + column];
    }
    result[row * 4 + 3] = parent[row * 4] * child[3]
      + parent[row * 4 + 1] * child[7]
      + parent[row * 4 + 2] * child[11]
      + parent[row * 4 + 3];
  }
  return result;
}

interface ModelPart {
  unit: string;
  objects: Map<string, ObjectResource>;
  buildXml?: string;
  pathAttribute?: string;
}

function parseModelPart(xml: string, maxTriangles: number, isRoot: boolean): ModelPart {
  const modelTag = /<model\b([^>]*)>/i.exec(xml)?.[1];
  if (!modelTag) throw new ThreeMfImportError('3MF model part has no model element.');
  const prefix = productionPrefix(modelTag);
  assertRequiredExtensions(modelTag, prefix);
  const unit = attribute(modelTag, 'unit') ?? 'millimeter';
  if (UNIT_TO_MM[unit] === undefined) throw new ThreeMfImportError(`3MF unit '${unit}' is not supported.`);
  if (!/<resources\b/i.test(xml)) throw new ThreeMfImportError('3MF model part has no resources element.');
  const pathAttribute = prefix === undefined ? undefined : `${prefix}:path`;
  const objects = parseObjectMeshes(xml, maxTriangles, { pathAttribute, isRoot });
  const buildXml = /<build\b[^>]*>([\s\S]*?)<\/build\s*>/i.exec(xml)?.[1];
  if (isRoot && buildXml === undefined) throw new ThreeMfImportError('3MF model part has no build element.');
  return { unit, objects, buildXml, pathAttribute };
}

/** Model parts by part key: the root, plus each Production `p:path` target parsed on first use. */
class ModelParts {
  readonly root: ModelPart;
  readonly unitScale: number;
  private readonly parts = new Map<string, ModelPart>();
  private readonly pkg: ThreeMfPackage;
  private readonly maxTriangles: number;

  constructor(pkg: ThreeMfPackage, maxTriangles: number) {
    this.pkg = pkg;
    this.maxTriangles = maxTriangles;
    const xml = pkg.modelXml(pkg.rootPath)!;
    this.root = parseModelPart(xml, maxTriangles, true);
    this.unitScale = UNIT_TO_MM[this.root.unit];
    this.parts.set(partKey(pkg.rootPath), this.root);
  }

  /** Resolve `objectId` in the root part, or in the part a Production path names. */
  object(objectId: string, path: string | undefined): { key: string; object: ObjectResource } {
    const key = partKey(path ?? this.pkg.rootPath);
    const object = this.part(key, path).objects.get(objectId);
    if (!object) {
      const where = key === partKey(this.pkg.rootPath) ? '' : ` in '${path}'`;
      throw new ThreeMfImportError(`3MF references missing object '${objectId}'${where}.`);
    }
    return { key: `${key}#${objectId}`, object };
  }

  private part(key: string, path: string | undefined): ModelPart {
    const cached = this.parts.get(key);
    if (cached) return cached;
    const xml = this.pkg.modelXml(key);
    if (xml === undefined) throw new ThreeMfImportError(`3MF model part '${path}' is missing from the package.`);
    const part = parseModelPart(xml, this.maxTriangles, false);
    if (part.unit !== this.root.unit) {
      throw new ThreeMfImportError(
        `3MF model part '${path}' unit '${part.unit}' differs from the root model unit '${this.root.unit}'.`,
      );
    }
    this.parts.set(key, part);
    return part;
  }
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

interface BuildMeshState {
  bodyPositions: number[][];
  triangleCount: number;
}

function appendObjectInstances(
  reference: { objectId: string; path?: string },
  parts: ModelParts,
  transform: number[],
  maxTriangles: number,
  state: BuildMeshState,
  ancestry: Set<string>,
): void {
  const { objectId } = reference;
  const { key, object } = parts.object(objectId, reference.path);
  if (ancestry.has(key)) throw new ThreeMfImportError(`3MF component reference cycle includes object '${objectId}'.`);
  if (ancestry.size >= MAX_COMPONENT_DEPTH) {
    throw new ThreeMfImportError(`3MF component nesting exceeds the ${MAX_COMPONENT_DEPTH} object depth limit.`);
  }

  ancestry.add(key);
  try {
    if (object.kind === 'components') {
      for (const component of object.components) {
        const componentTransform = composeTransforms(transform, component.transform);
        if (transformDeterminant(componentTransform) === 0) {
          throw new ThreeMfImportError(`3MF component in object '${objectId}' has a singular transform.`);
        }
        appendObjectInstances(component, parts, componentTransform, maxTriangles, state, ancestry);
      }
      return;
    }

    const triangleCount = object.mesh.triangles.length;
    const totalTriangleCount = state.triangleCount + triangleCount;
    if (totalTriangleCount > maxTriangles) {
      throw new ThreeMfImportError(`3MF build has ${totalTriangleCount} triangles, past the ${maxTriangles} import budget.`);
    }
    const determinant = transformDeterminant(transform);
    if (determinant === 0) throw new ThreeMfImportError(`3MF mesh instance '${objectId}' has a singular transform.`);
    const positions: number[] = [];
    for (const triangle of object.mesh.triangles) {
      appendTransformedTriangle(positions, object.mesh.vertices, triangle, transform, parts.unitScale, determinant < 0);
    }
    state.bodyPositions.push(positions);
    state.triangleCount = totalTriangleCount;
  } finally {
    ancestry.delete(key);
  }
}

/**
 * Parse core 3MF mesh objects and build items into a double-precision triangle
 * soup in mm. Production-extension `p:path` components and build items are
 * resolved into the model part they name.
 */
export function parse3mfMesh(bytes: Uint8Array, maxTriangles = STL_DEFAULT_MAX_TRIANGLES): ThreeMfMesh {
  const parts = new ModelParts(read3mfPackage(bytes), maxTriangles);
  const { root } = parts;
  const state: BuildMeshState = { bodyPositions: [], triangleCount: 0 };
  const itemRe = /<item\b([^>]*)\/?\s*>/gi;
  let item: RegExpExecArray | null;
  while ((item = itemRe.exec(root.buildXml!)) !== null) {
    const objectId = attribute(item[1], 'objectid');
    if (!objectId) throw new ThreeMfImportError('3MF build item has no objectid.');
    const path = root.pathAttribute === undefined ? undefined : attribute(item[1], root.pathAttribute);
    const transform = parseTransform(attribute(item[1], 'transform'));
    if (transformDeterminant(transform) === 0) throw new ThreeMfImportError('3MF build item has a singular transform.');
    appendObjectInstances({ objectId, path }, parts, transform, maxTriangles, state, new Set());
  }
  const positionCount = state.bodyPositions.reduce((total, positions) => total + positions.length, 0);
  const positions = new Float64Array(positionCount);
  const bodies: TriangleSoup[] = [];
  let offset = 0;
  for (const bodyPositions of state.bodyPositions) {
    positions.set(bodyPositions, offset);
    bodies.push(positions.subarray(offset, offset + bodyPositions.length));
    offset += bodyPositions.length;
  }
  if (positions.length === 0 || positions.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new ThreeMfImportError('3MF build contains no usable finite mesh triangles.');
  }
  return { positions, bodies, unit: root.unit, triangleCount: state.triangleCount };
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
  const shells: unknown[] = [];
  const solids: replicad.Shape3D[] = [];
  let shape: unknown;
  try {
    for (const body of mesh.bodies) {
      const triangleCount = body.length / 9;
      const welded = weldTriangles(body, tolerance);
      if (!welded || welded.triangles.length / 3 !== triangleCount) {
        throw new ThreeMfImportError('3MF mesh instance has invalid or degenerate triangles.');
      }
      const topology = manifoldTopology(welded);
      if (!topology) {
        throw new ThreeMfImportError('3MF mesh instance is open, non-manifold, or inconsistently oriented; a closed solid is required.');
      }
      const built = buildManifoldShells(welded, topology);
      if (!built) throw new ThreeMfImportError('OCCT could not construct all planar triangle faces from a 3MF mesh instance.');
      const bodySolids = promoteShells(built.shells);
      shells.push(...built.shells);
      solids.push(...bodySolids);
    }
    shape = assembleSolids(solids, shells);
  } catch (error) {
    for (const shell of shells) (shell as { delete?: () => void }).delete?.();
    for (const solid of solids) (solid as { delete?: () => void }).delete?.();
    throw error;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(shape as any) as replicad.Shape3D;
  return { backend: new OcctBackend(wrapped), isSolid: true, triangleCount: mesh.triangleCount, unit: mesh.unit };
}
