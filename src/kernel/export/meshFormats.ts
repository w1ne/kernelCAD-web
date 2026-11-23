// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { PBRMaterial } from '../../shared/intent/material';
import { zipSync } from 'fflate';
import { materialTable, uniqueSlots, type MeshMaterialSlot } from './meshMaterialTable';
import { splitByCrease } from './creaseSplit';

/** OBJ and USD faces meeting at more than this angle get separate normals; the PLY writer uses the same default. */
const CREASE_ANGLE_DEG = 30;

/** Indexed triangle mesh consumed by the neutral text mesh writers. */
export interface IndexedMesh {
  vertices: readonly number[] | Float32Array;
  triangles: readonly number[] | Uint32Array;
}

export interface NamedMesh {
  name: string;
  mesh: IndexedMesh;
  /** Authored PBR. `material.name` wins in the shared GLB name registry. */
  material?: PBRMaterial;
  /** Role token or hex from `.color()`, used when the PBR record has no base colour. */
  color?: string;
  colorParamName?: string;
  finishName?: string;
}

/** Sibling Wavefront files. `obj` references `model.mtl`. */
export interface ObjMeshExport {
  readonly obj: Uint8Array;
  readonly mtl: Uint8Array;
}

export interface ObjMeshExportOptions {
  /** Optional agent-requested absolute mesh tolerance to stamp as an OBJ comment. */
  toleranceMm?: number;
}

export const OBJ_MTL_FILENAME = 'model.mtl';
export const OBJ_ZIP_ENTRY = 'model.obj';

/** Encode one or more indexed triangle meshes as Wavefront OBJ plus a sibling MTL. */
export function exportMeshObj(parts: readonly NamedMesh[], options?: ObjMeshExportOptions): ObjMeshExport {
  if (parts.length === 0) throw new Error('OBJ export requires at least one mesh.');
  const slots = materialTable(parts);
  const lines = [
    '# kernelCAD OBJ mesh export',
    ...(options?.toleranceMm === undefined ? [] : [`# requested mesh tolerance ${String(options.toleranceMm)} mm`]),
    `mtllib ${OBJ_MTL_FILENAME}`,
  ];
  const base = { vertex: 0, normal: 0 };
  parts.forEach((part, index) => {
    writeObjObject(lines, part, slots[index]!.objToken, base);
  });
  return { obj: encode(lines), mtl: encode(writeMtl(slots)) };
}

/** Zip `model.obj` and `model.mtl` for a caller that can return only one buffer. */
export function exportMeshObjZip(parts: readonly NamedMesh[], options?: ObjMeshExportOptions): Uint8Array {
  const { obj, mtl } = exportMeshObj(parts, options);
  return zipSync({ [OBJ_ZIP_ENTRY]: obj, [OBJ_MTL_FILENAME]: mtl });
}

/** Encode triangle meshes as a USDA mesh stage. Coordinates are millimeters. */
export function exportMeshUsd(parts: readonly NamedMesh[]): Uint8Array {
  if (parts.length === 0) throw new Error('USD export requires at least one mesh.');
  const slots = materialTable(parts);
  const used = new Set<string>();
  const materials = uniqueSlots(slots).map(writeUsdMaterial);
  const meshes = parts.map((part, index) => writeUsdMesh(part, slots[index]!, used));
  return new TextEncoder().encode(usdStage(materials, meshes));
}

function writeObjObject(lines: string[], part: NamedMesh, material: string, base: { vertex: number; normal: number }): void {
  const { vertices, triangles } = part.mesh;
  validateMesh(part.name, vertices, triangles);
  lines.push(`o ${objName(part.name)}`, `usemtl ${material}`);
  for (let i = 0; i < vertices.length; i += 3) {
    lines.push(`v ${number(vertices[i]!)} ${number(vertices[i + 1]!)} ${number(vertices[i + 2]!)}`);
  }
  // Authored normals: without `vn` three.js and Blender shade every facet
  // flat, and readers that average shared vertices round every sharp edge.
  const normals = creaseNormals(part.mesh);
  for (const [x, y, z] of normals.tuples) lines.push(`vn ${x} ${y} ${z}`);
  const corner = (k: number): string => `${triangles[k]! + base.vertex + 1}//${normals.indices[k]! + base.normal + 1}`;
  for (let k = 0; k < triangles.length; k += 3) {
    lines.push(`f ${corner(k)} ${corner(k + 1)} ${corner(k + 2)}`);
  }
  base.vertex += vertices.length / 3;
  base.normal += normals.tuples.length;
}

function writeMtl(slots: readonly MeshMaterialSlot[]): string[] {
  const seen = new Set<string>();
  const lines = ['# kernelCAD MTL material library'];
  for (const slot of slots) {
    if (seen.has(slot.objToken)) continue;
    seen.add(slot.objToken);
    lines.push(`newmtl ${slot.objToken}`, `Kd ${slot.kd}`, `d ${slot.dissolve}`, `Ns ${slot.ns}`);
  }
  return lines;
}

function usdStage(materials: readonly string[], meshes: readonly string[]): string {
  return [
    '#usda 1.0',
    '(',
    '    defaultPrim = "Model"',
    '    metersPerUnit = 0.001',
    '    upAxis = "Z"',
    ')',
    '',
    // Braces on their own lines, as `usdcat` writes them: the three.js USDA
    // parser finds no prims under `def Xform "Model" {`.
    'def Xform "Model"',
    '{',
    '    def Scope "Materials"',
    '    {',
    materials.join('\n'),
    '    }',
    meshes.join('\n'),
    '}',
    '',
  ].join('\n');
}

function writeUsdMaterial(slot: MeshMaterialSlot): string {
  const path = `/Model/Materials/${slot.usdPrim}`;
  const lines = [
    `        def Material "${slot.usdPrim}"`,
    '        {',
    `            token outputs:surface.connect = <${path}/PreviewSurface.outputs:surface>`,
    '',
    '            def Shader "PreviewSurface"',
    '            {',
    '                uniform token info:id = "UsdPreviewSurface"',
    `                color3f inputs:diffuseColor = (${slot.diffuseLinear})`,
    `                float inputs:metallic = ${slot.metallic}`,
    `                float inputs:roughness = ${slot.roughness}`,
  ];
  if (slot.opacity !== '1.000000') lines.push(`                float inputs:opacity = ${slot.opacity}`);
  lines.push('                token outputs:surface', '            }', '        }');
  return lines.join('\n');
}

function writeUsdMesh(part: NamedMesh, slot: MeshMaterialSlot, used: Set<string>): string {
  const { vertices, triangles } = part.mesh;
  validateMesh(part.name, vertices, triangles);
  const primName = usdName(part.name);
  if (used.has(primName)) throw new Error(`USD export has duplicate mesh prim name '${primName}'.`);
  used.add(primName);
  const faceCount = triangles.length / 3;
  // Authored normals: without them three.js (and any reader that computes
  // smooth normals) averages across the shared vertices, so every sharp CAD
  // edge shades as a rounded bulge.
  const normals = usdNormals(part.mesh);
  return [
    `    def Mesh "${primName}" (`,
    '        prepend apiSchemas = ["MaterialBindingAPI"]',
    '    )',
    '    {',
    '        point3f[] points = [',
    pointLines(vertices),
    '        ]',
    `        int[] faceVertexCounts = [${Array.from({ length: faceCount }, () => '3').join(', ')}]`,
    `        int[] faceVertexIndices = [${Array.from(triangles).join(', ')}]`,
    '        normal3f[] primvars:normals = [',
    normals.tuples.map(t => `            ${t}`).join(',\n'),
    '        ] (',
    '            interpolation = "faceVarying"',
    '        )',
    `        int[] primvars:normals:indices = [${normals.indices.join(', ')}]`,
    '        uniform token subdivisionScheme = "none"',
    `        rel material:binding = </Model/Materials/${slot.usdPrim}>`,
    '    }',
  ].join('\n');
}

function pointLines(vertices: IndexedMesh['vertices']): string {
  return triples(vertices).map(([x, y, z]) => `            (${number(x)}, ${number(y)}, ${number(z)})`).join(',\n');
}

/** Crease-split normals as distinct USDA tuples plus one index per face
 *  vertex, for a `faceVarying` indexed `primvars:normals`. Also used by the
 *  Isaac per-link mesh layers. */
export function usdNormals(mesh: IndexedMesh): { tuples: string[]; indices: number[] } {
  const { tuples, indices } = creaseNormals(mesh);
  return { tuples: tuples.map(([x, y, z]) => `(${x}, ${y}, ${z})`), indices };
}

/** Distinct crease-split unit normals, formatted, plus one index per face vertex. */
function creaseNormals(mesh: IndexedMesh): { tuples: Array<[string, string, string]>; indices: number[] } {
  const split = splitByCrease(mesh, CREASE_ANGLE_DEG);
  const tuples: Array<[string, string, string]> = [];
  const tupleIndex = new Map<string, number>();
  const ids = triples(split.normals).map(([x, y, z]) => {
    const tuple: [string, string, string] = [unit(x), unit(y), unit(z)];
    const key = tuple.join(' ');
    let id = tupleIndex.get(key);
    if (id === undefined) { id = tuples.length; tupleIndex.set(key, id); tuples.push(tuple); }
    return id;
  });
  return { tuples, indices: Array.from(split.triangles, index => ids[index]!) };
}

function unit(value: number): string {
  return number(Number(value.toFixed(6)));
}

function encode(lines: readonly string[]): Uint8Array {
  return new TextEncoder().encode(`${lines.join('\n')}\n`);
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
  return name.trim().replace(/[\r\n]/g, ' ').replace(/\s+/g, '_').replace(/#/g, '_') || 'Mesh';
}

function usdName(name: string): string {
  const safe = name.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]/, '_$&');
  return safe || 'Mesh';
}
