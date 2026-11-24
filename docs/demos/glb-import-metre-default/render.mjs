// Draws the before/after panels from verification.json and encodes demo.mp4.
// The panels are drawn to the measured bounding boxes, not hand-typed sizes.
//
//   node docs/demos/glb-import-metre-default/render.mjs
//
// Needs rsvg-convert and ffmpeg on PATH.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const facts = JSON.parse(readFileSync(resolve(here, 'verification.json'), 'utf8'));

const W = 1280;
const H = 720;
const PANEL = W / 2;
const LEFT = 48;
const RIGHT = 60;
const SCALE_PX_PER_MM = (PANEL - LEFT - RIGHT) / 3000;
const Y_BEAM = 330;
const BEAM_H = 34;

const X = (mm) => LEFT + mm * SCALE_PX_PER_MM;

function esc(value) {
  return String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

function ruler() {
  const ticks = [];
  for (let m = 0; m <= 3; m++) {
    const x = X(m * 1000);
    ticks.push(`<line x1="${x}" y1="${Y_BEAM + BEAM_H + 44}" x2="${x}" y2="${Y_BEAM + BEAM_H + 58}" stroke="#9aa0a6" stroke-width="2"/>`);
    ticks.push(`<text x="${x}" y="${Y_BEAM + BEAM_H + 80}" text-anchor="middle" font-family="DejaVu Sans" font-size="16" fill="#6b7280">${m} m</text>`);
  }
  return ticks.join('');
}

function panel(side, data) {
  const offset = side === 'before' ? 0 : PANEL;
  const importedMm = data.bboxMm.size[0];
  const importedPx = importedMm * SCALE_PX_PER_MM;
  const title = side === 'before' ? 'Before: extent heuristic' : 'After: glTF metre rule';
  const revision = esc(data.revision);
  const unitLine = side === 'before'
    ? `no extras, no unit record: extent ${importedMm} &gt; 2, assumed millimetres`
    : `no extras: glTF metres, scale ${data.unitScale}, source ${esc(data.unitSource)}`;
  const verdict = side === 'before'
    ? '1000x too small'
    : 'matches the 3 m source';

  const imported = side === 'before'
    ? `<circle cx="${X(1.5)}" cy="${Y_BEAM + BEAM_H / 2}" r="7" fill="#c0392b"/>
       <line x1="${X(1.5)}" y1="${Y_BEAM - 26}" x2="${X(1.5) + 24}" y2="${Y_BEAM - 70}" stroke="#c0392b" stroke-width="2"/>
       <text x="${X(1.5) + 32}" y="${Y_BEAM - 78}" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="#c0392b">imported ${importedMm.toFixed(2)} mm</text>`
    : `<rect x="${X(0)}" y="${Y_BEAM}" width="${importedPx}" height="${BEAM_H}" fill="#2d6cdf" fill-opacity="0.18" stroke="#1d4ed8" stroke-width="2"/>
       <text x="${X(1500)}" y="${Y_BEAM - 16}" text-anchor="middle" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="#1d4ed8">imported ${importedMm.toFixed(0)} mm, exactly on the source</text>`;

  return `<g transform="translate(${offset} 0)">
    <line x1="0" y1="0" x2="0" y2="${H}" stroke="#e5e7eb" stroke-width="2"/>
    <text x="${LEFT}" y="62" font-family="DejaVu Sans" font-size="26" font-weight="700" fill="#111827">${title}</text>
    <text x="${LEFT}" y="92" font-family="DejaVu Sans" font-size="16" fill="#6b7280">${revision}</text>

    <text x="${LEFT}" y="${Y_BEAM - 120}" font-family="DejaVu Sans" font-size="18" fill="#374151">source part (raw glTF metres)</text>
    <rect x="${X(0)}" y="${Y_BEAM}" width="${X(3000) - X(0)}" height="${BEAM_H}" fill="#9ca3af" fill-opacity="0.22" stroke="#4b5563" stroke-width="2" stroke-dasharray="7 5"/>
    <text x="${X(1500)}" y="${Y_BEAM + BEAM_H / 2 + 6}" text-anchor="middle" font-family="DejaVu Sans" font-size="16" fill="#4b5563">3.00 m reference</text>

    <text x="${LEFT}" y="${Y_BEAM + 92}" font-family="DejaVu Sans" font-size="18" fill="#374151">imported display mesh</text>
    ${imported}
    ${side === 'before' ? `<rect x="${X(0)}" y="${Y_BEAM + 44}" width="${Math.max(importedPx, 1)}" height="6" fill="#c0392b"/>` : ''}

    ${ruler()}

    <text x="${LEFT}" y="${H - 112}" font-family="DejaVu Sans" font-size="17" fill="#111827">${unitLine}</text>
    <text x="${LEFT}" y="${H - 82}" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="${side === 'before' ? '#c0392b' : '#15803d'}">${verdict}</text>
    <text x="${LEFT}" y="${H - 48}" font-family="DejaVu Sans" font-size="15" fill="#6b7280">measured bbox ${data.bboxMm.size.map((v) => Number(v).toFixed(2)).join(' x ')} mm</text>
  </g>`;
}

function poster(data) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <text x="${LEFT}" y="26" font-family="DejaVu Sans" font-size="15" fill="#6b7280">kernelCAD lib.meshFromGLB / decodeGlbMesh, same 1108-byte beam.glb</text>
    ${panel('before', data.before)}
    ${panel('after', data.after)}
    <text x="${W - 18}" y="${H - 16}" text-anchor="end" font-family="DejaVu Sans" font-size="13" fill="#9ca3af">local decoder measurement, not a viewer screenshot</text>
  </svg>`;
}

writeFileSync(resolve(here, 'poster.svg'), poster(facts));
execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', resolve(here, 'poster.png'), resolve(here, 'poster.svg')]);
execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', resolve(here, 'before.png'), '-'], {
  input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${panel('before', facts.before)}</svg>`),
});
execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', resolve(here, 'after.png'), '-'], {
  input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${panel('after', facts.after)}</svg>`),
});

execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-loop', '1', '-t', '6.0', '-i', resolve(here, 'poster.png'),
  '-vf', 'fade=t=in:st=0:d=0.5,fade=t=out:st=5.5:d=0.5,format=yuv420p',
  '-r', '24', '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart',
  resolve(here, 'demo.mp4'),
]);
console.log('wrote poster.svg, poster.png, before.png, after.png, demo.mp4');
