// SPDX-License-Identifier: CC0-1.0
// Main mine ventilation fan station on the surface at the top of an upcast
// shaft. What makes it one: a big horizontal axial fan casing with flanges and
// stiffening rings, fed through a square inlet box from a duct that rises out
// of the concrete shaft collar; an evase (expanding diffuser) cone after the
// fan that bends up into a tall vertical discharge stack; the drive motor
// outside on its own pedestal with a coupling guard; isolation dampers with
// actuators so a standby fan can take over; and an electrical house with the
// variable-speed drive beside it.
// Millimetres, Z up, fan axis along X, discharge stack at -X, shaft at +Y.
meta({
  name: "mine-ventilation-fan",
  license: 'CC0-1.0',
  title: "Mine ventilation fan station",
  description: "Surface main ventilation fan station at about real size: 3 m axial fan casing with flanges and stiffening rings, square inlet box with isolation damper and actuator, inlet duct rising out of a concrete upcast shaft collar, evase diffuser bending into a vertical discharge stack with a flared mouth, in-line drive motor on a pedestal with coupling guard and shaft, cable tray to an electrical house with VSD, door and air-conditioner. Material controls: fan and duct coating, structural steel, shaft-collar concrete, E-house cladding, plus a fan arrangement choice (single, twin duty/standby). weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'underground', 'ventilation', 'main fan', 'axial fan', 'upcast shaft', 'evase', 'mine services'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 6600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3f8a5a', { label: 'Fan and duct coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Structural steel' });
const concrete = param('concrete', '#a19d94', { label: 'Shaft collar concrete' });
const cladding = param('cladding', '#d9d4c7', { label: 'E-house cladding' });
const arrangement = param('arrangement', 'single', { choices: ['single', 'twin'], label: 'Fan arrangement' });
presets({
  weathered: { coatedSteel: '#61705f', structuralSteel: '#666a66', concrete: '#8b8579', cladding: '#b4aea0' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', concrete: '#b3afa6', cladding: '#f0ede4' },
  greyPlant: { coatedSteel: '#b9bec0', structuralSteel: '#2f5a8a', concrete: '#a8a49b', cladding: '#2f5a8a' },
});

const p = assembly("mine-ventilation-fan");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const dark = '#1e2123', warn = '#e8c21e';
const Zc = 2400; // fan axis height
const Rf = 1500; // fan casing radius
const twin = arrangement.value === 'twin';
const trains = twin ? [-2600, 2600] : [0];
const yMin = Math.min(...trains), yMax = Math.max(...trains);

// ---- Ground slab and upcast shaft collar (+Y) ----
add('slab', blk(-8600, yMin - 5000, 0, 7600, yMax + 8600, 150).color(concrete));
const sy0 = yMax + 4200, sy1 = yMax + 7800;
add('shaft-collar', blk(-500, sy0, 150, 4500, sy1, 2200).color(concrete));
add('collar-cap', blk(-600, sy0 - 100, 2200, 4600, sy1 + 100, 2400).color(concrete));

// ---- Inlet header: up out of the collar, across, and down into each inlet box ----
const hz0 = 4700, hz1 = 6500;
add('collar-riser', blk(1100, sy0 + 600, 2400, 2900, sy0 + 2400, hz1).color(coatedSteel));
add('inlet-header', blk(1100, yMin - 900, hz0, 2900, sy0 + 2400, hz1).color(coatedSteel));
for (const y of [yMin - 900, sy0 + 2400]) add(`header-end-flange-${y}`, blk(1050, y - 60, hz0 - 50, 2950, y + 60, hz1 + 50).color(structuralSteel));
for (let y = yMin; y < sy0 + 2000; y += 1600) add(`header-stiffener-${y}`, blk(1060, y - 40, hz0 - 40, 2940, y + 40, hz1 + 40).color(structuralSteel));
for (const [k, y] of [[0, sy0 + 1500], [1, (yMin + sy0) / 2]]) {
  add(`header-support-${k}`, blk(1700, y - 150, 150, 2300, y + 150, hz0).color(structuralSteel));
}

// ---- One fan train per entry in `trains` ----
for (const [t, y] of trains.entries()) {
  // Inlet box with damper section and actuator.
  add(`inlet-box-${t}`, blk(1100, y - 1700, 600, 2900, y + 1700, hz0).color(coatedSteel));
  add(`damper-frame-${t}`, blk(1050, y - 1750, hz0 - 700, 2950, y + 1750, hz0 - 200).color(structuralSteel));
  add(`damper-actuator-${t}`, blk(1300, y - 2150, hz0 - 650, 1900, y - 1750, hz0 - 250).color(warn));
  add(`inlet-box-base-${t}`, blk(1100, y - 1500, 150, 2900, y + 1500, 600).color(structuralSteel));
  // Fan casing with flanges and stiffening rings.
  add(`fan-casing-${t}`, latheX([[Rf, -1200], [Rf, 1100]], y, Zc, 24).color(coatedSteel));
  for (const x of [-1200, -400, 400, 1100]) add(`casing-ring-${t}-${x}`, latheX([[Rf + 110, x - 60], [Rf + 110, x + 60]], y, Zc, 24).color(coatedSteel));
  add(`casing-saddle-${t}`, blk(-900, y - 1300, 150, 700, y + 1300, Zc - Rf + 300).color(structuralSteel));
  add(`inspection-door-${t}`, blk(-250, y - Rf - 70, Zc - 400, 450, y - Rf + 60, Zc + 400).color(structuralSteel));
  add(`door-handle-${t}`, blk(250, y - Rf - 140, Zc - 120, 330, y - Rf - 70, Zc + 120).color(dark));
  // Evase cone, a four-piece bend and the vertical discharge stack with a flared mouth.
  add(`evase-${t}`, latheX([[1950, -3600], [Rf, -1200]], y, Zc, 24).color(coatedSteel));
  const Rb = 2400, rs = 2000, xb = -3600, steps = 4;
  for (let s = 0; s < steps; s++) {
    const a0 = (Math.PI / 2) * (s / steps), a1 = (Math.PI / 2) * ((s + 1) / steps);
    const pt = (a) => [xb - Rb * Math.sin(a), y, Zc + Rb - Rb * Math.cos(a)];
    add(`bend-${t}-${s}`, tube(pt(a0), pt(a1), rs, 24).color(coatedSteel));
    add(`bend-flange-${t}-${s}`, tube(pt(a1), pt(a1 + 0.02), rs + 90, 24).color(structuralSteel));
  }
  const sx = xb - Rb, sTop = 9800;
  add(`discharge-stack-${t}`, rod(rs, Zc + Rb, sTop, 24).translate(sx, y, 0).color(coatedSteel));
  add(`stack-mouth-${t}`, lathe([[rs, sTop], [rs + 450, sTop + 600]], 24).subtract(lathe([[rs - 80, sTop - 10], [rs + 370, sTop + 610]], 24)).translate(sx, y, 0).color(coatedSteel));
  add(`stack-throat-${t}`, rod(rs - 60, sTop, sTop + 20, 24).translate(sx, y, 0).color(dark));
  for (const z of [6000, 8000]) add(`stack-ring-${t}-${z}`, rod(rs + 90, z - 60, z + 60, 24).translate(sx, y, 0).color(structuralSteel));
  add(`stack-plinth-${t}`, blk(sx - 1400, y - 1400, 150, sx + 1400, y + 1400, 2000).color(concrete));
  for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    add(`stack-stay-${t}-${dx}-${dy}`, tube([sx + dx * 2300, y + dy * 2300, 150], [sx + dx * 1300, y + dy * 1300, 8000], 45, 6).color(structuralSteel));
  }
  // Drive: shaft through the inlet box to a motor on its own pedestal.
  add(`drive-shaft-${t}`, latheX([[140, 1100], [140, 3700]], y, Zc, 10).color('#b5c0c0'));
  add(`coupling-guard-${t}`, latheX([[380, 3200], [380, 3800]], y, Zc, 12).color(warn));
  add(`motor-${t}`, latheX([[850, 3900], [950, 4050], [950, 5800], [800, 5950]], y, Zc, 20).color(structuralSteel));
  for (let x = 4150; x < 5700; x += 220) add(`motor-fin-${t}-${x}`, latheX([[1010, x], [1010, x + 60]], y, Zc, 20).color(structuralSteel));
  add(`motor-fan-cowl-${t}`, latheX([[760, 5950], [850, 6200]], y, Zc, 16).color(dark));
  add(`motor-terminal-box-${t}`, blk(4500, y - 1350, Zc - 200, 5200, y - 900, Zc + 400).color(structuralSteel));
  add(`motor-pedestal-${t}`, blk(3800, y - 1100, 150, 6200, y + 1100, Zc - 800).color(concrete));
}

// ---- Electrical house with VSD, cable tray to the motors ----
const ey0 = yMin - 4200, ey1 = ey0 + 2400;
add('e-house', blk(3800, ey0 - 400, 400, 7400, ey1 - 400, 3400).color(cladding));
add('e-house-roof', blk(3700, ey0 - 500, 3400, 7500, ey1 - 300, 3550).color(structuralSteel));
add('e-house-skid', blk(3700, ey0 - 500, 150, 7500, ey1 - 300, 400).color(structuralSteel));
add('e-house-door', blk(4300, ey0 - 430, 400, 5200, ey0 - 400, 2500).color(structuralSteel));
add('e-house-aircon', blk(6000, ey0 - 700, 1600, 7000, ey0 - 400, 2400).color(cladding));
add('aircon-grille', rod(300, 0, 20, 12).rotateX(90).translate(6500, ey0 - 700, 2000).color(dark));
add('cable-tray', blk(5100, ey1 - 400, 3000, 5500, yMax - 900, 3080).color(structuralSteel));
for (const y of trains) add(`cable-drop-${y}`, blk(5150, y - 1000, Zc + 400, 5450, y - 900, 3000).color(dark));

return p.model();
