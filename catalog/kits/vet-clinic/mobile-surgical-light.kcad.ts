// SPDX-License-Identifier: CC0-1.0
// Mobile LED surgical light, the wheeled procedure light rolled in over a
// treatment or surgery table. What makes one: a five-star castor base, a tall
// column, a spring-balanced parallelogram arm that reaches out and up, a
// curved yoke and a shallow domed light head whose underside carries rings of
// LED lens pods round a central sterilisable handle.
// The heads choice adds a second, smaller satellite head on its own arm.
// Millimetres, Z up, arm reaching toward +X.
meta({
  name: "mobile-surgical-light",
  license: 'CC0-1.0',
  title: "Mobile surgical light",
  description: "Mobile LED procedure light at real size: five-star castor base, column, spring-balanced parallelogram arm, curved yoke and tilted domed head with two rings of LED lens pods round a central sterile handle. Heads choice (single, dual) adds a smaller satellite head on a second arm. Material controls: frame paint, head shell, LED lens and castor rubber. clinicClean, softTeal and graphite presets.",
  tags: ["veterinary", "animal clinic", "surgical light", "procedure light", "led", "mobile", "surgery", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const heads = param('heads', 'single', { choices: ['single', 'dual'], label: 'Light heads' });
const frame = param('frame', '#e6e9e8', { label: 'Frame paint' });
const headShell = param('headShell', '#f4f5f3', { label: 'Head shell' });
const lens = param('lens', '#cfeaf2', { label: 'LED lens' });
const castor = param('castor', '#2a2e30', { label: 'Castor rubber' });

presets({
  clinicClean: { frame: '#f2f3f1', headShell: '#ffffff' },
  softTeal: { frame: '#7fb0b2', headShell: '#e9f1f0', lens: '#bfe6ee' },
  graphite: { frame: '#4a5054', headShell: '#c9cdcd', castor: '#1b1d1e' },
});

const p = assembly("mobile-surgical-light");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const tube = (a: number[], b: number[], r: number, seg = 12) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return cylinder(len, r, seg)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const turned = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const steel = '#b8c0c2';

// ---- Five-star base ----
add('base-hub', turned([[0, 0], [110, 0], [110, 60], [70, 110], [0, 110]], 20).translate(0, 0, 70).color(frame));
for (let k = 0; k < 5; k++) {
  const a = 90 + k * 72;
  const leg = path().moveTo(60, -45).lineTo(370, -24).lineTo(390, 0).lineTo(370, 24).lineTo(60, 45).close().extrude(55);
  add(`base-leg-${k}`, leg.translate(0, 0, 80).rotateZ(a).color(frame));
  const cx = 360 * Math.cos((a * Math.PI) / 180), cy = 360 * Math.sin((a * Math.PI) / 180);
  add(`castor-swivel-${k}`, cylZ(cx, cy, 58, 24, 22, 10).color(steel));
  add(`castor-wheel-${k}`, cylinder(30, 30, 16).rotateX(90).rotateZ(a).translate(cx, cy, 30).color(castor));
}

// ---- Column and arm ----
const H = 1700;
add('column', cylZ(0, 0, 180, H - 180, 34).color(frame));
add('column-collar', turned([[0, 0], [52, 0], [52, 50], [36, 70], [0, 70]], 16).translate(0, 0, 180).color(frame));
add('handle-ring', cylZ(0, 0, 1050, 40, 44).color(castor));
add('arm-pivot', cylZ(0, 0, H, 90, 50).color(steel));
// Spring arm: two parallel links from the column top out to the elbow.
const armTo = (name: string, dir: number, reach: number, rise: number, r: number) => {
  const e = [dir * reach, 0, H + 45 + rise];
  add(`${name}-link-upper`, tube([0, 0, H + 70], [e[0], 0, e[2] + 25], r).color(frame));
  add(`${name}-link-lower`, tube([0, 0, H + 20], [e[0], 0, e[2] - 25], r).color(frame));
  add(`${name}-spring-cover`, tube([dir * 90, 0, H + 45 + rise * 0.12], [dir * reach * 0.6, 0, H + 45 + rise * 0.65], r + 12).color(frame));
  add(`${name}-elbow`, cylZ(e[0], 0, e[2] - 45, 90, r + 16).color(steel));
  return e;
};
// Head assembly about the yoke, tilted toward the column.
const head = (name: string, e: number[], R: number, drop: number, tiltDeg: number, dir: number) => {
  const yb = [e[0], 0, e[2] - 45];
  const hc = [e[0] + dir * 0.15 * R, 0, e[2] - drop];
  add(`${name}-yoke-down`, tube(yb, [e[0], 0, hc[2] + R * 0.85], 22).color(frame));
  add(`${name}-yoke-arc-a`, tube([e[0], 0, hc[2] + R * 0.85], [e[0] + dir * R * 0.75, 0, hc[2] + R * 0.6], 20).color(frame));
  add(`${name}-yoke-arc-b`, tube([e[0] + dir * R * 0.75, 0, hc[2] + R * 0.6], [e[0] + dir * R * 1.1, 0, hc[2] + 40], 20).color(frame));
  const T = (s: Shape) => s.rotateY(dir * tiltDeg).translate(hc[0], hc[1], hc[2]);
  add(`${name}-shell`, T(turned([[0, 0], [R, 0], [R + 8, 30], [R - 20, 85], [R * 0.55, 135], [0, 145]], 24)).color(headShell));
  add(`${name}-rim`, T(cylZ(0, 0, -14, 16, R + 4, 24)).color(steel));
  add(`${name}-face`, T(cylZ(0, 0, -18, 6, R - 12, 24)).color('#d8dcdc'));
  const rings: number[][] = [[0.35, 6], [0.72, 12]];
  for (const [f, n] of rings) {
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n + (n === 6 ? 0.5 : 0);
      add(`${name}-led-${n}-${k}`, T(cylZ(f * R * Math.cos(a), f * R * Math.sin(a), -34, 18, R * 0.12, 12)).color(lens));
    }
  }
  add(`${name}-sterile-handle`, T(turned([[0, 0], [26, 0], [20, -40], [16, -150], [24, -170], [0, -175]], 14).translate(0, 0, -18)).color('#7fa8c9'));
};
const e1 = armTo('arm', 1, 760, 160, 18);
head('head', e1, 290, 360, 20, 1);
if (heads.value === 'dual') {
  const e2 = armTo('satellite-arm', -1, 620, 60, 15);
  head('satellite-head', e2, 210, 300, 22, -1);
}

return p.model();
