// SPDX-License-Identifier: CC0-1.0
// Masking leg: a tall, narrow black velour curtain hung at the side of the
// stage to hide the wings, tied off to its pipe batten.
// What makes it a leg rather than a curtain: a single narrow panel with sewn-in
// fullness (box pleats stitched into the jute webbing header), brass grommets
// along the header with a cotton tie line knotted round the pipe at each one,
// a sewn chain pocket at the hem with the end of the weight chain showing, and
// side hems turned back as a darker binding. The fullness choice switches
// between flat (0 %), 50 % and 100 % sewn-in pleating.
// Generic visualization geometry at about real size (1.2 m wide, 2.6 m to the
// batten), millimetres, Z up, curtain face toward -Y, hem standing on z = 0.

meta({
  name: "masking-leg",
  license: 'CC0-1.0',
  title: "Masking leg",
  description: "Theatre masking leg at about real size: a 1.2 m by 2.5 m velour panel with sewn-in box pleats, jute webbing header with brass grommets, cotton tie lines knotted round a pipe batten, turned-back side hems and a chain pocket at the hem with the weight chain showing. Material controls: velour, webbing and ties, grommets and chain, batten. Fullness choice: flat, 50 % or 100 %. houseShow, touring and greyMasking presets.",
  tags: ['masking leg', 'theatre leg', 'masking', 'soft goods', 'velour curtain', 'drape', 'wings', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fullness = param('fullness', 'fifty', { choices: ['flat', 'fifty', 'hundred'], label: 'Sewn-in fullness' });

const velour = param('velour', '#1d1b20', { label: 'Velour' });
const webbing = param('webbing', '#c9b58a', { label: 'Webbing and tie lines' });
const metal = param('metal', '#c9a24a', { label: 'Grommets and chain' });
const batten = param('batten', '#34383c', { label: 'Pipe batten' });

presets({
  houseShow: { velour: '#1d1b20', webbing: '#c9b58a', metal: '#c9a24a', batten: '#34383c' },
  touring: { velour: '#232a3a', webbing: '#2a2a2a', metal: '#aeb6ba', batten: '#9aa2a7' },
  greyMasking: { velour: '#4c4f55', webbing: '#e1dccb', metal: '#b8bec2', batten: '#2a2d30' },
});

const BINDING = '#0f0e11';

const p = assembly("masking-leg");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const W = 1200;
const H = 2500; // hem to header top
const ZB = H + 130; // batten centre
const HDR = 90; // header webbing height
const POCKET = 110; // hem chain pocket height
const X0 = -W / 2 + 30;
const X1 = W / 2 - 30;

// Pleated cloth: a zigzag outline (and its offset) extruded upward.
const depth = fullness.value === 'hundred' ? 42 : fullness.value === 'fifty' ? 26 : 0;
const n = fullness.value === 'hundred' ? 30 : 20;
const step = (X1 - X0) / n;
const zig = (off: number) => {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([X0 + i * step, (i % 2 === 0 ? -depth : depth) + off]);
  return pts;
};
const sheet = (a: number, b: number) => (depth === 0 ? [[X0, a], [X1, a], [X1, b], [X0, b]] : [...zig(a), ...zig(b).reverse()]);

add("cloth", extrudePolygon(sheet(0, 8), H - HDR - POCKET).translate(0, 0, POCKET).color(velour));
add("chain-pocket", extrudePolygon(sheet(-3, 11), POCKET).color(velour));
add("pocket-stitch", extrudePolygon(sheet(-4, 12), 10).translate(0, 0, POCKET - 14).color(BINDING));
add("header", extrudePolygon(sheet(-4, 12), HDR).translate(0, 0, H - HDR).color(webbing));

// Turned-back side hems.
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'left' : 'right';
  add(`side-hem-${tag}`, box(46, 2 * depth + 22, H - HDR - 20, true).translate(sx * (W / 2 - 30), 4, (H - HDR + 20) / 2).color(BINDING));
}

// Grommets in the header (on the front-most pleats) with tie lines to the pipe.
const yFront = -depth - 5;
for (let i = 0, k = 0; i <= n; i += depth === 0 ? 4 : 2 * Math.max(1, Math.round(n / 10)), k++) {
  const x = Math.min(X0 + i * step, X1 - 20);
  add(`grommet-${k}`, alongY(6, 13).translate(x, yFront, H - HDR / 2).color(metal));
  add(`tie-${k}`, cylinder(ZB - H + HDR / 2 - 20, 4, 6).translate(x, 2, H - HDR / 2).color(webbing));
  add(`knot-${k}`, box(28, 58, 34, true).translate(x, 0, ZB + 18).color(webbing));
}

// Batten pipe with capped ends.
add("batten", alongX(W + 500, 24).translate(-W / 2 - 250, 0, ZB).color(batten));
for (const sx of [-1, 1]) add(`batten-cap-${sx < 0 ? 'l' : 'r'}`, alongX(12, 27).translate(sx < 0 ? -W / 2 - 262 : W / 2 + 250, 0, ZB).color(metal));

// Weight chain end peeking out of the hem pocket.
for (let k = 0; k < 4; k++) {
  const link = torus(16, 5, 8).scale([1.7, 1, 1]);
  add(`chain-link-${k}`, (k % 2 ? link : link.rotateX(90)).translate(X1 + 22 + k * 40, 0, 40).color(metal));
}

return p.model();
