// SPDX-License-Identifier: CC0-1.0
// Basket muzzle: a tapered open lattice basket that slips over a dog's snout,
// held by a nylon neck strap with a buckle. Moulded hoops and twelve
// longitudinal rails narrow from a wide rear rim to a small nose ring, so the
// dog can still pant and drink through the cage. A neoprene pad lines the top
// of the rear rim over the bridge of the nose. The tapered cage with a strap
// loop behind it is what makes it read as a muzzle rather than a box frame.
// Generic visualization geometry at real size for a medium dog, millimetres,
// Z up, resting on its chin bumper at z = 0, nose pointing towards -Y.
meta({
  name: "basket-muzzle",
  license: 'CC0-1.0',
  title: "Basket muzzle",
  description: "Medium-dog basket muzzle: a tapered lattice of moulded hoops and twelve rails closing to a nose ring with a cross grille, a neoprene bridge pad on the rear rim, a chin bumper, and a nylon neck strap loop with side straps, D-rings and a steel buckle. Material controls: moulded basket, nylon straps, neoprene padding, steel hardware. Forehead-strap choice; clinicClean and softTeal presets.",
  tags: ["veterinary", "animal clinic", "animal health", "basket", "muzzle", "dog", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const forehead = param('forehead', 'strap', { choices: ['strap', 'none'], label: 'Forehead strap' });
const polymerColor = param('polymerColor', '#3b4447', { label: 'Moulded basket' });
const fabricColor = param('fabricColor', '#b5523b', { label: 'Nylon straps' });
const paddingColor = param('paddingColor', '#2f6f8c', { label: 'Neoprene padding' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Steel buckle and rings' });

presets({
  clinicClean: { polymerColor: '#e2e8e5', fabricColor: '#5d7d8a', paddingColor: '#9fb8bf', stainlessSteelColor: '#d5dcda' },
  softTeal: { polymerColor: '#4d858d', fabricColor: '#2f4f55', paddingColor: '#c8d9d5', stainlessSteelColor: '#a9b5b3' },
});

const p = assembly("basket-muzzle");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Basket axis height; the chin bumper below the rear rim touches z = 0.
const zA = 66;
const yRear = 62;
const yFront = -66;
// Half-width and half-height of the cage at a station y, tapering linearly.
const rx = (y) => 40 + ((y - yFront) / (yRear - yFront)) * 22;
const rz = (y) => 36 + ((y - yFront) / (yRear - yFront)) * 20;

// Round ring of n points.
const ring = (r, n = 6) => {
  let pb = path().moveTo(r, 0);
  for (let i = 1; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pb = pb.lineTo(r * Math.cos(t), r * Math.sin(t));
  }
  return pb.close();
};
// Round rod from p0 to p1.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ring(r, n)
    .loft([ring(r, n)], { planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, len] }], ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Flat elliptical band in the XZ plane, centred on the origin: half-axes ax, az
// on the centreline, wall thickness t, depth along Y.
const ellipse = (ax, az, n) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [ax * Math.cos(t), az * Math.sin(t)];
});
const band = (ax, az, t, depth, n = 16) =>
  extrudePolygon(ellipse(ax + t / 2, az + t / 2, n), depth)
    .subtract(extrudePolygon(ellipse(ax - t / 2, az - t / 2, n), depth + 2).translate(0, 0, -1))
    .rotateX(90)
    .translate(0, depth / 2, 0);
// Cage hoop at station y.
const hoop = (y, t, depth) => band(rx(y), rz(y), t, depth).translate(0, y, zA);

// Moulded cage: rear rim, two waist hoops and the nose ring.
add('rear-rim', hoop(yRear, 10, 14).color(polymerColor));
add('hoop-mid-rear', hoop(18, 7, 8).color(polymerColor));
add('hoop-mid-front', hoop(-26, 7, 8).color(polymerColor));
add('nose-ring', hoop(yFront, 9, 10).color(polymerColor));
for (let i = 0; i < 12; i += 1) {
  const a = ((i + 0.5) / 12) * Math.PI * 2;
  const at = (y) => [rx(y) * Math.cos(a), y, zA + rz(y) * Math.sin(a)];
  add(`rail-${i + 1}`, rod(at(yRear), at(yFront), 3).color(polymerColor));
}
// Cross grille closing the nose end.
add('nose-bar-vertical', rod([0, yFront, zA - rz(yFront)], [0, yFront, zA + rz(yFront)], 3).color(polymerColor));
add('nose-bar-horizontal', rod([-rx(yFront), yFront, zA], [rx(yFront), yFront, zA], 3).color(polymerColor));
// Chin bumper: a flat moulded pad under the rear rim that the muzzle rests on.
add('chin-bumper', box(46, 34, 10, true).translate(0, yRear - 12, 5).color(polymerColor));

// Neoprene bridge pad lining the top of the rear rim.
const pad = path()
  .moveTo(rz(yRear) - 9, 0).lineTo(rz(yRear) - 3, 0).lineTo(rz(yRear) - 3, 20).lineTo(rz(yRear) - 9, 20).close()
  .revolve({ angleDeg: 130 })
  .rotateZ(25)
  .rotateX(90)
  .scale([rx(yRear) / rz(yRear), 1, 1])
  .translate(0, yRear + 12, zA);
add('bridge-pad', pad.color(paddingColor));

// Nylon neck strap: a flat loop behind the head, joined to the rim by side straps.
const yLoop = 112;
const zLoop = zA + 24;
add('neck-strap', band(75, 72, 5, 22, 20).translate(0, yLoop, zLoop).color(fabricColor));
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  add(`d-ring-${side}`, band(7, 7, 3.2, 3.2, 8).rotateZ(90).translate(s * (rx(yRear) + 7), yRear + 6, zA).color(stainlessSteelColor));
  add(`side-strap-${side}`, rod([s * (rx(yRear) + 12), yRear + 8, zA], [s * 74, yLoop, zLoop], 5, 4).color(fabricColor));
}
// Buckle on the upper left of the loop.
add('buckle-frame', box(22, 26, 6, true).rotateY(-45).translate(-53, yLoop, zLoop + 53).color(stainlessSteelColor));
add('buckle-tongue', rod([-50, yLoop - 13, zLoop + 50], [-56, yLoop + 13, zLoop + 56], 1.5, 4).color(stainlessSteelColor));

// Optional forehead strap from the basket over the bridge of the nose to the top of the loop.
if (forehead.value === 'strap') {
  add('forehead-strap', rod([0, 10, zA + rz(10) + 3], [0, yLoop, zLoop + 74], 5, 4).color(fabricColor));
  add('forehead-ring', band(8, 8, 3.6, 3.6, 8).rotateX(90).translate(0, yLoop, zLoop + 76).color(stainlessSteelColor));
}

return p.model();
