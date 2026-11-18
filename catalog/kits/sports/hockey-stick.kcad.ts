// SPDX-License-Identifier: CC0-1.0
// Field hockey stick: what makes it one is the J-shaped head — the shaft runs
// down into a flat-faced hook whose toe curls back up — plus an oval composite
// shaft with a slight low bow, maker graphics on the shaft, a towelling grip
// spiral-wrapped over the top third and an end cap. Stood upright on its toe.
// Generic visualization geometry at about real size (36.5 inch, about 930 mm
// long, head about 100 mm wide), millimetres, Z up, flat playing face toward
// -Y, lowest point on z = 0.
meta({
  name: 'hockey-stick',
  license: 'CC0-1.0',
  title: 'Field hockey stick',
  description: "Field hockey stick at 36.5 inch: oval composite shaft with a low bow, flat-faced J-hook head with a curled toe and protective edge tape, maker graphics, spiral-wrapped towelling grip and end cap. Material controls: composite shaft, blade tape, grip tape, graphic accent; clubColors, neonGraphics and weathered presets.",
  tags: ['hockey stick', 'field hockey', 'stick', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const compositeShaft = param('compositeShaft', '#22262b', { label: 'Composite shaft' });
const bladeTape = param('bladeTape', '#e7e0d0', { label: 'Blade and edge tape' });
const gripTape = param('gripTape', '#30363a', { label: 'Grip tape' });
const graphicAccent = param('graphicAccent', '#e0482f', { label: 'Graphic accent' });
presets({
  clubColors: { compositeShaft: '#344c68', bladeTape: '#d54c3e' },
  neonGraphics: { compositeShaft: '#16191c', graphicAccent: '#b8e23a', gripTape: '#e9eae4' },
  weathered: { compositeShaft: '#4a4a46', bladeTape: '#b8ad97', gripTape: '#57544d', graphicAccent: '#9a5a48' },
});

const p = assembly('hockey-stick');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

// Oval section in XY (wide across X, the plane of the hook).
const oval = (a, b, n = 14) => Array.from({ length: n }, (_, i) => [a * Math.cos((2 * Math.PI * i) / n), b * Math.sin((2 * Math.PI * i) / n)]);
// Prism of an oval section between two heights along Z, centred at x.
const ovalBar = (a, b, z0, z1, x = 0) => extrudePolygon(oval(a, b), z1 - z0).translate(x, 0, z0);
// Profile [[x, z], ...] in the hook plane, extruded across Y (face toward -Y).
const sideXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const LEN = 930;
const HEAD_TOP = 150;

// Head: the shaft tapers into a J. Centreline arc from straight down, round the
// bottom and up into the toe; a thick band around that arc forms the head.
const R = 38;            // hook centreline radius
const CX = R;            // arc centre x (shaft centre at x = 0)
const CZ = 70;           // arc centre z
const band = (r0, r1, a0, a1, steps, lead) => {
  const outer = [];
  const inner = [];
  for (let k = 0; k <= steps; k++) {
    const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
    outer.push([CX + r1 * Math.cos(a), CZ + r1 * Math.sin(a)]);
    inner.push([CX + r0 * Math.cos(a), CZ + r0 * Math.sin(a)]);
  }
  return [...lead, ...outer, ...inner.reverse()];
};
// From the heel (180 deg, on the shaft line) down round the bottom and up to the toe (about 80 deg).
const headPts = band(R - 22, R + 22, 180, 440, 16, [[-22, HEAD_TOP]]).concat([[22, HEAD_TOP]]);
add('head', sideXZ(headPts, 26).color(compositeShaft));
// Protective edge tape round the bottom of the hook, where the ball is struck.
add('edge-tape', sideXZ(band(R + 20, R + 25, 200, 340, 10, []), 28).color(bladeTape));
// Maker stripe along the flat playing face (-Y side) of the hook.
add('face-stripe', sideXZ(band(R - 3, R + 3, 190, 420, 14, []), 2).translate(0, -13.5, 0).color(graphicAccent));

// Shaft: oval, with a slight low bow just above the head (a few mm forward).
add('shaft-lower', ovalBar(20, 15, HEAD_TOP - 5, 360).color(compositeShaft));
add('shaft-bow', ovalBar(19, 15, 355, 600, 2).color(compositeShaft));
add('shaft-upper', ovalBar(18, 15, 595, LEN - 4).color(compositeShaft));

// Maker graphics: a chevron band and two stripes on the shaft.
add('graphic-band', ovalBar(21, 16, 250, 300).color(graphicAccent));
for (const [i, z] of [420, 470].entries()) add(`graphic-stripe-${i + 1}`, ovalBar(19.6, 15.6, z, z + 12, 2).color(graphicAccent));
add('graphic-panel', box(4, 30, 120, true).translate(0, -15, 540).color(bladeTape));

// Towelling grip spiral-wrapped over the top third, with an end cap.
add('grip-sleeve', ovalBar(20, 17, 640, LEN - 6).color(gripTape));
for (let i = 0; i < 9; i++) {
  const z = 655 + i * 30;
  add(`grip-wrap-${i + 1}`, ovalBar(21, 18, -4, 4).rotateY(8).translate(0, 0, z + 4).color(gripTape));
}
add('grip-finish-tape', ovalBar(21, 18, 630, 645).color(graphicAccent));
add('end-cap', ovalBar(21, 18, LEN - 8, LEN + 2).color(compositeShaft));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
