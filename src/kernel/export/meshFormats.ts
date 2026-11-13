// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { PBRMaterial } from '../../shared/intent/material';
import { zipSync } from 'fflate';
import { materialTable, uniqueSlots, type MeshMaterialSlot } from './meshMaterialTable';

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
  let vertexBase = 0;
  parts.forEach((part, index) => {
    vertexBase = writeObjObject(lines, part, slots[index]!.objToken, vertexBase);
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

function writeObjObject(lines: string[], part: NamedMesh, material: string, vertexBase: number): number {
  const { vertices, triangles } = part.mesh;
  validateMesh(part.name, vertices, triangles);
  lines.push(`o ${objName(part.name)}`, `usemtl ${material}`);
  for (let i = 0; i < vertices.length; i += 3) {
    lines.push(`v ${number(vertices[i]!)} ${number(vertices[i + 1]!)} ${number(vertices[i + 2]!)}`);
  }
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i]! + vertexBase + 1;
    const b = triangles[i + 1]! + vertexBase + 1;
    const c = triangles[i + 2]! + vertexBase + 1;
    lines.push(`f ${a} ${b} ${c}`);
  }
  return vertexBase + vertices.length / 3;
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
    'def Xform "Model" {',
    '    def Scope "Materials" {',
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
    '        uniform token subdivisionScheme = "none"',
    `        rel material:binding = </Model/Materials/${slot.usdPrim}>`,
    '    }',
  ].join('\n');
}

function pointLines(vertices: IndexedMesh['vertices']): string {
  return triples(vertices).map(([x, y, z]) => `            (${number(x)}, ${number(y)}, ${number(z)})`).join(',\n');
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
