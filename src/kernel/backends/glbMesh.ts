// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/glbMesh.ts
//
// Composite GLB → display-mesh decoder (lib.meshFromGLB). Traverses the scene
// graph, flattens transforms, converts glTF Y-up to kernelCAD Z-up millimetres,
// and keeps every primitive as a material group (RuntimeSubMesh), so a PCB
// assembly renders with solder mask, copper, gold and component bodies. Node-only.

import { NodeIO, type Accessor, type Material as GltfMaterial, type Node as GltfNode } from '@gltf-transform/core';
import type { PBRMaterial } from '../../shared/intent/material';
import type { RuntimeSubMesh } from './runtimeMesh';

export interface DecodeGlbMeshOptions {
  /** 'auto' uses asset.extras.kernelcad.units, else the glTF metre default. */
  units?: 'auto' | 'mm' | 'm';
  /** glTF Y-up ('y', default, rotates +90° about X) or keep Z-up ('z'). */
  upAxis?: 'y' | 'z';
}

export interface DecodedGlbMesh {
  positions: Float32Array;
  indices: Uint32Array;
  /** One entry per glTF primitive, carrying its own material. */
  subMeshes: RuntimeSubMesh[];
  /** Unit of the source coordinates; kernelCAD output is always millimetres. */
  units: 'mm' | 'm';
  /** Millimetre factor applied to every source coordinate. */
  unitScale: number;
  /** Where `units` came from: explicit option, asset extras, a pre-0.17
   *  kernelCAD export that wrote raw millimetres, or the glTF default. */
  unitSource: 'option' | 'extras' | 'legacy-kernelcad' | 'gltf-default';
}

type Mat4 = ArrayLike<number>;
const IDENTITY: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Column-major 4×4 multiply (glTF / three convention). */
function multiplyMat4(a: Mat4, b: Mat4): number[] {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += a[k * 4 + r]! * b[c * 4 + k]!;
    out[c * 4 + r] = sum;
  }
  return out;
}

/** glTF Y-up → kernelCAD Z-up: (x, y, z) → (x, -z, y). */
function toZUp(x: number, y: number, z: number, upAxis: 'y' | 'z'): [number, number, number] {
  return upAxis === 'y' ? [x, -z, y] : [x, y, z];
}

/** Apply the world matrix (point or normal), then the up-axis rotation. */
function mapTriples(values: Float32Array, world: Mat4, upAxis: 'y' | 'z', normal: boolean): Float32Array {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 3) {
    const x = values[i]!, y = values[i + 1]!, z = values[i + 2]!;
    const tx = world[0]! * x + world[4]! * y + world[8]! * z + (normal ? 0 : world[12]!);
    const ty = world[1]! * x + world[5]! * y + world[9]! * z + (normal ? 0 : world[13]!);
    const tz = world[2]! * x + world[6]! * y + world[10]! * z + (normal ? 0 : world[14]!);
    const [zx, zy, zz] = toZUp(tx, ty, tz, upAxis);
    if (normal) {
      const len = Math.hypot(zx, zy, zz) || 1;
      out[i] = zx / len; out[i + 1] = zy / len; out[i + 2] = zz / len;
    } else {
      out[i] = zx; out[i + 1] = zy; out[i + 2] = zz;
    }
  }
  return out;
}

function floatArray(accessor: Accessor | null | undefined): Float32Array | undefined {
  const array = accessor?.getArray();
  if (array == null) return undefined;
  return array instanceof Float32Array ? array : new Float32Array(array);
}

function sequentialIndices(vertexCount: number): Uint32Array {
  const indices = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) indices[i] = i;
  return indices;
}

const CREASE_COS = Math.cos((35 * Math.PI) / 180);

function triangleFaceNormals(positions: Float32Array, indices: Uint32Array): { faceNormals: Float32Array; vertTris: number[][] } {
  const triCount = Math.floor(indices.length / 3);
  const faceNormals = new Float32Array(triCount * 3);
  const vertTris: number[][] = Array.from({ length: positions.length / 3 }, () => []);
  for (let t = 0; t < triCount; t++) {
    const ia = indices[t * 3]!, ib = indices[t * 3 + 1]!, ic = indices[t * 3 + 2]!;
    vertTris[ia]!.push(t); vertTris[ib]!.push(t); vertTris[ic]!.push(t);
    const a = ia * 3, b = ib * 3, c = ic * 3;
    const abx = positions[b]! - positions[a]!, aby = positions[b + 1]! - positions[a + 1]!, abz = positions[b + 2]! - positions[a + 2]!;
    const acx = positions[c]! - positions[a]!, acy = positions[c + 1]! - positions[a + 1]!, acz = positions[c + 2]! - positions[a + 2]!;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    faceNormals[t * 3] = nx / len; faceNormals[t * 3 + 1] = ny / len; faceNormals[t * 3 + 2] = nz / len;
  }
  return { faceNormals, vertTris };
}

function blendedCornerNormal(faceNormals: Float32Array, neighbors: readonly number[], fnx: number, fny: number, fnz: number): [number, number, number] {
  let sx = 0, sy = 0, sz = 0;
  for (const nt of neighbors) {
    const ntx = faceNormals[nt * 3]!, nty = faceNormals[nt * 3 + 1]!, ntz = faceNormals[nt * 3 + 2]!;
    if (fnx * ntx + fny * nty + fnz * ntz >= CREASE_COS) { sx += ntx; sy += nty; sz += ntz; }
  }
  const len = Math.hypot(sx, sy, sz) || 1;
  return [sx / len, sy / len, sz / len];
}

/** Compute vertex normals splitting creases sharper than 35° so flat PCB / IC
 *  / terminal faces stay crisp instead of pillow-shading across 90° edges. */
function computeCreaseGeometry(
  positions: Float32Array,
  indices: Uint32Array,
  uv: Float32Array | undefined,
  colors: Float32Array | undefined,
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array; uv?: Float32Array; colors?: Float32Array } {
  const triCount = Math.floor(indices.length / 3);
  const { faceNormals, vertTris } = triangleFaceNormals(positions, indices);
  const outPos = new Float32Array(triCount * 9);
  const outNorm = new Float32Array(triCount * 9);
  const outIdx = new Uint32Array(triCount * 3);
  const outUv = uv ? new Float32Array(triCount * 6) : undefined;
  const outCol = colors ? new Float32Array(triCount * 9) : undefined;
  for (let t = 0; t < triCount; t++) {
    const fnx = faceNormals[t * 3]!, fny = faceNormals[t * 3 + 1]!, fnz = faceNormals[t * 3 + 2]!;
    for (let k = 0; k < 3; k++) {
      const vi = indices[t * 3 + k]!;
      const dst = t * 3 + k;
      outIdx[dst] = dst;
      outPos[dst * 3] = positions[vi * 3]!; outPos[dst * 3 + 1] = positions[vi * 3 + 1]!; outPos[dst * 3 + 2] = positions[vi * 3 + 2]!;
      if (outUv && uv) { outUv[dst * 2] = uv[vi * 2]!; outUv[dst * 2 + 1] = uv[vi * 2 + 1]!; }
      if (outCol && colors) { outCol[dst * 3] = colors[vi * 3]!; outCol[dst * 3 + 1] = colors[vi * 3 + 1]!; outCol[dst * 3 + 2] = colors[vi * 3 + 2]!; }
      const [nx, ny, nz] = blendedCornerNormal(faceNormals, vertTris[vi]!, fnx, fny, fnz);
      outNorm[dst * 3] = nx; outNorm[dst * 3 + 1] = ny; outNorm[dst * 3 + 2] = nz;
    }
  }
  return {
    positions: outPos,
    normals: outNorm,
    indices: outIdx,
    ...(outUv !== undefined ? { uv: outUv } : {}),
    ...(outCol !== undefined ? { colors: outCol } : {}),
  };
}

function hasUnsplitCreases(positions: Float32Array, indices: Uint32Array): boolean {
  const { faceNormals, vertTris } = triangleFaceNormals(positions, indices);
  for (const tris of vertTris) {
    if (tris.length < 2) continue;
    const t0 = tris[0]!;
    const x0 = faceNormals[t0 * 3]!, y0 = faceNormals[t0 * 3 + 1]!, z0 = faceNormals[t0 * 3 + 2]!;
    for (let i = 1; i < tris.length; i++) {
      const ti = tris[i]!;
      if (x0 * faceNormals[ti * 3]! + y0 * faceNormals[ti * 3 + 1]! + z0 * faceNormals[ti * 3 + 2]! < CREASE_COS) {
        return true;
      }
    }
  }
  return false;
}

function finalizeSubMeshGeometry(sub: CollectedSubMesh): RuntimeSubMesh {
  const needsSplit = sub.normals === undefined || hasUnsplitCreases(sub.positions, sub.indices);
  const geom = needsSplit
    ? computeCreaseGeometry(sub.positions, sub.indices, sub.uv, sub.colors)
    : { positions: sub.positions, normals: sub.normals!, indices: sub.indices, uv: sub.uv, colors: sub.colors };
  return {
    name: sub.name,
    positions: geom.positions,
    normals: geom.normals,
    indices: geom.indices,
    ...(geom.uv !== undefined ? { uv: geom.uv } : {}),
    ...(geom.colors !== undefined ? { colors: geom.colors } : {}),
    ...(sub.material !== undefined ? { material: sub.material } : {}),
  };
}
function rgbaToRgb(accessor: Accessor): Float32Array {
  const array = accessor.getArray();
  const size = accessor.getElementSize();
  if (array == null || size < 3) return new Float32Array();
  const scale = accessor.getNormalized()
    ? (array instanceof Uint8Array ? 255 : array instanceof Uint16Array ? 65535 : 1)
    : 1;
  const count = Math.floor(array.length / size);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = (array[i * size] ?? 1) / scale;
    colors[i * 3 + 1] = (array[i * size + 1] ?? 1) / scale;
    colors[i * 3 + 2] = (array[i * size + 2] ?? 1) / scale;
  }
  return colors;
}

function srgbHex(linear: ArrayLike<number>): string {
  const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  return `#${[0, 1, 2].map((k) => Math.round(Math.min(1, Math.max(0, toSrgb(linear[k] ?? 0))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** glTF's default material (metallic 0, roughness 1, no texture) says nothing;
 *  infer a plausible surface from the node/material name. */
function inferSurface(name: string): Pick<PBRMaterial, 'metalness' | 'roughness' | 'clearcoat'> {
  const n = name.toLowerCase();
  if (/pcb|board|solder.?mask/.test(n)) return { metalness: 0, roughness: 0.38, clearcoat: 0.42 };
  if (/pin|pad|copper|gold|brass|terminal/.test(n)) return { metalness: 0.92, roughness: 0.24 };
  if (/crystal|shield|usb|can|metal|steel|alum/.test(n)) return { metalness: 0.9, roughness: 0.28 };
  if (/oled|screen|glass|lens/.test(n)) return { metalness: 0, roughness: 0.12, clearcoat: 0.85 };
  return { metalness: 0, roughness: 0.52 };
}

function attachMaterialExtras(pbr: PBRMaterial, material: GltfMaterial, nodeName: string): void {
  const [er, eg, eb] = material.getEmissiveFactor();
  if (er > 0 || eg > 0 || eb > 0) {
    pbr.emissive = srgbHex([er, eg, eb]);
    pbr.emissiveIntensity = 1;
  }
  const texture = material.getBaseColorTexture();
  const image = texture?.getImage();
  const mime = texture?.getMimeType();
  if (image != null && mime) {
    pbr.textures = { albedo: { path: `data:${mime};base64,${Buffer.from(image).toString('base64')}` } };
  }
  const metallic = material.getMetallicFactor();
  const roughness = material.getRoughnessFactor();
  if (metallic === 0 && roughness >= 0.99 && material.getMetallicRoughnessTexture() == null) {
    const surface = inferSurface(`${nodeName} ${pbr.name ?? ''}`);
    pbr.metalness = surface.metalness;
    pbr.roughness = surface.roughness;
    if (surface.clearcoat !== undefined) pbr.clearcoat = surface.clearcoat;
  }
}

function toPbrMaterial(material: GltfMaterial | null, nodeName: string): PBRMaterial | undefined {
  if (material == null) return undefined;
  const [r, g, b, a] = material.getBaseColorFactor();
  const name = material.getName() || nodeName;
  const pbr: PBRMaterial = {
    baseColor: srgbHex([r, g, b]),
    metalness: material.getMetallicFactor(),
    roughness: material.getRoughnessFactor(),
    ...(name ? { name } : {}),
    ...(a < 1 ? { opacity: a } : {}),
  };
  attachMaterialExtras(pbr, material, nodeName);
  return pbr;
}

/** The `kernelcad` extras object, or undefined when the asset has none. */
function kernelcadExtras(extras: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const kernelcad = extras?.kernelcad;
  return typeof kernelcad === 'object' && kernelcad !== null ? (kernelcad as Record<string, unknown>) : undefined;
}

interface UnitResolution {
  readonly units: 'mm' | 'm';
  readonly unitScale: number;
  readonly unitSource: 'option' | 'extras' | 'legacy-kernelcad' | 'gltf-default';
}

/**
 * glTF 2.0 scene coordinates are metres. An undeclared asset therefore takes
 * the metre rule even when its raw extent is large: guessing millimetres from
 * size silently shrank a spec-compliant 3 m beam to 3 mm.
 *
 * A kernelCAD asset from before 0.17 carries `extras.kernelcad` but no
 * `units`; that exporter wrote raw millimetres, so it stays millimetres
 * instead of being re-read as metres. Assets authored elsewhere in
 * millimetres must declare extras or pass `{ units: 'mm' }`.
 */
function resolveUnits(opts: DecodeGlbMeshOptions, extras: Record<string, unknown> | undefined): UnitResolution {
  if (opts.units === 'mm') return { units: 'mm', unitScale: 1, unitSource: 'option' };
  if (opts.units === 'm') return { units: 'm', unitScale: 1000, unitSource: 'option' };
  const kernelcad = kernelcadExtras(extras);
  const declared = kernelcad?.units;
  if (declared === 'mm') return { units: 'mm', unitScale: 1, unitSource: 'extras' };
  if (declared === 'm') return { units: 'm', unitScale: 1000, unitSource: 'extras' };
  if (kernelcad !== undefined && declared === undefined) {
    return { units: 'mm', unitScale: 1, unitSource: 'legacy-kernelcad' };
  }
  return { units: 'm', unitScale: 1000, unitSource: 'gltf-default' };
}

interface CollectedSubMesh {
  name: string;
  positions: Float32Array;
  normals: Float32Array | undefined;
  indices: Uint32Array;
  uv?: Float32Array;
  colors?: Float32Array;
  material?: PBRMaterial;
}

function decodePrimitive(
  primitive: ReturnType<NonNullable<ReturnType<GltfNode['getMesh']>>['listPrimitives']>[number],
  world: Mat4,
  upAxis: 'y' | 'z',
  baseName: string,
  index: number,
  count: number,
): CollectedSubMesh | undefined {
  if (primitive.getMode() !== 4) return undefined; // TRIANGLES only
  const rawPositions = floatArray(primitive.getAttribute('POSITION'));
  if (rawPositions === undefined || rawPositions.length === 0) return undefined;
  const positions = mapTriples(rawPositions, world, upAxis, false);
  const rawIndices = primitive.getIndices()?.getArray();
  const indices = rawIndices != null ? new Uint32Array(rawIndices) : sequentialIndices(positions.length / 3);
  const rawNormals = floatArray(primitive.getAttribute('NORMAL'));
  const normals = rawNormals !== undefined && rawNormals.length === positions.length
    ? mapTriples(rawNormals, world, upAxis, true)
    : undefined;
  const uv = floatArray(primitive.getAttribute('TEXCOORD_0'))?.slice();
  const colorAccessor = primitive.getAttribute('COLOR_0');
  const colors = colorAccessor != null ? rgbaToRgb(colorAccessor) : undefined;
  const material = toPbrMaterial(primitive.getMaterial(), baseName);
  return {
    name: count > 1 ? `${baseName}-${index}` : baseName,
    positions, normals, indices,
    ...(uv !== undefined ? { uv } : {}),
    ...(colors !== undefined && colors.length > 0 ? { colors } : {}),
    ...(material !== undefined ? { material } : {}),
  };
}

function collectNode(node: GltfNode, parentMatrix: Mat4, upAxis: 'y' | 'z', out: CollectedSubMesh[]): void {
  // getMatrix() is LOCAL; composing with parentMatrix builds the world matrix
  // exactly once (getWorldMatrix() would apply ancestors a second time).
  const world = multiplyMat4(parentMatrix, node.getMatrix() as unknown as Mat4);
  const mesh = node.getMesh();
  const primitives = mesh?.listPrimitives() ?? [];
  const baseName = node.getName() || mesh?.getName() || 'primitive';
  primitives.forEach((primitive, index) => {
    const sub = decodePrimitive(primitive, world, upAxis, baseName, index, primitives.length);
    if (sub !== undefined) out.push(sub);
  });
  for (const child of node.listChildren()) collectNode(child, world, upAxis, out);
}

/** Decode a GLB into combined display buffers plus per-material sub-meshes. */
export async function decodeGlbMesh(bytes: Uint8Array, opts: DecodeGlbMeshOptions = {}): Promise<DecodedGlbMesh> {
  const upAxis = opts.upAxis ?? 'y';
  const doc = await new NodeIO().readBinary(bytes);
  const root = doc.getRoot();
  const extras = root.getAsset().extras as Record<string, unknown> | undefined;
  const scenes = root.listScenes();
  const topNodes = scenes.length > 0
    ? scenes.flatMap((scene) => scene.listChildren())
    : root.listNodes().filter((node) => node.getParentNode() === null);

  const collected: CollectedSubMesh[] = [];
  for (const node of topNodes) collectNode(node, IDENTITY, upAxis, collected);
  if (collected.length === 0) throw new Error('GLB contains no triangle mesh primitives.');

  const resolution = resolveUnits(opts, extras);
  if (resolution.unitScale !== 1) {
    for (const sub of collected) for (let i = 0; i < sub.positions.length; i++) sub.positions[i]! *= resolution.unitScale;
  }

  const subMeshes: RuntimeSubMesh[] = collected.map(finalizeSubMeshGeometry);

  let vertexTotal = 0, indexTotal = 0;
  for (const sub of subMeshes) { vertexTotal += sub.positions.length / 3; indexTotal += sub.indices.length; }
  const positions = new Float32Array(vertexTotal * 3);
  const indices = new Uint32Array(indexTotal);
  let vertexOffset = 0, indexOffset = 0;
  for (const sub of subMeshes) {
    positions.set(sub.positions, vertexOffset * 3);
    for (let i = 0; i < sub.indices.length; i++) indices[indexOffset + i] = sub.indices[i]! + vertexOffset;
    vertexOffset += sub.positions.length / 3;
    indexOffset += sub.indices.length;
  }
  return {
    positions,
    indices,
    subMeshes,
    units: resolution.units,
    unitScale: resolution.unitScale,
    unitSource: resolution.unitSource,
  };
}
