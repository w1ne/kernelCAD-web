// SPDX-License-Identifier: CC0-1.0
// Fountain pen: an uncapped fountain pen lying on the desk with its cap beside
// it. What makes it one is the nib: a pointed two-tone metal nib with a
// centre slit and breather hole, curved over a dark ribbed feed, held in a
// tapered grip section that flares at the front. Behind it a turned resin
// barrel with a metal trim ring and a rounded end; the cap is a hollow tube
// with a metal lip band, a spring clip ending in a ball and a domed finial.
// Generic visualization geometry at about real size (pen about 140 mm long,
// 13.6 mm barrel), millimetres, Z up, nib toward +X, lowest point on z = 0.
meta({
  name: 'fountain-pen',
  license: 'CC0-1.0',
  title: 'Fountain pen',
  description: "Uncapped fountain pen lying beside its cap: pointed two-tone nib with slit and breather hole over a ribbed feed, flared grip section, turned resin barrel with trim ring and rounded end, hollow cap with lip band, ball-ended spring clip and domed finial. Material controls: barrel resin, trim metal, nib gold, section resin; professional, classroom and tortoiseshell presets.",
  tags: ['fountain pen', 'pen', 'nib', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 2400,
});

const resin = param('resin', '#1f4f7a', { label: 'Barrel resin' });
const stainlessSteel = param('stainlessSteel', '#c3cacc', { label: 'Clip and trim metal' });
const nibGold = param('nibGold', '#d6ad55', { label: 'Nib gold' });
const sectionResin = param('sectionResin', '#1b1d20', { label: 'Section and feed resin' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { resin: '#1f4f7a', stainlessSteel: '#c3cacc', nibGold: '#d6ad55', sectionResin: '#1b1d20' },
  classroom: { resin: '#b8483a', stainlessSteel: '#c9cfd1', nibGold: '#c3c9cc', sectionResin: '#2a2c30' },
  tortoiseshell: { resin: '#7a4a24', stainlessSteel: '#d8b25e', nibGold: '#e0bb63', sectionResin: '#2b1d14' },
});

const office = assembly('fountain-pen');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

// Turned part: an (r, z) profile revolved about Z, then laid along +X at the
// pen's axis height and lateral offset.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const lay = (shape, x, y, axisZ) => shape.rotateY(90).translate(x, y, axisZ);

// Pen: axis 6.8 mm off the desk (barrel radius), back end at x = 0.
const PEN_Z = 6.8;
add('barrel', lay(turned([[0, 0], [4.6, 0], [6.2, 2.5], [6.8, 8], [6.8, 86], [0, 86]]), 0, 0, PEN_Z).color(resin));
add('barrel-trim-ring', lay(turned([[0, 85], [6.95, 85], [6.95, 89], [0, 89]]), 0, 0, PEN_Z).color(stainlessSteel));
add('end-ring', lay(turned([[0, 5], [6.7, 5], [6.7, 7], [0, 7]]), 0, 0, PEN_Z).color(stainlessSteel));
// Grip section: tapers toward the nib and flares just behind it.
add('section', lay(turned([[0, 89], [6.1, 89], [5.4, 100], [4.6, 110], [5.2, 113], [4.6, 115], [0, 115]]), 0, 0, PEN_Z).color(sectionResin));
// Feed under the nib: a dark wedge with comb ribs showing at the sides.
add('feed', extrudePolygon([[112, PEN_Z - 2], [132, PEN_Z], [132, PEN_Z + 0.8], [112, PEN_Z + 3.8]], 4.5).rotateX(90).translate(0, 2.25, 0).color(sectionResin));
for (let i = 0; i < 4; i += 1) add(`feed-rib-${i + 1}`, box(1.2, 6, 3.4, true).translate(116 + i * 3, 0, PEN_Z - 0.4).color(sectionResin));

// Nib: two halves either side of the slit, tipped slightly so the ends curve
// down over the feed, pitched down toward the point.
const NIB_PITCH = 8;
const nibHalf = (s) => {
  const pts = [[0, 0.15], [0, 5], [8, 4.8], [17, 2.6], [25, 0.6], [27, 0.15]].map(([x, y]) => [x, s * y]);
  return extrudePolygon(pts, 0.5).rotateX(-s * 14).rotateY(NIB_PITCH).translate(113, 0, PEN_Z + 4.3);
};
add('nib-left', nibHalf(1).color(nibGold));
add('nib-right', nibHalf(-1).color(nibGold));
// Two-tone plating band and breather hole.
add('nib-plating', extrudePolygon([[0, -4.6], [5, -4.4], [5, 4.4], [0, 4.6]], 0.6).rotateY(NIB_PITCH).translate(115, 0, PEN_Z + 4.15).color(stainlessSteel));
add('breather-hole', cylinder(1, 1.1, 10).rotateY(NIB_PITCH).translate(123, 0, PEN_Z + 2.9).color(sectionResin));

// Cap lying beside the pen, open end toward the nib: it runs from the finial
// at x = 42 to the lip at x = 104. Turned profiles are laid along -X here.
const CAP_Y = -24;
const CAP_Z = 8.1;
const capLay = (shape, x) => shape.rotateY(-90).translate(x, CAP_Y, CAP_Z);
add('cap', capLay(turned([[6.9, 0], [7.8, 0], [7.8, 54], [7.2, 59], [5.2, 62], [0, 62], [0, 50], [6.9, 50]]), 104).color(resin));
add('cap-lip-band', capLay(turned([[7, 0], [8.1, 0], [8.1, 6], [7, 6]]), 104).color(stainlessSteel));
add('cap-finial', capLay(turned([[0, 0], [5.3, 0], [4.6, 1.6], [2.6, 2.6], [0, 3]]), 42).color(stainlessSteel));
// Spring clip along the top of the cap, rooted at the finial end, ending in a ball.
const CAP_TOP = CAP_Z + 7.8;
add('clip-root', box(6, 3, 2.8, true).translate(46, CAP_Y, CAP_TOP + 0.9).color(stainlessSteel));
add('clip-bar', box(46, 3, 1.4, true).translate(66, CAP_Y, CAP_TOP + 1.6).color(stainlessSteel));
add('clip-ball', sphere(2.2).translate(89, CAP_Y, CAP_TOP + 1.2).color(stainlessSteel));

// Rest the lowest point exactly on the desk.
let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) office.part(name, shape.translate(0, 0, -lowest).scale(k));

return office.model();
