// Renders the before/after panels and demo.mp4 from the measured placement.
// `verification.json` carries the numbers (measure.mjs produces them).
//
//   node docs/demos/svg-viewport-aspect/render.mjs
//
// Needs rsvg-convert and ffmpeg on PATH, as the other demo bundles do.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const facts = JSON.parse(readFileSync(resolve(here, 'verification.json'), 'utf8'));

const S = 4;                 // pixels per millimetre
const LEFT = 14;             // model-space left margin (mm)
const TOP = 210;             // model-space y of the top edge (mm)
const WIDTH_MM = 230;
const HEIGHT_MM = 240;

const X = (x) => (LEFT + x) * S;
const Y = (y) => (TOP - y) * S;
const pt = ([x, y]) => `${X(x)},${Y(y)}`;

function background() {
  return `<rect x="0" y="0" width="${WIDTH_MM * S}" height="${HEIGHT_MM * S}" fill="#ffffff"/>`;
}

function frame(title, subtitle) {
  return `
  <text x="${(LEFT + 4) * S}" y="${18 * S}" font-family="DejaVu Sans" font-size="${5.4 * S}" font-weight="700" fill="#111">${title}</text>
  <text x="${(LEFT + 4) * S}" y="${26 * S}" font-family="DejaVu Sans" font-size="${3.3 * S}" fill="#555">${subtitle}</text>`;
}

function viewportBox() {
  return `
  <rect x="${X(0)}" y="${Y(100)}" width="${200 * S}" height="${100 * S}" fill="#eef4ff" stroke="#2c6ecb" stroke-width="0.6" stroke-dasharray="3 2"/>
  <text x="${X(100)}" y="${Y(100) + 4.4 * S}" text-anchor="middle" font-family="DejaVu Sans" font-size="${3 * S}" fill="#2c6ecb">declared viewport 200 x 100 mm</text>`;
}

function dimensions() {
  return `
  <line x1="${X(0)}" y1="${Y(-6)}" x2="${X(200)}" y2="${Y(-6)}" stroke="#333" stroke-width="0.35"/>
  <line x1="${X(0)}" y1="${Y(-4)}" x2="${X(0)}" y2="${Y(-8)}" stroke="#333" stroke-width="0.35"/>
  <line x1="${X(200)}" y1="${Y(-4)}" x2="${X(200)}" y2="${Y(-8)}" stroke="#333" stroke-width="0.35"/>
  <text x="${X(100)}" y="${Y(-9)}" text-anchor="middle" font-family="DejaVu Sans" font-size="${3.4 * S}" fill="#333">200 mm viewport width</text>
  <line x1="${X(-6)}" y1="${Y(0)}" x2="${X(-6)}" y2="${Y(100)}" stroke="#333" stroke-width="0.35"/>
  <line x1="${X(-4)}" y1="${Y(0)}" x2="${X(-8)}" y2="${Y(0)}" stroke="#333" stroke-width="0.35"/>
  <line x1="${X(-4)}" y1="${Y(100)}" x2="${X(-8)}" y2="${Y(100)}" stroke="#333" stroke-width="0.35"/>
  <text x="${X(-8)}" y="${Y(50)}" text-anchor="middle" transform="rotate(-90 ${X(-8)} ${Y(50)})" font-family="DejaVu Sans" font-size="${3.2 * S}" fill="#333">100 mm height</text>`;
}

function beforePanel() {
  const b = facts.before;
  const box = b.bboxMm;
  const outside = `<rect x="${X(box.minX)}" y="${Y(box.maxY)}" width="${(box.width) * S}" height="${(box.height - 100) * S}"
    fill="#fdecea" stroke="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_MM * S}" height="${HEIGHT_MM * S}" viewBox="0 0 ${WIDTH_MM * S} ${HEIGHT_MM * S}">
  ${background()}
  ${viewportBox()}
  ${outside}
  <rect x="${X(box.minX)}" y="${Y(box.maxY)}" width="${box.width * S}" height="${box.height * S}" fill="none" stroke="#111" stroke-width="${0.7 * S}"/>
  <circle cx="${X(100)}" cy="${Y(100)}" r="${50 * S}" fill="none" stroke="#c0392b" stroke-width="${0.55 * S}"/>
  <text x="${X(100)}" y="${Y(-22)}" text-anchor="middle" font-family="DejaVu Sans" font-size="${3.4 * S}" fill="#c0392b">100 mm of the square falls outside the viewport (pink region)</text>
  ${dimensions()}
  ${frame('Before: 200 x 200 mm, not letterboxed', `unitScale ${b.unitScale}; bbox ${box.minX}..${box.maxX} x ${box.minY}..${box.maxY} mm; area ${Math.round(b.areaMm2[0])} mm²`)}
  </svg>`;
}

function afterPanel() {
  const a = facts.after;
  const box = a.bboxMm;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_MM * S}" height="${HEIGHT_MM * S}" viewBox="0 0 ${WIDTH_MM * S} ${HEIGHT_MM * S}">
  ${background()}
  ${viewportBox()}
  <rect x="${X(box.minX)}" y="${Y(box.maxY)}" width="${box.width * S}" height="${box.height * S}" fill="none" stroke="#111" stroke-width="${0.7 * S}"/>
  <circle cx="${X(100)}" cy="${Y(50)}" r="${25 * S}" fill="none" stroke="#c0392b" stroke-width="${0.55 * S}"/>
  <line x1="${X(50)}" y1="${Y(-6)}" x2="${X(150)}" y2="${Y(-6)}" stroke="#1e7b3c" stroke-width="0.5"/>
  <text x="${X(100)}" y="${Y(-22)}" text-anchor="middle" font-family="DejaVu Sans" font-size="${3.4 * S}" fill="#1e7b3c">centred square 100 x 100 mm</text>
  ${dimensions()}
  ${frame('After: 100 x 100 mm, xMidYMid meet', `unitScale ${a.unitScale}; bbox ${box.minX}..${box.maxX} x ${box.minY}..${box.maxY} mm; area ${Math.round(a.areaMm2[0])} mm²`)}
  </svg>`;
}

function poster(panels) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${panels.length * WIDTH_MM * S}" height="${HEIGHT_MM * S}" viewBox="0 0 ${panels.length * WIDTH_MM * S} ${HEIGHT_MM * S}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${panels.map((panel, index) => `<g transform="translate(${index * WIDTH_MM * S} 0)">${panel.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')}</g>`).join('')}
  </svg>`;
}

function write(name, content) {
  writeFileSync(resolve(here, name), content);
}

const before = beforePanel();
const after = afterPanel();
write('before.svg', before);
write('after.svg', after);
write('poster.svg', poster([before, after]));

execFileSync('rsvg-convert', ['-o', resolve(here, 'before.png'), resolve(here, 'before.svg')]);
execFileSync('rsvg-convert', ['-o', resolve(here, 'after.png'), resolve(here, 'after.svg')]);
execFileSync('rsvg-convert', ['-o', resolve(here, 'poster.png'), resolve(here, 'poster.svg')]);

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-loop', '1', '-t', '4', '-i', resolve(here, 'before.png'),
  '-loop', '1', '-t', '4', '-i', resolve(here, 'after.png'),
  '-filter_complex',
  '[0:v][1:v]xfade=transition=fade:duration=1:offset=3,format=yuv420p[v]',
  '-map', '[v]', '-r', '30', '-movflags', '+faststart',
  resolve(here, 'demo.mp4'),
]);
