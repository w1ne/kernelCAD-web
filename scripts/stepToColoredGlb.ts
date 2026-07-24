// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/stepToColoredGlb.ts
//
// Convert a STEP file to a small COLORED GLB at catalog-build time, so the web
// 3D viewer (labwired scene3d etc.) can load a pre-tessellated mesh through
// three.js and NEVER download the 7.6 MB OCCT wasm decoder.
//
// Why not the kernelCAD kernel's own `fromSTEP -> export glb`? It discards the
// AP214 per-face colors — the output is a single grey material. These Adafruit
// sensor STEPs carry 18-24 real colors; dropping them would render every sensor
// as a grey blob (worse than the procedural stand-in it replaces).
//
// This reads the STEP with occt-import-js (the SAME decoder labwired runs in the
// browser) and ports its per-face color grouping (stepLoader.ts "Path A"): one
// GLB primitive + material per unique face color. So the colors survive, done
// ONCE here instead of on every page load.

import { readFileSync } from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import occtimportjs from 'occt-import-js';

interface OcctFace { first: number; last: number; color?: number[] }
interface OcctMesh {
  name?: string;
  attributes?: { position?: { array?: number[] }; normal?: { array?: number[] } };
  index?: { array?: number[] };
  color?: number[];
  brep_faces?: OcctFace[];
}
interface OcctResult { success?: boolean; meshes?: OcctMesh[] }

/** Normalize an OCCT color array (0–1 or 0–255) to a [r,g,b] triple in 0–1. */
function normColor(c: number[] | undefined): [number, number, number] | null {
  if (!c || c.length < 3) return null;
  let [r, g, b] = c;
  if (r > 1 || g > 1 || b > 1) { r /= 255; g /= 255; b /= 255; }
  if (![r, g, b].every(Number.isFinite)) return null;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [clamp(r), clamp(g), clamp(b)];
}

function colorKey(c: [number, number, number]): string {
  return c.map((v) => v.toFixed(4)).join(',');
}

/** Electronics-ish PBR: bright low-chroma colors read as metal leads/cans. */
function pbrFor(c: [number, number, number]): { metallic: number; roughness: number } {
  const [r, g, b] = c;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (chroma < 0.06 && lum > 0.5) return { metallic: 0.9, roughness: 0.3 }; // tin/silver
  if (chroma < 0.08 && lum < 0.2) return { metallic: 0.25, roughness: 0.5 }; // black epoxy
  return { metallic: 0.15, roughness: 0.6 }; // plastic / solder mask
}

let occtPromise: Promise<{ ReadStepFile: (d: Uint8Array, p: null | object) => OcctResult }> | null = null;
function loadOcct() {
  if (!occtPromise) occtPromise = (occtimportjs as unknown as () => Promise<never>)();
  return occtPromise;
}

/**
 * Read `stepPath`, tessellate + color via OCCT, write a colored GLB to `outPath`.
 * Returns the number of distinct materials (colors) emitted — >1 proves colors
 * survived; 1 means the source STEP carried no usable face colors.
 */
export async function stepToColoredGlb(stepPath: string, outPath: string): Promise<number> {
  const occt = await loadOcct();
  const bytes = new Uint8Array(readFileSync(stepPath));
  const result = occt.ReadStepFile(bytes, null);
  if (!result?.success || !result.meshes?.length) {
    throw new Error(`OCCT could not read ${stepPath}`);
  }

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const node = doc.createNode();
  scene.addChild(node);
  const glMesh = doc.createMesh();
  node.setMesh(glMesh);

  const materials = new Map<string, ReturnType<Document['createMaterial']>>();
  const materialFor = (c: [number, number, number]) => {
    const key = colorKey(c);
    let m = materials.get(key);
    if (!m) {
      const { metallic, roughness } = pbrFor(c);
      m = doc.createMaterial()
        .setBaseColorFactor([c[0], c[1], c[2], 1])
        .setMetallicFactor(metallic)
        .setRoughnessFactor(roughness);
      materials.set(key, m);
    }
    return m;
  };

  const addPrimitive = (
    pos: number[], norm: number[] | null, idx: number[], color: [number, number, number],
  ) => {
    if (idx.length < 3) return;
    const prim = doc.createPrimitive();
    prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer));
    if (norm && norm.length === pos.length) {
      prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(norm)).setBuffer(buffer));
    }
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
    prim.setMaterial(materialFor(color));
    glMesh.addPrimitive(prim);
  };

  const GREY: [number, number, number] = [0.42, 0.42, 0.45];

  for (const mesh of result.meshes) {
    const posArr = mesh.attributes?.position?.array;
    if (!posArr || posArr.length < 9) continue;
    const normArr = mesh.attributes?.normal?.array;
    const hasNorm = !!normArr && normArr.length === posArr.length;
    const indexArr = mesh.index?.array;
    const faces = mesh.brep_faces;

    // Path A: split triangles by per-face color (KiCad/Adafruit AP214).
    if (faces && faces.length > 0 && indexArr && indexArr.length >= 3) {
      const byColor = new Map<string, { color: [number, number, number]; tris: number[] }>();
      let coloredFaces = 0;
      for (const face of faces) {
        const parsed = normColor(face.color);
        if (parsed) coloredFaces += 1;
        const color = parsed ?? GREY;
        const key = colorKey(color);
        let bucket = byColor.get(key);
        if (!bucket) { bucket = { color, tris: [] }; byColor.set(key, bucket); }
        const firstTri = Math.max(0, face.first | 0);
        const lastTri = Math.max(firstTri, face.last | 0);
        for (let t = firstTri; t <= lastTri; t++) {
          const base = t * 3;
          if (base + 2 >= indexArr.length) break;
          bucket.tris.push(indexArr[base], indexArr[base + 1], indexArr[base + 2]);
        }
      }
      if (coloredFaces > 0) {
        for (const bucket of byColor.values()) {
          // Compact to used vertices for a small buffer.
          const used = new Map<number, number>();
          const newPos: number[] = [];
          const newNorm: number[] = [];
          const newIdx: number[] = [];
          for (const oldI of bucket.tris) {
            let ni = used.get(oldI);
            if (ni === undefined) {
              ni = used.size;
              used.set(oldI, ni);
              newPos.push(posArr[oldI * 3], posArr[oldI * 3 + 1], posArr[oldI * 3 + 2]);
              if (hasNorm) newNorm.push(normArr![oldI * 3], normArr![oldI * 3 + 1], normArr![oldI * 3 + 2]);
            }
            newIdx.push(ni);
          }
          addPrimitive(newPos, hasNorm ? newNorm : null, newIdx, bucket.color);
        }
        continue;
      }
    }

    // Path B: whole-mesh color (or grey fallback).
    const wholeColor = normColor(mesh.color)
      ?? normColor(faces?.find((f) => f.color && f.color.length >= 3)?.color)
      ?? GREY;
    const idx = indexArr
      ? Array.from(indexArr)
      : Array.from({ length: posArr.length / 3 }, (_, i) => i);
    addPrimitive(Array.from(posArr), hasNorm ? Array.from(normArr!) : null, idx, wholeColor);
  }

  if (glMesh.listPrimitives().length === 0) {
    throw new Error(`no geometry produced from ${stepPath}`);
  }

  await new NodeIO().write(outPath, doc);
  return materials.size;
}

const invokedDirectly = process.argv[1] !== undefined && /stepToColoredGlb\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  const [stepPath, outPath] = process.argv.slice(2);
  if (!stepPath || !outPath) {
    console.error('usage: stepToColoredGlb <in.step> <out.glb>');
    process.exit(1);
  }
  stepToColoredGlb(stepPath, outPath)
    .then((n) => console.log(`wrote ${outPath} with ${n} material(s)`))
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
