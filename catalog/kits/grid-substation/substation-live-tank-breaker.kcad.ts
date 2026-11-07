// SPDX-License-Identifier: CC0-1.0
// Live tank SF6 circuit breaker, the three tall columns that switch each
// transmission bay. What makes it one: each pole is a slim vertical column
// held high on a galvanised steel support - a shedded support insulator, a
// cast-aluminium mid flange carrying the lower terminal pad, the shedded
// interrupter insulator above it and a top head with the upper terminal pad;
// the interrupter is "live", at line potential, so the whole column is the
// breaker. The three poles stand on a common beam with a gas-density monitor
// at each foot, linked by a pull rod to the spring operating mechanism
// cabinet hung from one leg. Millimetres, Z up, ground origin, poles along X,
// terminals face +/-Y.
meta({
  name: "substation-live-tank-breaker",
  license: "CC0-1.0",
  title: "Live tank circuit breaker",
  description: "Three-pole live tank SF6 circuit breaker at about real size: three slim columns, each a shedded support insulator, cast-aluminium mid flange with lower terminal pad, shedded interrupter insulator and top head with upper terminal pad, on a common galvanised beam with braced legs and concrete footings; gas-density monitors at each pole foot, inter-pole pull rod and a spring operating mechanism cabinet with door and handle. Material controls: galvanised structure, mechanism cabinet, insulators, aluminium terminals; weathered, maintenance and brown-porcelain presets.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "circuit breaker", "live tank breaker", "SF6", "switchgear", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#8a969b', { label: 'Galvanized steel structure' });
const powderCoat = param('powderCoat', '#c7cbc8', { label: 'Mechanism cabinet' });
const insulator = param('insulator', '#6c7478', { label: 'Insulators' });
const copper = param('copper', '#c9ced1', { label: 'Aluminium flanges and terminals' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#9fa49d', insulator: '#6f7474', copper: '#a3a49c' },
  maintenance: { powderCoat: '#cf7736' },
  brownPorcelain: { insulator: '#7b4632', powderCoat: '#5f7466' },
});

const p = assembly("substation-live-tank-breaker");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising, n flat sides.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Square member from point a to point b.
const strut = (a, b, w) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return blk(-w / 2, -w / 2, 0, w / 2, w / 2, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Shedded insulator from z=0 to h: core radius rc, sheds alternating rs and 0.8 rs.
const sheds = (h, rc, rs, pitch) => {
  const pts = [[rc, 0]];
  let i = 0;
  for (let z = pitch * 0.5; z + pitch * 0.6 < h; z += pitch, i++) {
    const r = i % 2 ? rs * 0.8 : rs;
    pts.push([r, z], [r, z + pitch * 0.12], [rc, z + pitch * 0.45]);
  }
  pts.push([rc, h]);
  return lathe(pts, 8);
};

const concrete = '#9a9890', dark = '#2c3033';
const poles = [-2200, 0, 2200];
const beamZ = 2500;

// ---- Footings, legs, bracing and the common pole beam ----
for (const x of [-2900, 2900]) {
  for (const y of [-650, 650]) {
    add(`footing-${x}-${y}`, blk(x - 260, y - 260, 0, x + 260, y + 260, 300).color(concrete));
    add(`base-plate-${x}-${y}`, blk(x - 170, y - 170, 300, x + 170, y + 170, 330).color(galvanizedSteel));
    add(`leg-${x}-${y}`, strut([x, y, 330], [x, y * 0.25, beamZ - 120], 150).color(galvanizedSteel));
  }
  add(`leg-tie-${x}`, blk(x - 50, -560, 1100, x + 50, 560, 1180).color(galvanizedSteel));
  add(`leg-brace-${x}-a`, strut([x, -560, 1180], [x, 150, beamZ - 200], 70).color(galvanizedSteel));
  add(`leg-brace-${x}-b`, strut([x, 560, 1180], [x, -150, beamZ - 200], 70).color(galvanizedSteel));
}
add('pole-beam-front', blk(-3150, -260, beamZ - 160, 3150, -160, beamZ).color(galvanizedSteel));
add('pole-beam-rear', blk(-3150, 160, beamZ - 160, 3150, 260, beamZ).color(galvanizedSteel));
add('pole-beam-web', blk(-3150, -160, beamZ - 30, 3150, 160, beamZ).color(galvanizedSteel));
add('pole-beam-brace-a', strut([-2900, -200, beamZ - 160], [-1600, -200, 1600], 60).color(galvanizedSteel));
add('pole-beam-brace-b', strut([2900, -200, beamZ - 160], [1600, -200, 1600], 60).color(galvanizedSteel));
add('pole-beam-brace-tie', blk(-1600, -230, 1570, 1600, -170, 1630).color(galvanizedSteel));

// ---- Three poles: mechanism housing, support insulator, interrupter, head ----
poles.forEach((x, i) => {
  const n = `pole-${i + 1}`;
  let z = beamZ;
  add(`${n}-housing`, blk(x - 260, -260, z, x + 260, 260, z + 380).color(copper));
  add(`${n}-density-monitor`, rod(85, 0, 50).rotateX(90).translate(x + 120, -260, z + 200).color(dark));
  add(`${n}-density-dial`, rod(65, 0, 8).rotateX(90).translate(x + 120, -310, z + 200).color('#e9e6dc'));
  z += 380;
  add(`${n}-base-flange`, rod(200, z, z + 70, 10).translate(x, 0, 0).color(copper));
  z += 70;
  add(`${n}-support-insulator`, sheds(1600, 115, 210, 150).translate(x, 0, z).color(insulator));
  z += 1600;
  add(`${n}-mid-flange`, lathe([[190, z], [230, z + 60], [230, z + 260], [190, z + 320]], 10).translate(x, 0, 0).color(copper));
  add(`${n}-lower-pad`, blk(x - 70, -560, z + 110, x + 70, -220, z + 200).color(copper));
  add(`${n}-lower-pad-palm`, blk(x - 110, -700, z + 80, x + 110, -560, z + 230).color(copper));
  z += 320;
  add(`${n}-interrupter-insulator`, sheds(1500, 130, 225, 150).translate(x, 0, z).color(insulator));
  z += 1500;
  add(`${n}-head`, lathe([[200, z], [240, z + 70], [240, z + 330], [170, z + 420]], 10).translate(x, 0, 0).color(copper));
  add(`${n}-upper-pad`, blk(x - 70, 220, z + 160, x + 70, 560, z + 250).color(copper));
  add(`${n}-upper-pad-palm`, blk(x - 110, 560, z + 130, x + 110, 700, z + 280).color(copper));
  add(`${n}-head-cap`, rod(120, z + 420, z + 470, 10).translate(x, 0, 0).color(copper));
});

// ---- Inter-pole pull rod and the operating mechanism cabinet ----
add('pull-rod', rod(30, 0, 4400, 8).rotateY(90).translate(-2200, -330, beamZ + 120).color(galvanizedSteel));
for (const x of poles) add(`pull-rod-lever-${x}`, blk(x - 25, -350, beamZ + 80, x + 25, -260, beamZ + 300).color(galvanizedSteel));
add('mechanism-cabinet', blk(-3500, -480, 900, -2950, 480, 2250).color(powderCoat));
add('mechanism-roof', blk(-3540, -520, 2250, -2910, 520, 2310).color(powderCoat));
add('mechanism-door', blk(-3520, -440, 960, -3500, 440, 2190).color(powderCoat));
for (const z of [1080, 2070]) add(`mechanism-hinge-${z}`, blk(-3530, -470, z, -3500, -440, z + 70).color(dark));
add('mechanism-handle', blk(-3560, 300, 1450, -3520, 340, 1700).color(dark));
add('mechanism-window', blk(-3530, -250, 1800, -3520, 50, 2000).color('#8fb4c4'));
add('mechanism-drive-tube', rod(45, 2310, beamZ - 160, 8).translate(-3220, -200, 0).color(galvanizedSteel));
add('mechanism-crank', blk(-3240, -330, beamZ + 80, -2200, -300, beamZ + 160).color(galvanizedSteel));
add('earth-strap', blk(-2925, -620, 330, -2875, -600, 1000).color('#b87545'));

return p.model();
