// SPDX-License-Identifier: CC0-1.0
// End-suction centrifugal process pump set, the ANSI/ISO type found in every
// plant pump bay. What makes it one: the spiral volute casing that winds
// around the impeller and opens into a vertical discharge neck, an axial
// suction nozzle on the front, both with bolted flanges; a ribbed bearing
// frame between the casing and a half-round coupling guard; and a finned
// TEFC motor with fan cowl and terminal box, all bolted to a fabricated
// baseplate with a raised drip rim. Millimetres, Z up, base origin, the shaft
// runs along X with suction facing +X.
meta({
  name: 'centrifugal-pump',
  license: 'CC0-1.0',
  title: 'Centrifugal process pump',
  description: 'End-suction centrifugal pump set at about real size: spiral volute casing with vertical discharge neck and axial suction nozzle, bolted flanges, ribbed bearing frame with oiler, half-round coupling guard, finned TEFC motor with fan cowl and terminal box on a drip-rim baseplate. Material controls: pump casing, motor paint, baseplate and guard, flanges and bolts; weathered, highVisibility and stainless presets.',
  tags: ['industrial plant', 'factory', 'process equipment', 'pump', 'centrifugal', 'end suction', 'volute', 'motor', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const casing = param('casing', '#2f5f8f', { label: 'Pump casing and bearing frame' });
const motor = param('motor', '#3b6e4f', { label: 'Motor paint' });
const base = param('base', '#e2a93a', { label: 'Baseplate and coupling guard' });
const metal = param('metal', '#a7adb0', { label: 'Flanges, shaft and bolts' });

presets({
  weathered: { casing: '#3c5466', motor: '#4a5a4c', base: '#9e722f', metal: '#7d7a72' },
  highVisibility: { base: '#f5c640' },
  stainless: { casing: '#c3c8cb', metal: '#dfe2e3', motor: '#2f3a44' },
});

const p = assembly('centrifugal-pump');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned parts with the axis along +X.
const alongX = (shape) => shape.rotateY(90);
// Bolted flange: a disc with a ring of bolt heads, axis along Z from z0.
const flange = (name, r, z0, t, place) => {
  add(`${name}`, place(ring(r * 0.55, r, z0, z0 + t)).color(metal));
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    add(`${name}-bolt-${i}`, place(rod(11, z0 + t, z0 + t + 14).translate(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, 0)).color(metal));
  }
};

const ax = 470; // shaft centreline height

// ---- Baseplate: fabricated deck with a raised drip rim and grout holes ----
add('baseplate', prismX([[-330, 0], [330, 0], [330, 110], [310, 110], [300, 90], [-300, 90], [-310, 110], [-330, 110]], -820, 900).color(base));
for (const x of [-820, 880]) add(`base-end-${x}`, blk(x, -330, 0, x + 20, 330, 110).color(base));
add('drain-boss', alongX(rod(22, 900, 940)).translate(0, 200, 60).color(metal));
for (const x of [-700, -100, 500]) for (const y of [-260, 260]) add(`anchor-${x}-${y}`, rod(20, 90, 115).translate(x, y, 0).color(metal));

// ---- Motor: finned frame, end bells, fan cowl, feet and terminal box ----
const m0 = -800, m1 = -230;
for (const x of [m0 + 110, m1 - 110]) add(`motor-foot-${x}`, blk(x - 60, -190, 90, x + 60, 190, 230).color(motor));
add('motor-frame', alongX(turned([[0, m0 + 90], [170, m0 + 90], [190, m0 + 120], [190, m1 - 40], [165, m1], [0, m1]])).translate(0, 0, ax).color(motor));
for (let i = 0; i < 9; i++) add(`motor-fin-${i}`, alongX(ring(188, 205, m0 + 140 + i * 42, m0 + 152 + i * 42)).translate(0, 0, ax).color(motor));
add('fan-cowl', alongX(turned([[0, m0 - 60], [140, m0 - 60], [185, m0 - 10], [185, m0 + 90], [0, m0 + 90]])).translate(0, 0, ax).color(motor));
for (let i = 0; i < 6; i++) add(`cowl-slot-${i}`, blk(m0 - 64, -10, -110, m0 - 58, 10, 110).rotateX(30 * i).translate(0, 0, ax).color('#1d2124'));
add('terminal-box', blk(-560, -110, ax + 180, -400, 110, ax + 300).color(motor));
add('terminal-lid', blk(-570, -120, ax + 300, -390, 120, ax + 315).color(motor));
add('cable-gland', rod(22, 0, 50).rotateX(90).translate(-480, -110, ax + 240).color(metal));
add('lifting-eye', ring(20, 40, -8, 8).rotateX(90).translate(-520, 0, ax + 230).color(metal));

// ---- Coupling under a half-round guard ----
add('motor-shaft', alongX(rod(30, m1, -40)).translate(0, 0, ax).color(metal));
add('coupling-hub-a', alongX(rod(70, -170, -110)).translate(0, 0, ax).color(metal));
add('coupling-hub-b', alongX(rod(70, -100, -40)).translate(0, 0, ax).color(metal));
const arc = [];
for (let i = 0; i <= 10; i++) {
  const a = (Math.PI * i) / 10;
  arc.push([Math.cos(a) * 140, ax + Math.sin(a) * 140]);
}
add('coupling-guard', prismX([[140, 90], ...arc, [-140, 90]], -230, 20).color(base));

// ---- Bearing frame: ribbed housing with a support foot and constant-level oiler ----
add('bearing-frame', alongX(turned([[0, 20], [110, 20], [125, 60], [125, 300], [150, 340], [0, 340]])).translate(0, 0, ax).color(casing));
for (const x of [80, 160, 240]) add(`frame-rib-${x}`, blk(x - 10, -15, ax - 150, x + 10, 15, ax + 150).color(casing));
add('frame-foot', prismX([[-150, 90], [150, 90], [90, ax - 100], [-90, ax - 100]], 140, 300).color(casing));
add('oiler-bulb', turned([[0, 0], [30, 0], [36, 40], [24, 80], [0, 90]]).translate(200, -150, ax - 30).color('#d8e6e8'));
add('oiler-stem', rod(8, -30, 0).translate(200, -150, ax - 30).color(metal));
add('vent-plug', rod(15, 125, 155).translate(120, 0, ax).color(metal));

// ---- Casing: spiral volute between a back cover and a front suction cover ----
const v0 = 340, v1 = 520;
const spiral = [];
for (let i = 0; i <= 36; i++) {
  const a = (Math.PI * 2 * i) / 36;
  const r = 205 + 95 * (i / 36);
  spiral.push([Math.cos(a) * r, ax + Math.sin(a) * r]);
}
add('volute', prismX(spiral, v0, v1).color(casing));
add('back-cover', alongX(turned([[0, v0 - 30], [235, v0 - 30], [255, v0], [0, v0]])).translate(0, 0, ax).color(casing));
add('front-cover', alongX(turned([[0, v1], [250, v1], [200, v1 + 60], [120, v1 + 90], [0, v1 + 90]])).translate(0, 0, ax).color(casing));
for (let i = 0; i < 10; i++) {
  const a = (Math.PI * 2 * i) / 10;
  add(`casing-bolt-${i}`, alongX(rod(12, v0 - 50, v0 - 30)).translate(0, Math.cos(a) * 225, ax + Math.sin(a) * 225).color(metal));
}
add('casing-foot', prismX([[-200, 90], [200, 90], [140, ax - 200], [-140, ax - 200]], v0 + 20, v1 - 20).color(casing));

// Discharge neck rises tangentially off the spiral's widest end to a flange.
const nz0 = ax, nz1 = ax + 440;
add('discharge-neck', turned([[0, nz0], [90, nz0], [80, nz1 - 120], [70, nz1], [0, nz1]]).translate((v0 + v1) / 2, 250, 0).color(casing));
flange('discharge-flange', 130, nz1, 28, (s) => s.translate((v0 + v1) / 2, 250, 0));
add('discharge-gauge', turned([[0, 0], [40, 0], [40, 22], [0, 22]]).rotateX(90).translate((v0 + v1) / 2, 160, nz1 - 120).color('#f4f4f0'));

// Suction nozzle along +X from the eye of the front cover.
add('suction-nozzle', alongX(turned([[0, v1 + 90], [95, v1 + 90], [85, 830], [0, 830]])).translate(0, 0, ax).color(casing));
flange('suction-flange', 150, 830, 30, (s) => alongX(s).translate(0, 0, ax));
add('casing-drain', rod(16, ax - 330, ax - 290).translate((v0 + v1) / 2, 0, 0).color(metal));

return p.model();
