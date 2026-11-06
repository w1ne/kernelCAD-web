// SPDX-License-Identifier: CC0-1.0
// CCS Combo 1 connector: the North American DC fast-charging plug. What makes
// it a CCS1: the round J1772 head on top (two AC pins, ground, proximity and
// pilot) with a separate lower shroud underneath carrying the two big DC
// sockets, so the nose reads as a "snowman" outline from the front; a tall
// chunky grip behind both, the long J1772-style latch lever over the top, and
// a thick DC cable leaving the bottom of the grip.
// Generic visualization geometry at about real size (nose 76 mm wide, 130 mm
// tall, plug about 280 mm long), millimetres, Z up, face along -Y, lowest
// point on z = 0.

meta({
  name: "ccs-combo-1-connector",
  license: 'CC0-1.0',
  title: "CCS Combo 1 connector",
  description: "CCS Combo 1 DC fast-charging plug: round J1772 head with five recessed contacts above a separate DC shroud with two large pin sockets, tall pistol grip with overmoulded flanks, long latch lever with front hook and thumb button, heavy strain relief and DC cable. Material controls: housing, grip overmould, latch and contacts, cable. fleetReady and nightService presets.",
  tags: ['CCS1', 'CCS Combo 1', 'Combined Charging System', 'DC fast charging', 'EV plug', 'charging connector', 'EV charging', 'electric vehicle', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#2b3034', { label: 'Nose, DC shroud and body shell (engineering polymer)' });
const gripOvermold = param('gripOvermold', '#596168', { label: 'Grip overmould and face inserts (soft-touch elastomer)' });
const latch = param('latch', '#d8dcdc', { label: 'Latch lever and thumb button' });
const contacts = param('contacts', '#c9a14a', { label: 'Contact pins (plated brass)' });
const cable = param('cable', '#121517', { label: 'DC cable jacket and strain relief' });

presets({
  fleetReady: { housing: '#263a36', gripOvermold: '#40564f', latch: '#e0b31f', contacts: '#c9a14a', cable: '#1a2522' },
  nightService: { housing: '#1a2226', gripOvermold: '#2c363b', latch: '#6f7b80', contacts: '#a88a45', cable: '#111719' },
});

const p = assembly("ccs-combo-1-connector");
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
// Stadium outline (rounded slot) centred on (0, zc).
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

// AC head (J1772 layout): face at y = 0 on the head axis z = 0.
add('ac-nose', turnedY([[26, 0], [35, 0], [37, 8], [37, 66], [26, 66]]).color(housing));
add('ac-face-insert', turnedY([[0, 14], [26, 14], [26, 66], [0, 66]]).color(gripOvermold));
for (const [k, [x, z, r]] of [[-11, 9, 4], [11, 9, 4], [0, -13, 4.4], [-15, -6, 2], [15, -6, 2]].entries()) {
  add(`ac-contact-${k}`, rod([x, 14, z], [x, 3, z], r, 8).color(contacts));
}
// Neck joining the two shrouds, then the DC shroud with two sockets.
add('neck', front([[-16, -34], [16, -34], [20, -46], [-20, -46]], 6, 60).color(housing));
const DZ = -66;
let dc = front(stadium(78, 42, DZ), 0, 66);
for (const s of [-1, 1]) dc = dc.subtract(rod([s * 18, -2, DZ], [s * 18, 14, DZ], 11.5, 10));
add('dc-shroud', dc.color(housing));
for (const s of [-1, 1]) {
  add(`dc-socket-${s}`, rod([s * 18, 14, DZ], [s * 18, 12, DZ], 11.5, 10).color(gripOvermold));
  add(`dc-pin-${s}`, rod([s * 18, 13, DZ], [s * 18, 4, DZ], 5.5, 8).color(contacts));
}

// Body and tall pistol grip behind both shrouds.
add('body', side([
  [60, 34], [124, 42], [166, 32], [226, -70], [240, -132], [228, -150], [196, -146],
  [176, -112], [124, -84], [62, -86],
], 62).color(housing));
for (const s of [-1, 1]) {
  add(`grip-panel-${s}`, side([
    [156, 20], [212, -64], [224, -128], [202, -136], [182, -104], [134, -28],
  ], 6).translate(s * 32, 0, 0).color(gripOvermold));
}

// Latch lever over the AC head, guard and thumb button behind it.
add('latch-lever', side([
  [-12, 30], [-12, 46], [108, 52], [120, 46], [108, 40], [2, 40], [2, 30],
], 16).color(latch));
add('thumb-button', side([[116, 40], [128, 56], [150, 50], [150, 38]], 22).color(latch));
add('latch-guard', side([[90, 38], [100, 56], [156, 48], [156, 36]], 32).color(housing));

// Heavy strain relief and DC cable leaving the grip.
add('strain-relief', turnedY([[20, 0], [16, 34], [13, 70], [0, 70], [0, 0]])
  .rotateX(-62).translate(0, 222, -140).color(cable));
add('cable', rod([0, 250, -196], [0, 272, -290], 13, 8).color(cable));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
