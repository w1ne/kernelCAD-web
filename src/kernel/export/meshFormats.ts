// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Indexed triangle mesh consumed by the neutral text mesh writers. */
export interface IndexedMesh {
  vertices: readonly number[] | Float32Array;
  triangles: readonly number[] | Uint32Array;
}

export interface NamedMesh {
  name: string;
  mesh: IndexedMesh;
}

/** Encode one or more indexed triangle meshes as Wavefront OBJ. */
export function exportMeshObj(parts: readonly NamedMesh[]): Uint8Array {
  if (parts.length === 0) throw new Error('OBJ export requires at least one mesh.');
  const lines = ['# kernelCAD OBJ mesh export'];
  let vertexBase = 0;
  for (const part of parts) {
    const { vertices, triangles } = part.mesh;
    validateMesh(part.name, vertices, triangles);
    lines.push(`o ${objName(part.name)}`);
    for (let i = 0; i < vertices.length; i += 3) {
      lines.push(`v ${number(vertices[i]!)} ${number(vertices[i + 1]!)} ${number(vertices[i + 2]!)}`);
    }
    for (let i = 0; i < triangles.length; i += 3) {
      lines.push(`f ${triangles[i]! + vertexBase + 1} ${triangles[i + 1]! + vertexBase + 1} ${triangles[i + 2]! + vertexBase + 1}`);
    }
    vertexBase += vertices.length / 3;
  }
  return new TextEncoder().encode(`${lines.join('\n')}\n`);
}

/** Encode triangle meshes as a USDA mesh stage. Coordinates are millimeters. */
export function exportMeshUsd(parts: readonly NamedMesh[]): Uint8Array {
  if (parts.length === 0) throw new Error('USD export requires at least one mesh.');
  const names = new Set<string>();
  const meshes = parts.map(({ name, mesh }) => {
    validateMesh(name, mesh.vertices, mesh.triangles);
    const primName = usdName(name);
    if (names.has(primName)) throw new Error(`USD export has duplicate mesh prim name '${primName}'.`);
    names.add(primName);
    const points = triples(mesh.vertices).map(([x, y, z]) => `            (${number(x)}, ${number(y)}, ${number(z)})`).join(',\n');
    const indices = Array.from(mesh.triangles).join(', ');
    const faceCount = mesh.triangles.length / 3;
    return `    def Mesh "${primName}" {\n        point3f[] points = [\n${points}\n        ]\n        int[] faceVertexCounts = [${Array.from({ length: faceCount }, () => '3').join(', ')}]\n        int[] faceVertexIndices = [${indices}]\n        uniform token subdivisionScheme = "none"\n    }`;
  });
  const text = `#usda 1.0\n(\n    defaultPrim = "Model"\n    metersPerUnit = 0.001\n    upAxis = "Z"\n)\n\ndef Xform "Model" {\n${meshes.join('\n')}\n}\n`;
  return new TextEncoder().encode(text);
}

function validateMesh(name: string, vertices: IndexedMesh['vertices'], triangles: IndexedMesh['triangles']): void {
  if (vertices.length === 0 || vertices.length % 3 !== 0) throw new Error(`Mesh '${name}' has an invalid vertex array.`);
  if (triangles.length === 0 || triangles.length % 3 !== 0) throw new Error(`Mesh '${name}' has an invalid triangle array.`);
  for (const value of vertices) if (!Number.isFinite(value)) throw new Error(`Mesh '${name}' contains a non-finite vertex.`);
  const vertexCount = vertices.length / 3;
  for (const index of triangles) {
    if (!Number.isInteger(index) || index < 0 || index >= vertexCount) throw new Error(`Mesh '${name}' has an out-of-range triangle index.`);
  }
}

function triples(values: IndexedMesh['vertices']): Array<[number, number, number]> {
  const result: Array<[number, number, number]> = [];
  for (let i = 0; i < values.length; i += 3) result.push([values[i]!, values[i + 1]!, values[i + 2]!]);
  return result;
}

function number(value: number): string {
  return Object.is(value, -0) ? '0' : String(value);
}

function objName(name: string): string {
  return name.trim().replace(/[\r\n]/g, ' ').replace(/\s+/g, '_') || 'Mesh';
}

function usdName(name: string): string {
  const safe = name.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]/, '_$&');
  return safe || 'Mesh';
}
