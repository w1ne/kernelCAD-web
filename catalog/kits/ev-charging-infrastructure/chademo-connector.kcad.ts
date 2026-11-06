// SPDX-License-Identifier: CC0-1.0
// CHAdeMO connector: the Japanese-standard DC fast-charging plug, the biggest
// and heaviest of the common EV plugs. What makes it a CHAdeMO: a fat round
// barrel like a fuel nozzle with a ribbed coupling sleeve, a large round face
// with ten contacts (two big DC pins inside a ring of eight small signal and
// CAN pins), a long locking lever along the top that is pulled back to latch
// the plug into the car, a pistol grip with a trigger under the rear of the
// barrel, and a thick cable out of the grip.
// Generic visualization geometry at about real size (barrel 112 mm across,
// plug about 300 mm long), millimetres, Z up, face along -Y, lowest point on
// z = 0.

meta({
  name: "chademo-connector",
  license: 'CC0-1.0',
  title: "CHAdeMO connector",
  description: "CHAdeMO DC fast-charging plug: fat round barrel with a ribbed coupling sleeve, large recessed face with two big DC pins in a ring of eight signal pins, long top locking lever with front latch and rear pull tab, pistol grip with trigger, strain relief and heavy cable. Material controls: barrel, grip and sleeve, lock lever and contacts, cable. fleetReady and nightService presets.",
  tags: ['CHAdeMO', 'DC fast charging', 'EV plug', 'charging connector', 'quick charger', 'EV charging', 'electric vehicle', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const barrel = param('barrel', '#d9dcda', { label: 'Barrel shell (engineering polymer)' });
const grip = param('grip', '#25292c', { label: 'Coupling sleeve, face insert and pistol grip (rubberised)' });
const lever = param('lever', '#e07b24', { label: 'Locking lever and trigger' });
const contacts = param('contacts', '#c9a14a', { label: 'Contact pins (plated brass)' });
const cable = param('cable', '#141719', { label: 'Cable jacket and strain relief' });

presets({
  fleetReady: { barrel: '#263a36', grip: '#141b19', lever: '#e0b31f', contacts: '#c9a14a', cable: '#1a2522' },
  nightService: { barrel: '#222d32', grip: '#0f1416', lever: '#5f6b70', contacts: '#a88a45', cable: '#111719' },
});

const p = assembly("chademo-connector");
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

// Coupling sleeve with grip rings, face recessed 16 mm.
add('coupling-sleeve', turnedY([[38, 0], [47, 0], [50, 6], [50, 64], [38, 64]]).color(grip));
for (const y of [22, 36, 50]) add(`sleeve-ring-${y}`, turnedY([[49, y - 3], [53, y - 3], [53, y + 3], [49, y + 3]]).color(grip));
add('face-insert', turnedY([[0, 16], [38, 16], [38, 64], [0, 64]]).color(grip));
for (const s of [-1, 1]) add(`dc-pin-${s}`, rod([s * 14, 16, -4], [s * 14, 4, -4], 6.5, 8).color(contacts));
for (const a of [30, 60, 90, 120, 150, 210, 270, 330]) {
  const t = (a * Math.PI) / 180;
  add(`signal-pin-${a}`, rod([28 * Math.cos(t), 16, 28 * Math.sin(t)], [28 * Math.cos(t), 6, 28 * Math.sin(t)], 2.4, 6).color(contacts));
}

// Barrel: steps up from the sleeve, long straight body, tapered tail.
add('barrel', turnedY([[0, 60], [52, 60], [56, 76], [56, 180], [44, 214], [0, 214]]).color(barrel));
add('barrel-band', turnedY([[55, 150], [58, 150], [58, 162], [55, 162]]).color(grip));

// Locking lever along the top: latch nose at the front, pull tab at the rear.
add('lever-rail', side([[70, 50], [70, 62], [196, 62], [196, 50]], 30).color(barrel));
add('lock-lever', side([
  [24, 40], [24, 62], [52, 74], [190, 78], [240, 104], [256, 100], [206, 68], [60, 64], [42, 52], [38, 40],
], 22).color(lever));
add('lever-pivot', rod([-18, 196, 66], [18, 196, 66], 8, 8).color(grip));

// Pistol grip and trigger under the rear of the barrel.
add('pistol-grip', side([
  [146, -36], [206, -36], [254, -150], [262, -196], [226, -204], [208, -166], [166, -70], [140, -52],
], 50).color(grip));
add('trigger', side([[150, -50], [140, -92], [150, -100], [168, -56]], 14).color(lever));
add('trigger-guard', side([[120, -40], [114, -110], [128, -122], [184, -112], [184, -100], [134, -104], [134, -40]], 10).color(grip));

// Strain relief and cable out of the grip butt.
add('strain-relief', turnedY([[22, 0], [18, 30], [15, 62], [0, 62], [0, 0]])
  .rotateX(-74).translate(0, 244, -192).color(cable));
add('cable', rod([0, 258, -246], [0, 280, -330], 14, 8).color(cable));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
