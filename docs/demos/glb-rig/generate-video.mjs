// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, 'demo.mp4');
const evidence = JSON.parse(readFileSync(join(here, 'verification.json'), 'utf8'));
const tempRoot = process.env.TMPDIR;
if (!tempRoot?.startsWith('/Volumes/LabWired/tmp')) {
  throw new Error('Set TMPDIR under /Volumes/LabWired/tmp before creating demo frames.');
}
const frameDir = mkdtempSync(join(tempRoot, 'kcad-glb-rig-'));

const W = 1280;
const H = 720;
const fps = 20;
const sceneFrames = 120;
const pivotX = 920;
const pivotY = 420;
const scale = 7.5;
const hingeY = 20;
const hingeZ = 4;

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function mapPoint(y, z) {
  return [pivotX + (y - hingeY) * scale, pivotY - (z - hingeZ) * scale];
}

function poly(points, fill, stroke = '#23354d', width = 3) {
  return `<polygon points="${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

function panel(title, subtitle, body, badge = 'EXPORT MATH PREVIEW · NOT A THREE.JS RENDER') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="#f4f7fb"/>
    <rect x="0" y="0" width="${W}" height="13" fill="#2866d5"/>
    <text x="72" y="90" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="#17243a">${escapeXml(title)}</text>
    <text x="74" y="133" font-family="Arial,sans-serif" font-size="22" fill="#53657f">${escapeXml(subtitle)}</text>
    ${body}
    <rect x="72" y="641" width="500" height="34" rx="17" fill="#e0e9f7"/>
    <text x="92" y="664" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".7" fill="#31547f">${escapeXml(badge)}</text>
    <text x="1205" y="661" text-anchor="end" font-family="Arial,sans-serif" font-size="16" fill="#66758b">kernelCAD · GLB rig pivots</text>
  </svg>`;
}

function diagram(angle) {
  const lidVertices = [
    [-15, -2], [15, -2], [15, 2], [-15, 2],
  ].map(([y, z]) => {
    const worldY = y + 5;
    const worldZ = z + 6;
    const rad = angle * Math.PI / 180;
    const relativeY = worldY - hingeY;
    const relativeZ = worldZ - hingeZ;
    // Local +Z is aligned to the assembly's -X hinge connector.
    const turnedY = relativeY * Math.cos(rad) + relativeZ * Math.sin(rad);
    const turnedZ = -relativeY * Math.sin(rad) + relativeZ * Math.cos(rad);
    return mapPoint(hingeY + turnedY, hingeZ + turnedZ);
  });
  const base = [[-20, -4], [20, -4], [20, 4], [-20, 4]].map(([y, z]) => mapPoint(y, z));
  const hinge = mapPoint(hingeY, hingeZ);
  const far = lidVertices[0];
  const content = `
    <rect x="72" y="182" width="475" height="350" rx="22" fill="#fff" stroke="#d8e1ee"/>
    <text x="100" y="224" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#415573">ASSEMBLY TREE</text>
    <text x="112" y="274" font-family="monospace" font-size="19" fill="#34445d">base</text>
    <text x="132" y="318" font-family="monospace" font-size="19" fill="#2866d5">pivot:lid · local +Z</text>
    <text x="155" y="362" font-family="monospace" font-size="19" fill="#34445d">part:lid → mesh lid</text>
    <rect x="96" y="397" width="425" height="98" rx="14" fill="#f4f7fb"/>
    <text x="118" y="436" font-family="Arial,sans-serif" font-size="16" fill="#556781">asset.extras.kernelcad.rig.lid</text>
    <text x="118" y="470" font-family="monospace" font-size="18" fill="#17243a">rotate · z · [0, 110]°</text>
    <rect x="592" y="182" width="616" height="350" rx="22" fill="#fff" stroke="#d8e1ee"/>
    <text x="622" y="224" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#415573">HINGE SIDE VIEW · ${angle.toFixed(0)}°</text>
    <line x1="625" y1="470" x2="1165" y2="470" stroke="#dbe2eb" stroke-width="2"/>
    ${poly(base, '#b9c7da')}
    ${poly(lidVertices, '#5b91e8')}
    <circle cx="${hinge[0]}" cy="${hinge[1]}" r="9" fill="#ff9b37" stroke="#8d4e12" stroke-width="3"/>
    <line x1="${hinge[0]}" y1="${hinge[1]}" x2="${far[0]}" y2="${far[1]}" stroke="#d77915" stroke-width="2" stroke-dasharray="7 6"/>
    <text x="622" y="520" font-family="Arial,sans-serif" font-size="16" fill="#52657e">Orange dot = exported pivot origin. Blue lid rotates; gray base stays grounded.</text>
    <text x="622" y="555" font-family="Arial,sans-serif" font-size="16" fill="#52657e">GLB SHA-256: ${evidence.glbSha256.slice(0, 28)}…</text>
  `;
  return panel('Mates become editable GLB pivots', 'Original box + lid assembly → resolved hierarchy → local-axis motion', content);
}

async function saveFrame(index, svg) {
  await sharp(Buffer.from(svg)).png().toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
}

try {
  let index = 0;
  for (let i = 0; i < 30; i++) {
    const body = `
      <rect x="90" y="190" width="1090" height="360" rx="24" fill="#fff" stroke="#d8e1ee"/>
      <text x="140" y="270" font-family="monospace" font-size="25" fill="#23354d">examples/assemblies/glb-rig-hinge.kcad.ts</text>
      <text x="140" y="335" font-family="Arial,sans-serif" font-size="22" fill="#53657f">Native box geometry · named axis connectors · one revolute mate</text>
      <text x="140" y="399" font-family="monospace" font-size="19" fill="#2866d5">TMPDIR=/Volumes/LabWired/tmp</text>
      <text x="140" y="432" font-family="monospace" font-size="19" fill="#2866d5">npx vitest run tests/integration/kernel/export/glbRigDemoCapture.test.ts</text>
      <text x="140" y="482" font-family="Arial,sans-serif" font-size="22" fill="#17243a">GLB bytes and asset extras verified from the emitted file.</text>`;
    await saveFrame(index++, panel('From assembly mates to GLB rig', 'One original kernelCAD model; no external meshes or downloads', body));
  }
  for (let i = 0; i < 30; i++) {
    await saveFrame(index++, diagram(0));
  }
  for (let i = 0; i < 50; i++) {
    await saveFrame(index++, diagram((90 * i) / 49));
  }
  for (let i = 0; i < 10; i++) {
    await saveFrame(index++, diagram(90));
  }
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps),
    '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    output,
  ], { stdio: 'inherit' });
  console.log(`Wrote ${resolve(output)} (6.0s, ${fps} fps, 1280x720).`);
} finally {
  rmSync(frameDir, { recursive: true, force: true });
}
