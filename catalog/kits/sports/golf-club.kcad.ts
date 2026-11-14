// SPDX-License-Identifier: CC0-1.0
// Golf driver: what makes it one is the big hollow pear-shaped head — a flat
// scored face, a painted crown that sweeps down to a rounded back, a titanium
// sole — joined at the heel through a hosel and ferrule to a long tapering
// graphite shaft at a 58 degree lie, ending in a thick rubber grip with an end
// cap. Generic visualization geometry at about real size (45.5 inch, 460 cc
// head), millimetres, Z up, sole on z = 0, head turned to show its crown.
meta({
  name: 'golf-club',
  license: 'CC0-1.0',
  title: 'Golf club',
  description: "Golf driver at about real size: 45.5 inch club with a 460 cc pear-shaped head, scored titanium face, painted crown with alignment mark, sole plate, hosel and ferrule, tapering graphite shaft at a 58 degree lie with a shaft band, and a rubber grip with an end cap. Material controls: crown paint, club-head titanium, graphite shaft, grip rubber, accent; clubColors, tourWhite and weathered presets.",
  tags: ['golf club', 'golf driver', 'driver', 'golf', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const crownPaint = param('crownPaint', '#1e2329', { label: 'Crown paint' });
const stainlessSteel = param('stainlessSteel', '#b9c2c6', { label: 'Club-head titanium' });
const graphiteShaft = param('graphiteShaft', '#3c444a', { label: 'Graphite shaft' });
const gripRubber = param('gripRubber', '#242d32', { label: 'Grip rubber' });
const accent = param('accent', '#d8452f', { label: 'Ferrule, band and logo accent' });
presets({
  clubColors: { crownPaint: '#244a7a', accent: '#f0c23a' },
  tourWhite: { crownPaint: '#ecebe6', graphiteShaft: '#1c1f22', accent: '#2f8fd8', gripRubber: '#3d4246' },
  weathered: { crownPaint: '#3b3d3e', stainlessSteel: '#8f9497', graphiteShaft: '#5b5f60', gripRubber: '#4b4a45', accent: '#8a5a44' },
});

const p = assembly('golf-club');
// Built with the face toward -Y and the shaft leaning to -X, then turned
// about Z so the rounded back of the head faces the default 3/4 view.
const TURN = 120;
const add = (name, shape) => p.part(name, shape.rotateZ(TURN).scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Profile [[y, z], ...] in the front-to-back plane, extruded across X.
const sideYZ = (pts, t, x0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);

// Head plan: a nearly straight face along X at y = 0, a rounded back to y = 112,
// the toe (+X) fuller than the heel.
const HEAD_X = 120;
const headPlan = (inset = 0) => {
  const pts = [];
  for (let i = 0; i <= 6; i++) pts.push([inset + ((HEAD_X - 2 * inset) * i) / 6, inset - 4 * Math.sin((Math.PI * i) / 6)]);
  for (let i = 1; i < 16; i++) {
    const a = (Math.PI * i) / 16;
    const cx = HEAD_X / 2 + 6;
    pts.push([cx + (HEAD_X / 2 - 6 - inset) * Math.cos(a), inset + (112 - 2 * inset) * Math.sin(a) * (0.86 + 0.14 * Math.cos(a))]);
  }
  return pts;
};
const H = 62; // face height
// Crown side profile: tall at the face, sweeping down to the rounded back.
const crownSide = [[-20, 0], [-20, H], [0, H], [20, H + 1], [45, H - 4], [75, H - 16], [100, H - 32], [125, 10], [125, 0]];
const head = extrudePolygon(headPlan(), H + 10).intersect(sideYZ(crownSide, 200, HEAD_X / 2));
const SPLIT = 24;
add('sole', head.intersect(box(400, 400, SPLIT, true).translate(HEAD_X / 2, 50, SPLIT / 2)).color(stainlessSteel));
add('crown', head.intersect(box(400, 400, 100, true).translate(HEAD_X / 2, 50, SPLIT + 50)).subtract(box(400, 14, 100, true).translate(HEAD_X / 2, -3, 50)).color(crownPaint));
// Face insert and its score lines.
add('face', extrudePolygon(headPlan().filter(([, y]) => y < 4).concat([[HEAD_X - 4, 4], [4, 4]]), H - 6).intersect(sideYZ(crownSide, 200, HEAD_X / 2)).translate(0, 0, 2).color(stainlessSteel));
for (let i = 0; i < 6; i++) add(`face-score-${i + 1}`, box(62, 1.5, 1.4, true).translate(HEAD_X / 2 + 4, -4.6, 16 + i * 6).color(crownPaint));
// Alignment mark and a logo chevron on the crown.
add('alignment-mark', box(3, 18, 3, true).translate(HEAD_X / 2 + 2, 22, H - 4).color(accent));
add('crown-logo', extrudePolygon([[-14, 0], [0, 10], [14, 0], [14, 5], [0, 15], [-14, 5]], 3).translate(HEAD_X / 2 + 4, 66, H - 24).rotateX(-28).translate(0, 30, 28).color(accent));
// Sole weight port.
add('sole-weight', cylinder(4, 9, 12).translate(HEAD_X / 2 + 10, 80, 0).color(accent));

// Shaft line: from the heel hosel up and away at the 58 degree lie.
const LIE = 58;
const hosel = [10, 20, 34];
const lean = (shape) => shape.rotateY(-(90 - LIE)).translate(...hosel);
add('hosel', lean(turned([[0, -30], [13, -30], [11, 30], [7.5, 40], [0, 40]])).color(stainlessSteel));
add('ferrule', lean(turned([[0, 36], [7.6, 36], [6.8, 56], [0, 56]])).color(accent));
// Tapered graphite shaft, 8.5 mm at the tip to 15.5 mm under the grip.
const SHAFT_LEN = 1100;
add('shaft', lean(turned([[0, 50], [4.3, 50], [4.8, 300], [7.4, 760], [7.8, SHAFT_LEN - 10], [0, SHAFT_LEN - 10]])).color(graphiteShaft));
add('shaft-band', lean(turned([[0, 520], [6.6, 520], [6.7, 600], [0, 600]])).color(accent));
// Grip: tapered rubber sleeve with a cap and a reminder rib.
add('grip', lean(turned([[0, SHAFT_LEN - 270], [10, SHAFT_LEN - 270], [11, SHAFT_LEN - 200], [13.2, SHAFT_LEN - 10], [12.5, SHAFT_LEN], [0, SHAFT_LEN]])).color(gripRubber));
add('grip-collar', lean(turned([[0, SHAFT_LEN - 272], [10.6, SHAFT_LEN - 272], [10.6, SHAFT_LEN - 262], [0, SHAFT_LEN - 262]])).color(accent));
add('grip-cap', lean(turned([[0, SHAFT_LEN], [12.4, SHAFT_LEN], [11, SHAFT_LEN + 6], [0, SHAFT_LEN + 7]])).color(accent));

return p.model();
