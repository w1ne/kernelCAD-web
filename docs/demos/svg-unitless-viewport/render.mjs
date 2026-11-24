// Renders the before/after panels and demo.mp4 from the measured placement.
// `verification.json` carries the numbers (measure.mjs produces them).
//
//   node docs/demos/svg-unitless-viewport/render.mjs
//
// Needs rsvg-convert and ffmpeg on PATH, as the other demo bundles do.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const facts = JSON.parse(readFileSync(resolve(here, 'verification.json'), 'utf8'));

const S = 8;                     // pixels per millimetre
const WIDTH_MM = 74;             // panel width
const HEIGHT_MM = 82;            // panel height
const LEFT_MM = 10;              // model-space left margin
const BASELINE_MM = 72;          // model-space y of the x axis

const X = (x) => (LEFT_MM + x) * S;
const Y = (y) => (BASELINE_MM - y) * S;
const PX = (v) => v * S;

function background() {
  return `<rect x="0" y="0" width="${WIDTH_MM * S}" height="${HEIGHT_MM * S}" fill="#ffffff"/>`;
}

function grid() {
  const lines = [];
  for (let x = 0; x <= 60; x += 10) {
    lines.push(`<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(60)}" stroke="#e8e8e8" stroke-width="1"/>`);
    lines.push(`<line x1="${X(0)}" y1="${Y(x)}" x2="${X(60)}" y2="${Y(x)}" stroke="#e8e8e8" stroke-width="1"/>`);
  }
  return lines.join('');
}

function frame(title, subtitle) {
  return `
  <text x="${LEFT_MM * S}" y="${5 * S}" font-family="DejaVu Sans" font-size="${3.8 * S}" font-weight="700" fill="#111">${title}</text>
  <text x="${LEFT_MM * S}" y="${10 * S}" font-family="DejaVu Sans" font-size="${2.4 * S}" fill="#555">${subtitle}</text>`;
}

function scaleBar() {
  return `
  <line x1="${X(36)}" y1="${Y(55)}" x2="${X(46)}" y2="${Y(55)}" stroke="#333" stroke-width="${0.45 * S}"/>
  <line x1="${X(36)}" y1="${Y(53.5)}" x2="${X(36)}" y2="${Y(56.5)}" stroke="#333" stroke-width="${0.35 * S}"/>
  <line x1="${X(46)}" y1="${Y(53.5)}" x2="${X(46)}" y2="${Y(56.5)}" stroke="#333" stroke-width="${0.35 * S}"/>
  <text x="${X(46) + S}" y="${Y(54.6)}" font-family="DejaVu Sans" font-size="${2.6 * S}" fill="#333">10 mm</text>`;
}

function panel(factsForPanel) {
  const s = factsForPanel.unitScale;
  const rectX = 6 * s;
  const rectY = 6 * s;
  const rectW = 84 * s;
  const rectH = 84 * s;
  const cx = 48 * s;
  const cy = 48 * s;
  const r = 26 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_MM * S}" height="${HEIGHT_MM * S}" viewBox="0 0 ${WIDTH_MM * S} ${HEIGHT_MM * S}">
  ${background()}
  ${grid()}
  <rect x="${X(rectX)}" y="${Y(rectY + rectH)}" width="${PX(rectW)}" height="${PX(rectH)}" fill="none" stroke="#111" stroke-width="${0.55 * S}"/>
  <circle cx="${X(cx)}" cy="${Y(cy)}" r="${PX(r)}" fill="none" stroke="#c0392b" stroke-width="${0.55 * S}"/>
  <line x1="${X(0)}" y1="${Y(-2)}" x2="${X(rectW)}" y2="${Y(-2)}" stroke="#1e7b3c" stroke-width="${0.4 * S}"/>
  <line x1="${X(0)}" y1="${Y(-3.5)}" x2="${X(0)}" y2="${Y(-0.5)}" stroke="#1e7b3c" stroke-width="${0.3 * S}"/>
  <line x1="${X(rectW)}" y1="${Y(-3.5)}" x2="${X(rectW)}" y2="${Y(-0.5)}" stroke="#1e7b3c" stroke-width="${0.3 * S}"/>
  <text x="${X(rectW / 2)}" y="${Y(-1.2)}" text-anchor="middle" font-family="DejaVu Sans" font-size="${2.8 * S}" fill="#1e7b3c">${rectW.toFixed(2)} mm square</text>
  ${scaleBar()}
  ${frame(factsForPanel.title, factsForPanel.subtitle)}
  </svg>`;
}

function poster(panels) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${panels.length * WIDTH_MM * S}" height="${HEIGHT_MM * S}" viewBox="0 0 ${panels.length * WIDTH_MM * S} ${HEIGHT_MM * S}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${panels.map((p, i) => `<g transform="translate(${i * WIDTH_MM * S} 0)">${p.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')}</g>`).join('')}
  </svg>`;
}

function write(name, content) {
  writeFileSync(resolve(here, name), content);
}

const before = panel({
  ...facts.before,
  title: 'Before: 22.23 mm',
  subtitle: '1 unit = 1 px, so the file imports 25.4 mm wide',
});
const after = panel({
  ...facts.after,
  title: 'After: 44.45 mm',
  subtitle: '192 px = 50.8 mm wide (twice the old size)',
});
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
