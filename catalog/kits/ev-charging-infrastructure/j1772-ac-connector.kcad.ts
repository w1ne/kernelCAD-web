// SPDX-License-Identifier: CC0-1.0
// J1772 AC connector: the SAE J1772 (Type 1) Level 2 plug on the end of a
// North American AC charger cable. What makes it a J1772: a round nose with a
// recessed face carrying five contacts (two large AC pins and a large ground
// pin, plus small proximity and control-pilot pins), a pistol grip that drops
// back and down from the head, and the long latch lever over the top whose hook
// grabs the car inlet and is released by a thumb button at the rear.
// Generic visualization geometry at about real size (nose 70 mm across, plug
// about 240 mm long), millimetres, Z up, face along -Y, lowest point on z = 0.

meta({
  name: "j1772-ac-connector",
  license: 'CC0-1.0',
  title: "J1772 AC connector",
  description: "SAE J1772 (Type 1) AC charging plug: round nose with a recessed five-contact face (two AC pins, ground pin, proximity and pilot pins), pistol grip with overmoulded hand area, long latch lever with a front hook and rear thumb button, strain relief and cable tail. Material controls: housing, grip overmould, latch and contacts, cable. fleetReady and nightService presets.",
  tags: ['J1772', 'Type 1', 'SAE J1772', 'EV plug', 'charging connector', 'Level 2', 'EV charging', 'electric vehicle', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#e6e8e6', { label: 'Nose and body shell (engineering polymer)' });
const gripOvermold = param('gripOvermold', '#2c3236', { label: 'Grip overmould and face insert (soft-touch elastomer)' });
const latch = param('latch', '#3f7fb8', { label: 'Latch lever and thumb button' });
const contacts = param('contacts', '#c9a14a', { label: 'Contact pins (plated brass)' });
const cable = param('cable', '#16191b', { label: 'Cable jacket and strain relief' });

presets({
  fleetReady: { housing: '#263a36', gripOvermold: '#141b19', latch: '#e0b31f', contacts: '#c9a14a', cable: '#1a2522' },
  nightService: { housing: '#222d32', gripOvermold: '#0f1416', latch: '#5f6b70', contacts: '#a88a45', cable: '#111719' },
});

const p = assembly("j1772-ac-connector");
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
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Nose: face at y = 0 on the head axis (z = 0), recessed 14 mm for the contacts.
add('nose', turnedY([[26, 0], [35, 0], [37, 8], [37, 62], [30, 70], [26, 70]]).color(housing));
add('face-insert', turnedY([[0, 14], [26, 14], [26, 70], [0, 70]]).color(gripOvermold));
add('nose-key', box(10, 14, 8, true).translate(0, 7, -32).color(housing));
for (const [k, [x, z, r]] of [[-11, 9, 4], [11, 9, 4], [0, -13, 4.4], [-15, -6, 2], [15, -6, 2]].entries()) {
  add(`contact-${k}`, rod([x, 14, z], [x, 3, z], r, 8).color(contacts));
}

// Body and pistol grip, one side profile from the back of the nose.
add('body', side([
  [58, 34], [120, 42], [158, 34], [214, -62], [226, -112], [214, -126], [186, -122],
  [166, -96], [118, -34], [82, -38], [58, -34],
], 50).color(housing));
// Soft overmould panels on both flanks of the grip.
for (const s of [-1, 1]) {
  add(`grip-panel-${s}`, side([
    [150, 22], [200, -60], [210, -108], [190, -114], [172, -90], [128, -24],
  ], 6).translate(s * 26, 0, 0).color(gripOvermold));
}

// Latch lever: pivots near the thumb button, hook drops over the front of the nose.
add('latch-lever', side([
  [-12, 30], [-12, 46], [104, 52], [116, 46], [104, 40], [2, 40], [2, 30],
], 16).color(latch));
add('thumb-button', side([[112, 40], [124, 56], [146, 50], [146, 38]], 22).color(latch));
add('latch-guard', side([[86, 38], [96, 56], [150, 48], [150, 36]], 30).color(housing));

// Strain relief and cable tail leaving the bottom of the grip.
add('strain-relief', rod([0, 206, -112], [0, 236, -178], 15, 8).color(cable));
add('cable', rod([0, 232, -170], [0, 254, -262], 10, 8).color(cable));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
