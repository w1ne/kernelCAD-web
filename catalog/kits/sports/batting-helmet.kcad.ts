// SPDX-License-Identifier: CC0-1.0
// Batting helmet: a double-flap baseball/softball batting helmet with a steel
// face guard. What makes it one: a smooth egg-shaped crown, a short moulded
// bill at the front, ear flaps that drop low over both ears with ear holes and vents,
// a skirt that wraps round the back of the head, a dark foam liner showing at
// the rim, a team stripe over the crown and a bent-wire cage across the face.
// Generic visualization geometry at about real size (about 330 mm long with the
// cage, 240 mm wide, 230 mm tall), millimetres, Z up, face toward +X, lowest
// point on z = 0.
meta({
  name: 'batting-helmet',
  license: 'CC0-1.0',
  title: 'Batting helmet',
  description: "Double-flap batting helmet: lofted egg-shaped crown, moulded bill, ear flaps with ear holes, wrap-round rear skirt, dark foam liner at the rim, crown team stripe and a bent-wire steel face guard. Material controls: helmet shell polymer, impact foam, face guard steel, decal accent; clubColors, matteBlack and weathered presets.",
  tags: ['batting helmet', 'baseball helmet', 'softball', 'baseball', 'face guard', 'helmet', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const helmetPolymer = param('helmetPolymer', '#24477e', { label: 'Helmet shell polymer' });
const impactFoam = param('impactFoam', '#292e33', { label: 'Impact foam' });
const faceGuardSteel = param('faceGuardSteel', '#aab4b5', { label: 'Face guard steel' });
const decalAccent = param('decalAccent', '#e9e4d8', { label: 'Decal and stripe' });
presets({
  clubColors: { helmetPolymer: '#d74336', impactFoam: '#292e33' },
  matteBlack: { helmetPolymer: '#25282c', faceGuardSteel: '#3a3e42', decalAccent: '#d0a23c' },
  weathered: { helmetPolymer: '#4f607a', impactFoam: '#3d3d3a', faceGuardSteel: '#8f9290', decalAccent: '#bfb8a6' },
});

const p = assembly('batting-helmet');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Closed ellipse path in XY, shifted forward by dx.
const ring = (a, b, dx, n = 20) => {
  let pb = path().moveTo(dx + a, 0);
  for (let i = 1; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    pb = pb.lineTo(dx + a * Math.cos(t), b * Math.sin(t));
  }
  return pb.close();
};
// Elliptic arc band in XY between two ellipses, angles in degrees from +X.
const arcBand = (a0, b0, a1, b1, t0, t1, steps) => {
  const outer = [];
  const inner = [];
  for (let k = 0; k <= steps; k++) {
    const t = ((t0 + ((t1 - t0) * k) / steps) * Math.PI) / 180;
    outer.push([a1 * Math.cos(t), b1 * Math.sin(t)]);
    inner.push([a0 * Math.cos(t), b0 * Math.sin(t)]);
  }
  return [...outer, ...inner.reverse()];
};

const RIM = 70; // underside of the crown
const A = 136; // crown half-length at the rim
const B = 112; // crown half-width at the rim
// Crown: lofted dome, ellipse sections shrinking over the top, the crown set
// slightly back so the forehead is steeper than the back of the head.
const phis = [0, 18, 34, 48, 61, 72, 81, 88];
const crownRings = phis.map((d) => {
  const c = Math.cos((d * Math.PI) / 180);
  return [Math.max(10, A * c), Math.max(8, B * c), -4 - 8 * Math.sin((d * Math.PI) / 180)];
});
const crownZ = phis.map((d) => RIM + 150 * Math.sin((d * Math.PI) / 180));
add('crown', ring(...crownRings[0]).loft(crownRings.slice(1).map((r) => ring(...r)), {
  planes: crownZ.map((z) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
}).color(helmetPolymer));
// Foam liner showing at the rim.
add('foam-liner', extrudePolygon(arcBand(A - 18, B - 18, A - 4, B - 4, 0, 360, 24), 8).translate(-4, 0, RIM - 6).color(impactFoam));
// Team stripe over the crown: a thin raised band following the side profile.
const stripePts = [];
for (let k = 0; k < crownRings.length; k++) stripePts.push([crownRings[k][2] + crownRings[k][0] + 3, crownZ[k] + 1]);
for (let k = crownRings.length - 1; k >= 0; k--) stripePts.push([crownRings[k][2] - crownRings[k][0] - 3, crownZ[k] + 1]);
stripePts.splice(crownRings.length, 0, [crownRings[crownRings.length - 1][2], crownZ[crownZ.length - 1] + 4]);
add('crown-stripe', extrudePolygon(stripePts, 26).rotateX(90).translate(0, 13, 0).color(decalAccent));

// Bill: crescent over the face, tipped down a little.
add('bill', extrudePolygon(arcBand(A - 18, B - 12, A + 42, B + 6, -62, 62, 12), 6).rotateY(8).translate(-4, 0, RIM + 2).color(helmetPolymer));

// Lower shell: a curved band wrapping round the back of the head and dropping
// lower still over both ears as the flaps; foam lines the inside.
const skirt = (t0, t1, z0, name) => {
  add(name, extrudePolygon(arcBand(A - 10, B - 8, A, B, t0, t1, 10), RIM + 4 - z0).translate(-4, 0, z0).color(helmetPolymer));
  add(`${name}-liner`, extrudePolygon(arcBand(A - 18, B - 16, A - 10, B - 8, t0, t1, 10), RIM - 2 - z0).translate(-4, 0, z0 + 4).color(impactFoam));
};
skirt(95, 265, 30, 'rear-skirt');
// Point on the outer shell surface at polar angle t (deg), height z, lifted by `off`.
const onShell = (t, z, off = 0) => {
  const r = (t * Math.PI) / 180;
  return [-4 + (A + off) * Math.cos(r), (B + off) * Math.sin(r), z];
};
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  skirt(s < 0 ? -102 : 32, s < 0 ? -32 : 102, 0, `ear-flap-${side}`);
  add(`flap-front-edge-${side}`, rod(onShell(s * 32, 0, -5), onShell(s * 32, RIM + 4, -5), 6).color(helmetPolymer));
  add(`ear-hole-${side}`, rod(onShell(s * 66, 40, -4), onShell(s * 66, 40, 2), 15, 12).color(impactFoam));
  for (let k = 0; k < 3; k++) {
    add(`ear-vent-${side}-${k + 1}`, rod(onShell(s * (78 + k * 6), 44, -4), onShell(s * (78 + k * 6), 44, 1.5), 4, 6).color(impactFoam));
  }
  add(`flap-decal-${side}`, rod(onShell(s * 84, 14, -4), onShell(s * 84, 14, 1), 9, 10).color(decalAccent));
}

// Face guard: two bent bars across the face, joined by uprights, bolted to the flaps.
const hoop = (z, HA, HB, t0, t1, steps, name) => {
  let prev = null;
  for (let k = 0; k <= steps; k++) {
    const t = ((t0 + ((t1 - t0) * k) / steps) * Math.PI) / 180;
    const pt = [HA * Math.cos(t), HB * Math.sin(t), z];
    if (prev) add(`${name}-${k}`, rod(prev, pt, 5.5).color(faceGuardSteel));
    prev = pt;
  }
};
hoop(RIM - 6, 176, 122, -64, 64, 8, 'cage-top-bar');
hoop(10, 170, 118, -62, 62, 8, 'cage-chin-bar');
for (const t of [-24, 0, 24]) {
  const r = (t * Math.PI) / 180;
  add(`cage-upright-${t}`, rod([170 * Math.cos(r), 118 * Math.sin(r), 10], [176 * Math.cos(r), 122 * Math.sin(r), RIM - 6], 5.5).color(faceGuardSteel));
}
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  const r0 = (s * 64 * Math.PI) / 180;
  const r1 = (s * 62 * Math.PI) / 180;
  add(`cage-mount-${side}`, rod([176 * Math.cos(r0), 122 * Math.sin(r0), RIM - 6], onShell(s * 44, RIM - 14, 4), 5.5).color(faceGuardSteel));
  add(`cage-chin-mount-${side}`, rod([170 * Math.cos(r1), 118 * Math.sin(r1), 10], onShell(s * 44, 16, 4), 5.5).color(faceGuardSteel));
  add(`cage-bolt-top-${side}`, rod(onShell(s * 44, RIM - 14, -2), onShell(s * 44, RIM - 14, 6), 9, 10).color(faceGuardSteel));
  add(`cage-bolt-chin-${side}`, rod(onShell(s * 44, 16, -2), onShell(s * 44, 16, 6), 9, 10).color(faceGuardSteel));
}

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
