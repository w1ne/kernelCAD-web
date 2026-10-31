// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Turntable MP4 of the low-poly GLBs listed in verification.json. Each frame
// is a software render of the exported files themselves: node world matrices,
// POSITION and COLOR_0 are read with glTF-Transform, every triangle is lit
// with its facet normal and drawn back to front as an SVG polygon. No
// three.js, no engine import.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(readFileSync(join(here, 'verification.json'), 'utf8'));
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-glb-lowpoly-'));

const W = 1280;
const H = 720;
const fps = 24;
const frames = 144;
const groundY = 560;
const pxPerM = 52;
const light = normalize([0.45, 0.8, 0.55]);

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function transform(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

async function loadTriangles(file) {
  const doc = await new NodeIO().read(join(here, file));
  const tris = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh === null) continue;
    const world = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const col = prim.getAttribute('COLOR_0');
      for (let i = 0; i + 2 < pos.getCount(); i += 3) {
        const v = [0, 1, 2].map((k) => transform(world, pos.getElement(i + k, [])));
        const c = col ? col.getElement(i, []) : [0.8, 0.8, 0.8];
        tris.push({ v, color: c.slice(0, 3).map(toSrgb) });
      }
    }
  }
  return tris;
}

function renderModel(tris, cx, yaw) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const tilt = 0.32;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const view = (p) => {
    const x = p[0] * cos + p[2] * sin;
    const z0 = -p[0] * sin + p[2] * cos;
    const y = p[1] * ct - z0 * st;
    const z = p[1] * st + z0 * ct;
    return [x, y, z];
  };
  const drawn = tris.map(({ v, color }) => {
    const pv = v.map(view);
    const a = [pv[1][0] - pv[0][0], pv[1][1] - pv[0][1], pv[1][2] - pv[0][2]];
    const b = [pv[2][0] - pv[0][0], pv[2][1] - pv[0][1], pv[2][2] - pv[0][2]];
    const n = normalize([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
    if (n[2] <= 0) return null; // back face (toward the viewer is +z)
    const shade = 0.45 + 0.55 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
    const rgb = color.map((c) => Math.round(Math.min(1, c * shade) * 255));
    const depth = (pv[0][2] + pv[1][2] + pv[2][2]) / 3;
    const pts = pv.map((p) => `${(cx + p[0] * pxPerM).toFixed(1)},${(groundY - p[1] * pxPerM).toFixed(1)}`).join(' ');
    return { depth, svg: `<polygon points="${pts}" fill="rgb(${rgb.join(',')})" stroke="rgb(${rgb.join(',')})" stroke-width="0.6" stroke-linejoin="round"/>` };
  }).filter(Boolean);
  drawn.sort((p, q) => p.depth - q.depth);
  return drawn.map((d) => d.svg).join('');
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const models = await Promise.all(evidence.variants.map(async (variant) => ({ variant, tris: await loadTriangles(variant.file) })));
const columns = models.map((_, i) => (W / (models.length + 1)) * (i + 1));

for (let f = 0; f < frames; f++) {
  const yaw = (f / frames) * Math.PI * 2;
  const bodies = models.map(({ tris }, i) => renderModel(tris, columns[i], yaw)).join('');
  const labels = models.map(({ variant }, i) => {
    const params = Object.entries(variant.params).map(([k, v]) => `${k}=${v}`).join(' ') || 'defaults';
    return `<text x="${columns[i]}" y="${groundY + 46}" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#17243a">${variant.stats.triangles} triangles · ${variant.stats.sizeM[1]} m tall</text>
      <text x="${columns[i]}" y="${groundY + 72}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#53657f">${escapeXml(params)}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="#eef3f8"/>
    <rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="#dfe7ef"/>
    <rect x="0" y="0" width="${W}" height="13" fill="#2866d5"/>
    <text x="64" y="78" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#17243a">Low-poly GLB export: one parametric pine, three variants</text>
    <text x="66" y="114" font-family="Arial,sans-serif" font-size="20" fill="#53657f">catalog/kits/nature/pine-tree.kcad.ts · style: 'lowpoly' · metres · one shared material, colour in COLOR_0 · budget 400</text>
    ${bodies}
    ${labels}
    <rect x="64" y="${H - 52}" width="610" height="32" rx="16" fill="#e0e9f7"/>
    <text x="84" y="${H - 31}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing=".6" fill="#31547f">SOFTWARE RENDER OF THE EXPORTED GLB TRIANGLES · NOT THREE.JS</text>
    <text x="${W - 64}" y="${H - 31}" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#66758b">kernelCAD · native geometry</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(frameDir, `frame-${String(f).padStart(4, '0')}.png`));
}

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frameDir, 'frame-%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', join(here, 'demo.mp4'),
]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(frameDir, 'frame-0018.png'), join(here, 'poster.png')]);
rmSync(frameDir, { recursive: true, force: true });
console.log(`wrote ${join(here, 'demo.mp4')}`);
