// SPDX-License-Identifier: CC0-1.0
// NACS connector: the North American Charging Standard (SAE J3400) plug used
// for both AC and DC charging. What makes it a NACS plug: it is small and slim,
// one smooth tapered wand rather than a head bolted to a pistol grip; the
// rounded oval face carries just five contacts (two large power pins and three
// small ground and signal pins); the handle tapers back and bends gently down
// into the cable; and a single release button sits on top just behind the
// head, under the thumb.
// Generic visualization geometry at about real size (head 48 x 60 mm, plug
// about 260 mm long), millimetres, Z up, face along -Y, lowest point on z = 0.

meta({
  name: "nacs-connector",
  license: 'CC0-1.0',
  title: "NACS connector",
  description: "NACS (SAE J3400) charging plug: slim lofted wand that tapers from an oval head into a gently down-curved handle, recessed oval face with two large power pins and three small ground and signal pins, release button on top behind the head, strain relief and cable. Material controls: shell, face insert, button and contacts, cable. fleetReady and nightService presets.",
  tags: ['NACS', 'SAE J3400', 'North American Charging Standard', 'EV plug', 'charging connector', 'DC fast charging', 'EV charging', 'electric vehicle', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#c9cdd0', { label: 'Head and handle shell (painted polymer)' });
const faceInsert = param('faceInsert', '#1b1f22', { label: 'Face insert and handle underside' });
const button = param('button', '#3aa0d8', { label: 'Release button (lit)' });
const contacts = param('contacts', '#c9a14a', { label: 'Contact pins (plated brass)' });
const cable = param('cable', '#1d2124', { label: 'Cable jacket and strain relief' });

presets({
  fleetReady: { shell: '#263a36', faceInsert: '#141b19', button: '#e0b31f', contacts: '#c9a14a', cable: '#1a2522' },
  nightService: { shell: '#222d32', faceInsert: '#0f1416', button: '#5f6b70', contacts: '#a88a45', cable: '#111719' },
});

const p = assembly("nacs-connector");
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Rounded-rectangle (superellipse) section w x h centred on (0, zc), as [x, z].
const oval = (w, h, zc, n = 24) => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [(w / 2) * Math.sign(c) * Math.abs(c) ** 0.7, zc + (h / 2) * Math.sign(s) * Math.abs(s) ** 0.7];
});
// XZ sections lofted along Y between stations [[y, pts], ...].
const loftY = (stations) => {
  const profiles = stations.map(([, pts]) => {
    let o = path().moveTo(pts[0][0], -pts[0][1]);
    for (const [x, z] of pts.slice(1)) o = o.lineTo(x, -z);
    return o.close();
  });
  return profiles[0].loft(profiles.slice(1), {
    planes: stations.map(([y]) => ({ plane: 'XY', origin: [0, 0, y] })),
    ruled: true,
  }).rotateX(-90);
};
// Front outline [[x, z], ...] extruded from y = y0 back by depth.
const front = (pts, y0, depth) => extrudePolygon(pts, depth).rotateX(90).translate(0, y0 + depth, 0);
const turnedY = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, y] of pts.slice(1)) pb = pb.lineTo(r, y);
  return pb.close().revolve().rotateX(-90);
};
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// One lofted wand: oval head swelling behind the face, then tapering and
// bending down into the handle. The face is recessed 12 mm.
const wand = loftY([
  [0, oval(40, 50, 0)],
  [14, oval(46, 58, 1)],
  [70, oval(48, 60, 1)],
  [120, oval(40, 50, -14)],
  [180, oval(34, 42, -42)],
  [236, oval(30, 36, -66)],
]).subtract(front(oval(32, 42, 0), -2, 14));
add('shell', wand.color(shell));
add('face-insert', front(oval(32, 42, 0), 12, 2).color(faceInsert));
// Dark underside strip along the handle where the fingers wrap.
add('grip-strip', loftY([
  [96, oval(30, 12, -31)],
  [180, oval(28, 12, -57)],
  [230, oval(24, 10, -79)],
]).color(faceInsert));
for (const [k, [x, z, r]] of [[-9, -6, 4.8], [9, -6, 4.8], [0, -18, 3], [-9, 12, 2], [9, 12, 2]].entries()) {
  add(`contact-${k}`, rod([x, 12, z], [x, 3, z], r, 8).color(contacts));
}

// Release button on top behind the head.
add('button-bezel', rod([0, 52, 24], [0, 52, 32], 11, 12).color(faceInsert));
add('button', rod([0, 52, 30], [0, 52, 34], 8, 12).color(button));

// Strain relief and cable continuing the handle's downward bend.
add('strain-relief', turnedY([[16, 0], [13, 30], [10, 56], [0, 56], [0, 0]])
  .rotateX(-28).translate(0, 230, -64).color(cable));
add('cable', rod([0, 276, -88], [0, 330, -150], 8, 8).color(cable));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
