// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Software render of a GLB's own triangles: node world matrices, POSITION and
// COLOR_0 read with glTF-Transform, each triangle lit by its facet normal and
// rasterised with a z-buffer (2x supersampled, downsampled by sharp). Meant for
// flat-shaded low-poly catalog previews; it is not a three.js render.

import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

export interface SoftTriangle {
  v: [number, number, number][];
  color: [number, number, number];
}

const toSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function transform(m: ArrayLike<number>, p: ArrayLike<number>): [number, number, number] {
  return [
    m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
    m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
    m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** World-space triangles (metres for low-poly files) with sRGB colours. */
export async function glbTriangles(bytes: Uint8Array): Promise<SoftTriangle[]> {
  const doc = await new NodeIO().readBinary(bytes);
  const tris: SoftTriangle[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh === null) continue;
    const world = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos === null) continue;
      const col = prim.getAttribute('COLOR_0');
      const base = prim.getMaterial()?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
      const index = prim.getIndices();
      const count = index === null ? pos.getCount() : index.getCount();
      const at = (k: number): number => (index === null ? k : index.getScalar(k));
      for (let i = 0; i + 2 < count; i += 3) {
        const v = [0, 1, 2].map((k) => transform(world, pos.getElement(at(i + k), []))) as SoftTriangle['v'];
        const c = col === null ? base : col.getElement(at(i), []);
        tris.push({ v, color: [toSrgb(c[0]!), toSrgb(c[1]!), toSrgb(c[2]!)] });
      }
    }
  }
  return tris;
}

export interface RenderOptions {
  size?: number;
  yawDeg?: number;
  pitchDeg?: number;
  background?: string;
  label?: string;
  /** Fixed framing: this many metres of height fill the frame, ground (y = 0)
   *  at the bottom. Use the same value for images that must compare in size. */
  frameHeightM?: number;
}

/** PNG of the triangles from a 3/4 view, framed to fit. */
export async function renderTrianglesPng(tris: SoftTriangle[], options: RenderOptions = {}): Promise<Buffer> {
  const size = options.size ?? 512;
  const yaw = ((options.yawDeg ?? 35) * Math.PI) / 180;
  const pitch = ((options.pitchDeg ?? 22) * Math.PI) / 180;
  const light = normalize([0.45, 0.8, 0.55]);
  const view = (p: [number, number, number]): [number, number, number] => {
    const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw);
    const z0 = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
    return [x, p[1] * Math.cos(pitch) - z0 * Math.sin(pitch), p[1] * Math.sin(pitch) + z0 * Math.cos(pitch)];
  };
  const viewed = tris.map((t) => ({ pv: t.v.map(view), color: t.color }));
  const xs = viewed.flatMap((t) => t.pv.map((p) => p[0]));
  const ys = viewed.flatMap((t) => t.pv.map((p) => p[1]));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const margin = size * 0.1;
  const labelSpace = options.label === undefined ? 0 : size * 0.09;
  const fixed = options.frameHeightM;
  const scale = fixed !== undefined
    ? (size - 2 * margin - labelSpace) / fixed
    : Math.min((size - 2 * margin) / Math.max(maxX - minX, 1e-6), (size - 2 * margin - labelSpace) / Math.max(maxY - minY, 1e-6));
  const cx = size / 2 - ((minX + maxX) / 2) * scale;
  const cy = fixed !== undefined
    ? size - margin - labelSpace
    : (size - labelSpace) / 2 + ((minY + maxY) / 2) * scale;
  // Z-buffered scanline rasteriser at 2x, downsampled by sharp (antialiasing).
  const ss = 2;
  const n2 = size * ss;
  const bg = hexRgb(options.background ?? '#eef3f8');
  const rgb = new Uint8ClampedArray(n2 * n2 * 3);
  for (let i = 0; i < n2 * n2; i++) rgb.set(bg, i * 3);
  const zbuf = new Float32Array(n2 * n2).fill(-Infinity);
  for (const { pv, color } of viewed) {
    const a = [pv[1]![0] - pv[0]![0], pv[1]![1] - pv[0]![1], pv[1]![2] - pv[0]![2]];
    const b = [pv[2]![0] - pv[0]![0], pv[2]![1] - pv[0]![1], pv[2]![2] - pv[0]![2]];
    const n = normalize([a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!]);
    if (n[2] <= 0) continue; // back face (toward the viewer is +z)
    const shade = 0.45 + 0.55 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
    const fill = color.map((c) => Math.round(Math.min(1, c * shade) * 255));
    const sx = pv.map((p) => (cx + p[0] * scale) * ss);
    const sy = pv.map((p) => (cy - p[1] * scale) * ss);
    const sz = pv.map((p) => p[2]);
    const area = (sx[1]! - sx[0]!) * (sy[2]! - sy[0]!) - (sx[2]! - sx[0]!) * (sy[1]! - sy[0]!);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...sx))), x1 = Math.min(n2 - 1, Math.ceil(Math.max(...sx)));
    const y0 = Math.max(0, Math.floor(Math.min(...sy))), y1 = Math.min(n2 - 1, Math.ceil(Math.max(...sy)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((sx[1]! - px) * (sy[2]! - py) - (sx[2]! - px) * (sy[1]! - py)) / area;
        const w1 = ((sx[2]! - px) * (sy[0]! - py) - (sx[0]! - px) * (sy[2]! - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const z = w0 * sz[0]! + w1 * sz[1]! + w2 * sz[2]!;
        const k = y * n2 + x;
        if (z <= zbuf[k]!) continue;
        zbuf[k] = z;
        rgb.set(fill, k * 3);
      }
    }
  }
  const body = await sharp(Buffer.from(rgb.buffer), { raw: { width: n2, height: n2, channels: 3 } })
    .resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  if (options.label === undefined) return body;
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><text x="${size / 2}" y="${size - size * 0.035}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(size * 0.038)}" fill="#33445c">${options.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</text></svg>`;
  return await sharp(body).composite([{ input: Buffer.from(label) }]).png().toBuffer();
}

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
