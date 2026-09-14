// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/heatmap.ts
//
// Turns a solved stress field into geometry the EXISTING renderer can draw.
//
// kernelCAD's offline render pipeline draws kernelCAD models — it has no
// notion of a per-vertex scalar field, and adding one would mean a second
// renderer with its own camera, lighting and watermark behaviour, which is
// exactly the divergence that makes visual evidence untrustworthy.
//
// So the field is expressed as geometry instead: the surface skin is split
// into N stress BANDS, each band written as its own STL body and given its
// own colour in a generated `.kcad.ts`. The result goes through
// `render_preview` unchanged — same camera set, same lighting, same
// watermark, same PNG paths an agent already knows how to read.
//
// The honest limitation, stated rather than hidden: banding QUANTIZES the
// field (default 8 bands). The numbers in the summary are the continuous
// truth; the picture is for locating the problem, not measuring it.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FeaFieldResult, FeaMesh } from './types';

/** Default band count. Eight reads clearly at thumbnail size and keeps the
 *  generated script's STL import count low. */
export const DEFAULT_BANDS = 8;

/** Blue -> cyan -> green -> yellow -> red, the conventional stress ramp.
 *  One entry per band at DEFAULT_BANDS; sampled for other counts. */
const RAMP: readonly string[] = [
  '#3b4cc0', '#5977e3', '#82a6fb', '#b9d0f9',
  '#f7b89c', '#ee8468', '#d65244', '#b40426',
];

function rampColor(i: number, n: number): string {
  const t = n <= 1 ? 0 : i / (n - 1);
  const idx = Math.min(RAMP.length - 1, Math.max(0, Math.round(t * (RAMP.length - 1))));
  return RAMP[idx];
}

/** Write a binary STL from explicit triangles. Facet normals are computed
 *  from the winding, which gmsh emits outward-facing for a solid's skin. */
export function binaryStl(
  tris: ReadonlyArray<readonly [readonly number[], readonly number[], readonly number[]]>,
): Buffer {
  const buf = Buffer.alloc(84 + tris.length * 50);
  buf.write('kernelCAD FEA stress band', 0, 'ascii');
  buf.writeUInt32LE(tris.length, 80);
  let off = 84;
  for (const [a, b, c] of tris) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (const v of [nx, ny, nz, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]) {
      buf.writeFloatLE(v, off);
      off += 4;
    }
    buf.writeUInt16LE(0, off);
    off += 2;
  }
  return buf;
}

export interface HeatmapBand {
  index: number;
  /** Inclusive lower / exclusive upper von Mises bound, MPa. */
  fromMPa: number;
  toMPa: number;
  color: string;
  triangleCount: number;
  stlPath: string;
}

export interface HeatmapBuild {
  bands: HeatmapBand[];
  /** Path of the generated `.kcad.ts` that assembles the coloured bands. */
  scriptPath: string;
  maxMPa: number;
}

/**
 * Split the solved skin into coloured stress bands and write the STL bodies
 * plus the generated script that assembles them.
 *
 * Returns the band table so the caller can report the legend alongside the
 * PNGs — a heatmap whose scale is unstated is decoration, not evidence.
 */
export async function buildHeatmap(
  mesh: FeaMesh,
  fields: FeaFieldResult,
  outDir: string,
  bandCount: number = DEFAULT_BANDS,
): Promise<HeatmapBuild> {
  const vmByNode = new Map<number, number>();
  for (let i = 0; i < fields.nodeIds.length; i++) vmByNode.set(fields.nodeIds[i], fields.vonMises[i]);
  const maxMPa = Math.max(...fields.vonMises, 0);

  const buckets: Array<Array<readonly [readonly number[], readonly number[], readonly number[]]>> =
    Array.from({ length: bandCount }, () => []);
  for (const surface of mesh.surfaces) {
    for (const tri of surface.tris) {
      const coords = tri.map(n => mesh.nodes.get(n));
      if (coords.some(c => c === undefined)) continue;
      const stress =
        (tri.reduce((acc, n) => acc + (vmByNode.get(n) ?? 0), 0)) / 3;
      const t = maxMPa > 0 ? stress / maxMPa : 0;
      const band = Math.min(bandCount - 1, Math.max(0, Math.floor(t * bandCount)));
      buckets[band].push([
        coords[0] as readonly number[],
        coords[1] as readonly number[],
        coords[2] as readonly number[],
      ]);
    }
  }

  const bands: HeatmapBand[] = [];
  const imports: string[] = [];
  for (let i = 0; i < bandCount; i++) {
    if (buckets[i].length === 0) continue;
    const stlPath = join(outDir, `stress-band-${i}.stl`);
    await writeFile(stlPath, binaryStl(buckets[i]));
    const color = rampColor(i, bandCount);
    bands.push({
      index: i,
      fromMPa: (maxMPa * i) / bandCount,
      toMPa: (maxMPa * (i + 1)) / bandCount,
      color,
      triangleCount: buckets[i].length,
      stlPath,
    });
    imports.push(
      `arm.part('band-${i}', (await lib.fromSTL('./stress-band-${i}.stl', { allowOpen: true })).color('${color}'));`,
    );
  }

  const legend = bands
    .map(b => `//   ${b.color}  ${b.fromMPa.toFixed(1)} – ${b.toMPa.toFixed(1)} MPa  (${b.triangleCount} facets)`)
    .join('\n');
  const script = [
    '// GENERATED by kernelCAD run_fea — von Mises stress heatmap.',
    '// Each body is one stress band of the solved surface; the source of truth',
    '// for the numbers is fea-summary.json next to this file.',
    '// Legend:',
    legend,
    '',
    "const arm = assembly('fea-stress-heatmap');",
    ...imports,
    'return arm.model();',
    '',
  ].join('\n');
  const scriptPath = join(outDir, 'stress-heatmap.kcad.ts');
  await writeFile(scriptPath, script, 'utf8');

  return { bands, scriptPath, maxMPa };
}
