// SPDX-License-Identifier: CC0-1.0
// Compact folding umbrella. What makes it one rather than a disc on a stick:
// an eight-gore canopy stretched over eight ribs, each gore sagging between
// the ribs so the rim reads as scallops, rib tips capped, a top ferrule, a
// runner and stretchers on a telescoping shaft, and a straight rubber grip
// with a wrist strap. Folded, the canopy gathers into a slim sleeve held by a
// tie strap. Generic visualization geometry at real size (open canopy about
// 960 mm across, 600 mm tall), millimetres, Z up, grip end on z = 0.
meta({
  name: 'foldable-umbrella',
  license: 'CC0-1.0',
  title: 'Foldable umbrella',
  description: 'Compact folding umbrella standing on its grip: eight-gore canopy with scalloped rim and alternating panel colours, ribs with tip caps, top ferrule, runner and stretchers, telescoping shaft and rubber grip with wrist strap. Open or folded with the canopy gathered in a tie strap. Material controls: canopy fabric, accent panel fabric, frame steel, grip rubber; classicBlack, rainbowCheck and clearDome presets.',
  tags: ['umbrella', 'foldable umbrella', 'compact umbrella', 'rain', 'travel', 'canopy', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'outdoor', 'street'],
  triangleBudget: 3400,
});

const state = param('state', 'open', { choices: ['open', 'folded'], label: 'Umbrella state' });
const canopy = param('canopy', '#24486e', { label: 'Canopy (polyester fabric)' });
const accentPanel = param('accentPanel', '#d9c25a', { label: 'Accent panels (fabric)' });
const frameSteel = param('frameSteel', '#9aa3aa', { label: 'Shaft, ribs and tips (steel)' });
const gripRubber = param('gripRubber', '#1e2022', { label: 'Grip and strap (rubber)' });
presets({
  classicBlack: { canopy: '#1d1f22', accentPanel: '#1d1f22', frameSteel: '#7c858c', gripRubber: '#141516' },
  rainbowCheck: { canopy: '#d2443c', accentPanel: '#f2c94c', frameSteel: '#b8c0c6', gripRubber: '#2a2b2e' },
  clearDome: { canopy: '#cfe3ea', accentPanel: '#a7cbd8', frameSteel: '#c8ced2', gripRubber: '#30343a' },
});

const p = assembly('foldable-umbrella');
const add = (name, shape) => p.part(name, shape);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Grip with finger rings, wrist strap loop, and shaft.
const GRIP = 120;
add('grip', turned([[0, 0], [15, 0], [17, 20], [16, 60], [17, 100], [13, GRIP], [0, GRIP]]).color(gripRubber));
add('grip-cap', cylinder(4, 14, 12).translate(0, 0, GRIP - 2).color(frameSteel));
add('wrist-strap', torus(40, 3.5, 8).rotateX(90).translate(-50, 0, 52).color(gripRubber));
add('strap-anchor', box(10, 10, 14, true).translate(-14, 0, 12).color(frameSteel));

if (state.value === 'open') {
  const TOP = 600;     // ferrule base height
  const SPAN = 480;    // canopy radius in plan
  const DROP = 170;    // rim below the crown
  const RIM = TOP - DROP;
  // Telescoping shaft: three stages, thicker at the bottom.
  add('shaft-1', cylinder(200, 7, 10).translate(0, 0, GRIP).color(frameSteel));
  add('shaft-2', cylinder(160, 5.5, 10).translate(0, 0, GRIP + 200).color(frameSteel));
  add('shaft-3', cylinder(TOP - GRIP - 360, 4.5, 10).translate(0, 0, GRIP + 360).color(frameSteel));
  // Eight gores: each a triangle from the crown to two rib tips, sagging in the middle.
  const N = 8;
  const rib = (i) => {
    const a = (2 * Math.PI * i) / N;
    return [SPAN * Math.cos(a), SPAN * Math.sin(a), RIM];
  };
  for (let i = 0; i < N; i += 1) {
    const a0 = (2 * Math.PI * i) / N;
    const a1 = (2 * Math.PI * (i + 1)) / N;
    // Gore as a lofted fan of thin slabs: radial profile from crown to rim.
    const pts = [];
    const STEPS = 4;
    for (let s = 0; s <= STEPS; s += 1) {
      const t = s / STEPS;
      const r = SPAN * t;
      const z = TOP - DROP * Math.pow(t, 1.6);
      pts.push([r, z]);
    }
    // Build each gore as a wedge of the dome between two ribs, bottom edge scalloped.
    const wedge = [[0, 0]];
    const SEG = 4;
    for (let s = 0; s <= SEG; s += 1) {
      const a = a0 + ((a1 - a0) * s) / SEG;
      const sag = 1 - 0.07 * Math.sin((Math.PI * s) / SEG);
      wedge.push([SPAN * 1.02 * sag * Math.cos(a), SPAN * 1.02 * sag * Math.sin(a)]);
    }
    const domeShell = turned([
      ...pts.map(([r, z]) => [r, z]),
      ...pts.slice().reverse().map(([r, z]) => [Math.max(r - 6, 0), z - 6]),
    ]);
    const gore = domeShell.intersect(extrudePolygon(wedge, TOP + 50));
    add(`gore-${i}`, gore.color(i % 2 === 0 ? canopy : accentPanel));
    // Rib under the gore seam, and its tip cap.
    const [rx, ry] = rib(i);
    add(`rib-${i}`, rod([rx * 0.05, ry * 0.05, TOP - 8], [rx * 0.55, ry * 0.55, TOP - DROP * Math.pow(0.55, 1.6) - 8], 2.5)
      .union(rod([rx * 0.55, ry * 0.55, TOP - DROP * Math.pow(0.55, 1.6) - 8], [rx, ry, RIM - 6], 2.5)).color(frameSteel));
    add(`rib-tip-${i}`, sphere(7).translate(rx * 1.01, ry * 1.01, RIM - 6).color(gripRubber));
    // Stretcher from the runner up to mid-rib.
    add(`stretcher-${i}`, rod([0, 0, TOP - 200], [rx * 0.42, ry * 0.42, TOP - DROP * Math.pow(0.42, 1.6) - 10], 2).color(frameSteel));
  }
  add('runner', cylinder(40, 10, 10).translate(0, 0, TOP - 220).color(gripRubber));
  add('top-notch', cylinder(30, 11, 10).translate(0, 0, TOP - 30).color(frameSteel));
  add('ferrule', turned([[0, TOP - 6], [12, TOP - 6], [5, TOP + 50], [0, TOP + 56]]).color(frameSteel));
} else {
  // Folded: shaft collapsed, canopy gathered into a tapered sleeve above the grip.
  add('shaft', cylinder(40, 7, 10).translate(0, 0, GRIP).color(frameSteel));
  add('gathered-canopy', turned([[0, GRIP + 30], [30, GRIP + 40], [38, GRIP + 120], [34, GRIP + 220], [14, GRIP + 270], [0, GRIP + 275]]).color(canopy));
  for (let i = 0; i < 8; i += 1) {
    const a = (360 * i) / 8;
    add(`fold-${i}`, box(10, 6, 200, true).translate(35, 0, GRIP + 140).rotateZ(a).color(i % 2 === 0 ? canopy : accentPanel));
  }
  add('tie-strap', turned([[37, GRIP + 140], [42, GRIP + 140], [42, GRIP + 165], [37, GRIP + 165]]).color(accentPanel));
  add('tie-snap', cylinder(6, 7, 10).rotateY(-90).translate(-42, 0, GRIP + 152).color(frameSteel));
  add('ferrule', turned([[0, GRIP + 270], [8, GRIP + 270], [3, GRIP + 310], [0, GRIP + 314]]).color(frameSteel));
}

return p.model();
