// SPDX-License-Identifier: CC0-1.0
// CCS Combo 2 connector: the European DC fast-charging plug. What makes it a
// CCS2: a Type 2 head on top whose round face is cut flat across the top (the
// flat carries the locking notch), with seven contacts (two small signal pins
// over a ring of five power pins), a separate lower shroud with the two big DC
// sockets, and no hook latch: the car locks the plug, so the handle is a closed
// loop grip with a release button under the thumb.
// Generic visualization geometry at about real size (nose 76 mm wide, 136 mm
// tall, plug about 280 mm long), millimetres, Z up, face along -Y, lowest
// point on z = 0.

meta({
  name: "ccs-combo-2-connector",
  license: 'CC0-1.0',
  title: "CCS Combo 2 connector",
  description: "CCS Combo 2 DC fast-charging plug: Type 2 head with a flat-topped face, locking notch and seven recessed contacts above a separate DC shroud with two large pin sockets, closed loop handle with release button and overmoulded grip, heavy strain relief and DC cable. Material controls: housing, grip overmould, release button and contacts, cable. fleetReady and nightService presets.",
  tags: ['CCS2', 'CCS Combo 2', 'Type 2', 'Mennekes', 'Combined Charging System', 'DC fast charging', 'EV plug', 'charging connector', 'EV charging', 'electric vehicle', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#4a5157', { label: 'Nose, DC shroud and handle shell (engineering polymer)' });
const gripOvermold = param('gripOvermold', '#16191b', { label: 'Grip overmould and face inserts (soft-touch elastomer)' });
const button = param('button', '#e2632a', { label: 'Release button' });
const contacts = param('contacts', '#c9a14a', { label: 'Contact pins (plated brass)' });
const cable = param('cable', '#121517', { label: 'DC cable jacket and strain relief' });

presets({
  fleetReady: { housing: '#263a36', gripOvermold: '#141b19', button: '#e0b31f', contacts: '#c9a14a', cable: '#1a2522' },
  nightService: { housing: '#1a2226', gripOvermold: '#0f1416', button: '#5f6b70', contacts: '#a88a45', cable: '#111719' },
});

const p = assembly("ccs-combo-2-connector");
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Turned profile [[radius, y], ...] about the Y axis.
const turnedY = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, y] of pts.slice(1)) pb = pb.lineTo(r, y);
  return pb.close().revolve().rotateX(-90);
};
// Side profile [[y, z], ...] extruded symmetrically across X.
const side = (pts, t) => extrudePolygon(pts, t).rotateY(90).rotateX(90).translate(-t / 2, 0, 0);
// Front outline [[x, z], ...] extruded from y = y0 back by depth.
const front = (pts, y0, depth) => extrudePolygon(pts, depth).rotateX(90).translate(0, y0 + depth, 0);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Circle of radius r clipped flat at z = flat (the Type 2 face outline).
const flatTopped = (r, flat, n = 20) => {
  const a0 = Math.asin(flat / r);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - a0 + ((Math.PI + 2 * a0) * i) / n;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
};
const stadium = (w, h, zc, n = 6) => {
  const r = h / 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push([w / 2 - r + r * Math.cos(a), zc + r * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    pts.push([-w / 2 + r + r * Math.cos(a), zc + r * Math.sin(a)]);
  }
  return pts;
};

// Type 2 head: flat-topped shell, recessed face insert, locking notch in the flat.
let head = front(flatTopped(38, 26), 0, 66).subtract(front(flatTopped(30, 20), -2, 14));
head = head.subtract(box(12, 20, 10, true).translate(0, 6, 26));
add('ac-nose', head.color(housing));
add('ac-face-insert', front(flatTopped(30, 20), 12, 2).color(gripOvermold));
const acPins = [
  [-9, 13, 2.2], [9, 13, 2.2], // proximity and control pilot
  [-19, 1, 3.6], [0, -1, 3.6], [19, 1, 3.6], [-11, -17, 3.6], [11, -17, 3.6],
];
for (const [k, [x, z, r]] of acPins.entries()) add(`ac-contact-${k}`, rod([x, 12, z], [x, 3, z], r, 8).color(contacts));

// Neck and DC shroud with two sockets.
add('neck', front([[-18, -36], [18, -36], [22, -50], [-22, -50]], 6, 60).color(housing));
const DZ = -70;
let dc = front(stadium(80, 44, DZ), 0, 66);
for (const s of [-1, 1]) dc = dc.subtract(rod([s * 19, -2, DZ], [s * 19, 14, DZ], 12, 10));
add('dc-shroud', dc.color(housing));
for (const s of [-1, 1]) {
  add(`dc-socket-${s}`, rod([s * 19, 14, DZ], [s * 19, 12, DZ], 12, 10).color(gripOvermold));
  add(`dc-pin-${s}`, rod([s * 19, 13, DZ], [s * 19, 4, DZ], 5.8, 8).color(contacts));
}

// Closed loop handle: body block behind the nose, a grip bar sweeping back and
// down, joined to the cable boot at the bottom; the hand goes through the loop.
const loop = side([
  [60, 30], [130, 36], [214, 6], [254, -60], [256, -128], [232, -150], [186, -150],
  [150, -96], [62, -94],
], 64).subtract(side([[132, 6], [200, -12], [228, -62], [222, -112], [196, -118], [160, -78], [124, -40]], 80));
add('handle', loop.color(housing));
add('grip-overmold', side([[150, 30], [212, 6], [250, -58], [252, -118], [230, -118], [226, -62], [198, -14], [150, 2]], 68).color(gripOvermold));
add('release-button', side([[96, 34], [104, 46], [128, 44], [130, 34]], 26).color(button));

// Cable boot on the bottom of the loop, then the heavy DC cable.
add('strain-relief', turnedY([[22, 0], [18, 34], [14, 70], [0, 70], [0, 0]])
  .rotateX(-80).translate(0, 214, -146).color(cable));
add('cable', rod([0, 226, -210], [0, 246, -300], 13, 8).color(cable));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
