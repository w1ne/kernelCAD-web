// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender.ts';

const here = dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(readFileSync(join(here, 'verification.json'), 'utf8'));
const exportedTriangles = await glbTriangles(readFileSync(join(here, 'handoff.glb')));
const exportedMeshView = await renderTrianglesPng(exportedTriangles, {
  size: 320,
  yawDeg: 35,
  pitchDeg: 22,
  background: '#ffffff',
  frameHeightM: 0.62,
});
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-glb-meter-'));
const output = join(here, 'demo.mp4');
const width = 1280;
const height = 720;
const fps = 20;

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function frame(section) {
  const title = section === 0 ? 'Author in millimetres' : section === 1 ? 'Export GLB in metres' : 'Confirm the standard-viewer size';
  const caption = section === 0
    ? '700 × 300 × 12 mm base plate · named brass standoff · two PBR finishes'
    : section === 1
      ? 'Default units: m · scene-root scale: 0.001 · named nodes retained'
      : 'Imported bounds: 0.7 × 0.3 × 0.012 m · dimensions match the source';
  const rows = section === 0
    ? `<text x="92" y="285" font-family="monospace" font-size="20" fill="#284a7a">box(700, 300, 12)</text><text x="92" y="333" font-family="monospace" font-size="16" fill="#284a7a">.material({ name: 'anodized aluminium', ... })</text><text x="92" y="381" font-family="monospace" font-size="20" fill="#284a7a">cylinder(40, 25).finish('brass')</text>`
    : section === 1
      ? `<text x="92" y="285" font-family="monospace" font-size="20" fill="#284a7a">units: m</text><text x="92" y="333" font-family="monospace" font-size="20" fill="#284a7a">asset.extras.kernelcad.units = "m"</text><text x="92" y="381" font-family="monospace" font-size="20" fill="#284a7a">nodes: base_plate · brass_standoff</text>`
      : `<text x="92" y="285" font-family="monospace" font-size="20" fill="#284a7a">${escapeXml(evidence.importedSizeM.map((value) => value.toFixed(3)).join(' × '))} m</text><text x="92" y="333" font-family="monospace" font-size="20" fill="#284a7a">materials: anodized aluminium · brass</text><text x="92" y="381" font-family="monospace" font-size="16" fill="#53657f">sha256 ${escapeXml(evidence.glbSha256.slice(0, 26))}…</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f7fb"/><rect width="100%" height="13" fill="#2866d5"/>
    <text x="72" y="84" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#17243a">${title}</text>
    <text x="74" y="126" font-family="Arial,sans-serif" font-size="21" fill="#53657f">GLB physical-scale handoff · local export evidence</text>
    <rect x="72" y="164" width="565" height="386" rx="22" fill="#fff" stroke="#d8e1ee"/>
    ${rows}
    <rect x="665" y="164" width="543" height="386" rx="22" fill="#fff" stroke="#d8e1ee"/>
    <text x="695" y="205" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#415573">EXPORTED GLB TRIANGLES · SOFTWARE RENDER</text>
    <text x="695" y="579" font-family="Arial,sans-serif" font-size="15" fill="#52657e">Mesh rendered from the GLB; no interactive viewer or simulation.</text>
    <text x="72" y="634" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#17243a">${caption}</text>
    <rect x="72" y="658" width="370" height="30" rx="15" fill="#e0e9f7"/><text x="90" y="679" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing=".6" fill="#31547f">LOCAL EXPORT · METADATA + BOUNDS VERIFIED</text>
    <text x="1205" y="679" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#66758b">kernelCAD · GLB scale</text>
  </svg>`;
}

try {
  for (let index = 0; index < 150; index += 1) {
    const section = Math.min(2, Math.floor(index / 50));
    const background = await sharp(Buffer.from(frame(section))).png().toBuffer();
    await sharp(background)
      .composite([{ input: exportedMeshView, left: 776, top: 214 }])
      .png()
      .toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
  }
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '26',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
  ], { stdio: 'inherit' });
  console.log(`Wrote ${resolve(output)} (7.5s, ${fps} fps, ${width}x${height}).`);
} finally {
  rmSync(frameDir, { recursive: true, force: true });
}
