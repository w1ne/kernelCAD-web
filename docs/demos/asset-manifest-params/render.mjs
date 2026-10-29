// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Render the locally captured workflow/result into a readable, deterministic MP4.
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(resolve(here, 'asset-manifest.json'), 'utf8'));
const frameDir = '/Volumes/LabWired/tmp/pr2-asset-manifest-frames';
const videoPath = resolve(here, 'asset-manifest.mp4');
await mkdir(frameDir, { recursive: true });

const W = 1280;
const H = 720;
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const base = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0b1220"/>
  <rect x="48" y="40" width="1184" height="640" rx="18" fill="#111c2f" stroke="#2c4260"/>
  <text x="88" y="102" fill="#73d5ff" font-family="Arial,sans-serif" font-size="22" font-weight="700">kernelCAD · local feature demo · 2026-10-29</text>
  ${body}
</svg>`;
const text = (x, y, value, size = 24, color = '#e8f0fb', family = 'Arial,sans-serif', weight = 400) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;

const frames = [
  base([
    text(88, 210, 'Asset manifest', 56, '#ffffff', 'Arial,sans-serif', 700),
    text(88, 270, 'Typed knobs + validated metadata + named presets', 29),
    text(88, 360, '1  Build the original mounting-plate example locally', 25),
    text(88, 414, '2  Call the read-only asset_manifest MCP registry handler', 25),
    text(88, 468, '3  Validate and return { meta, params, presets }', 25),
    text(88, 570, 'Local replay only · not deployed · no hardware acceptance claimed', 19, '#a9bbd2'),
  ].join('')),
  base([
    text(88, 168, 'Authoring source', 40, '#ffffff', 'Arial,sans-serif', 700),
    text(88, 235, "meta({ name: 'Parametric mounting plate', ... })", 23, '#d7e5fa', 'Menlo,monospace'),
    text(88, 285, 'const knobs = params({', 23, '#d7e5fa', 'Menlo,monospace'),
    text(120, 329, "width: { default: 80, min: 40, max: 140, unit: 'mm' },", 20, '#d7e5fa', 'Menlo,monospace'),
    text(120, 370, "holeDiameter: { default: 6, min: 3, max: 12, unit: 'mm' },", 20, '#d7e5fa', 'Menlo,monospace'),
    text(88, 412, '});', 23, '#d7e5fa', 'Menlo,monospace'),
    text(88, 470, "presets({ Compact: { width: 60, ... }, Standard: { ... } });", 20, '#d7e5fa', 'Menlo,monospace'),
    text(88, 570, 'The same CaptureSession owns metadata, knobs and preset declarations.', 19, '#a9bbd2'),
  ].join('')),
  base([
    text(88, 160, 'Validated MCP result', 40, '#ffffff', 'Arial,sans-serif', 700),
    text(88, 220, `meta.name: ${manifest.meta.name}`, 23, '#9ce9b4', 'Menlo,monospace'),
    text(88, 258, `content license: ${manifest.meta.license} (default)`, 21, '#d7e5fa', 'Menlo,monospace'),
    text(88, 314, `evaluated params: ${Object.keys(manifest.params).length} · presets: ${manifest.presets.length}`, 21, '#d7e5fa', 'Menlo,monospace'),
    ...Object.entries(manifest.params).slice(0, 5).map(([key, value], i) => text(120, 367 + i * 36, `${key}: ${JSON.stringify(value)}`, 20, '#d7e5fa', 'Menlo,monospace')),
    text(88, 592, `Preset order: ${manifest.presets.map(preset => preset.name).join(' → ')}`, 19, '#a9bbd2'),
  ].join('')),
];

for (let i = 0; i < frames.length; i += 1) {
  await sharp(Buffer.from(frames[i])).png().toFile(resolve(frameDir, `frame-${String(i).padStart(2, '0')}.png`));
}

const ffmpeg = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', '1/3', '-i', resolve(frameDir, 'frame-%02d.png'),
  '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24',
  '-movflags', '+faststart', videoPath,
], { encoding: 'utf8' });
if (ffmpeg.status !== 0) throw new Error(ffmpeg.stderr || `ffmpeg exited ${ffmpeg.status}`);
console.log(`Wrote ${videoPath}`);
