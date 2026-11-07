// SPDX-License-Identifier: CC0-1.0
// Open-channel UV disinfection system, the last barrier before treated
// effluent leaves a works. What makes it one: a concrete channel with water
// flowing through two banks of lamp modules - rows of vertical stainless
// modules standing side by side across the flow, their quartz-sleeved lamps
// horizontal and submerged, only the module tops and ballast heads showing
// above the water; a bank rail and cable tray feeding them from power
// distribution cabinets on the deck; a downstream motorised flap gate holding
// the water level over the lamps; and one module lifted out onto a service
// rack so the glowing lamps and wiper rings can be seen.
// Millimetres, Z up, flow towards +X, channel centred on y = 0.
meta({
  name: "uv-disinfection-channel",
  license: 'CC0-1.0',
  title: "UV disinfection channel",
  description: "Open-channel UV disinfection system at about real size: a 1.2 m concrete channel with flowing effluent, two banks of eight vertical lamp modules with ballast heads above the water on a bank rail, cable trays to two power distribution cabinets on the deck, a downstream motorised flap gate for level control, a level sensor, handrail and a service rack holding two lifted modules with glowing quartz-sleeved lamps and wiper rings. Material controls: concrete, stainless modules and frame, cabinet coating, effluent; weathered, highVisibility and greyCabinet presets.",
  tags: ['water treatment', 'wastewater', 'disinfection', 'UV', 'ultraviolet', 'lamp module', 'effluent channel'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#c0c8c9', { label: 'Stainless modules and frame' });
const cabinet = param('cabinet', '#2f5f8a', { label: 'Cabinet coating' });
const water = param('water', '#4f8288', { label: 'Treated effluent' });
presets({
  weathered: { concrete: '#9b9587', stainlessSteel: '#9ca7a6', cabinet: '#5a6a72', water: '#5b746b' },
  highVisibility: { concrete: '#c6bdac', stainlessSteel: '#e1ddd0', cabinet: '#e5682d', water: '#3d8396' },
  greyCabinet: { concrete: '#b3ad9f', stainlessSteel: '#cdd3d2', cabinet: '#9aa3a6', water: '#4a7c7c' },
});

const p = assembly("uv-disinfection-channel");
// Lifted so the lowest point (below-grade slab or water line) sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 300).scale(scale));

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
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const HW = 600, WT = 300, D = 1800, WL = 1250; // channel half width, wall, deck, water level
const glow = '#b6a8ff', dark = '#202426', cableTray = '#8d9496';

// ---- Concrete channel, deck and water ----
add('channel-floor', blk(-4200, -HW - WT, -300, 4200, HW + WT, 0).color(concrete));
for (const s of [-1, 1]) {
  add(`channel-wall-${s}`, blk(-4200, s > 0 ? HW : -HW - WT, 0, 4200, s > 0 ? HW + WT : -HW, D).color(concrete));
  add(`deck-${s}`, blk(-4200, s > 0 ? HW + WT : -HW - WT - 2200, D - 250, 4200, s > 0 ? HW + WT + 1800 : -HW - WT, D).color(concrete));
}
add('water-upstream', blk(-4200, -HW, 0, 3150, HW, WL).color(water));
add('water-downstream', blk(3350, -HW, 0, 4200, HW, 700).color(water));

// ---- Lamp banks: eight vertical modules across the flow ----
const module = (tag, x0, x1, y, zBase, lamps) => {
  for (const x of [x0, x1]) add(`${tag}-leg-${x}`, blk(x - 25, y - 25, zBase, x + 25, y + 25, zBase + 1550).color(stainlessSteel));
  add(`${tag}-head`, blk(x0 - 60, y - 55, zBase + 1450, x1 + 60, y + 55, zBase + 1650).color(stainlessSteel));
  add(`${tag}-ballast-cap`, blk(x0 + 80, y - 45, zBase + 1650, x0 + 380, y + 45, zBase + 1720).color(dark));
  if (!lamps) return;
  for (let k = 0; k < 6; k++) {
    const z = zBase + 180 + k * 200;
    add(`${tag}-lamp-${k}`, latheX([[42, x0 + 30], [42, x1 - 30]], y, z, 8).color(glow));
    add(`${tag}-wiper-${k}`, latheX([[58, x0 + 300 + k * 90], [58, x0 + 360 + k * 90]], y, z, 8).color(dark));
  }
  add(`${tag}-wiper-rod`, latheX([[18, x0 + 30], [18, x1 - 30]], y, zBase + 1300, 6).color(stainlessSteel));
};
const banks = [[-2600, -1000], [-200, 1400]];
banks.forEach(([x0, x1], b) => {
  for (let i = 0; i < 8; i++) {
    const y = -HW + 75 + i * ((2 * HW - 150) / 7);
    module(`bank-${b}-module-${i}`, x0, x1, y, 0, false);
  }
  for (const x of [x0 - 120, x1 + 120]) add(`bank-${b}-rail-${x}`, blk(x - 50, -HW - WT, D - 120, x + 50, HW + WT, D).color(stainlessSteel));
  add(`bank-${b}-cable-drop`, tube([(x0 + x1) / 2, HW + 600, D + 900], [(x0 + x1) / 2, HW - 80, 1700], 40, 6).color(dark));
});

// ---- Power distribution cabinets and cable tray on the +Y deck ----
for (const [k, x] of [-1800, 600].entries()) {
  const y0 = HW + WT + 500;
  add(`pdc-${k}`, blk(x - 600, y0, D, x + 600, y0 + 700, D + 2000).color(cabinet));
  add(`pdc-plinth-${k}`, blk(x - 640, y0 - 40, D, x + 640, y0 + 740, D + 100).color(dark));
  add(`pdc-door-seam-${k}`, blk(x - 5, y0 - 12, D + 150, x + 5, y0, D + 1900).color(dark));
  add(`pdc-hood-${k}`, blk(x - 660, y0 - 60, D + 2000, x + 660, y0 + 760, D + 2060).color(cabinet));
  add(`pdc-hmi-${k}`, blk(x - 450, y0 - 15, D + 1300, x - 150, y0, D + 1550).color('#7fc4d6'));
  add(`pdc-beacon-${k}`, rod(60, D + 2060, D + 2200, 8).translate(x + 450, y0 + 350, 0).color('#e0a43a'));
}
add('cable-tray', blk(-2900, HW + 520, D + 850, 1500, HW + 700, D + 950).color(cableTray));
for (const x of [-2600, -200, 1300]) add(`cable-tray-post-${x}`, blk(x - 30, HW + 580, D, x + 30, HW + 640, D + 850).color(cableTray));

// ---- Downstream motorised flap gate and level sensor ----
add('flap-gate', blk(-40, -HW + 10, 0, 40, HW - 10, 1450).rotateY(28).translate(3200, 0, 0).color(stainlessSteel));
add('flap-gate-hinge', latheY([[70, -HW], [70, HW]], 3200, 80, 10).color(dark));
add('gate-actuator', blk(3050, -HW - WT - 700, D, 3550, -HW - WT - 150, D + 700).color(cabinet));
add('gate-actuator-shaft', latheY([[45, -HW - WT - 150], [45, -HW + 50]], 3300, D + 300, 8).color(dark));
add('gate-link', tube([3300, -HW + 30, D + 300], [3200 + 1450 * Math.sin((28 * Math.PI) / 180), -HW + 30, 1450 * Math.cos((28 * Math.PI) / 180)], 30, 6).color(stainlessSteel));
add('level-sensor-arm', blk(2300, -HW - WT - 200, D + 900, 2400, -HW + 250, D + 980).color(stainlessSteel));
add('level-sensor-post', blk(2300, -HW - WT - 250, D, 2400, -HW - WT - 150, D + 980).color(stainlessSteel));
add('level-sensor-head', rod(90, D + 650, D + 900, 10).translate(2350, -HW + 180, 0).color(dark));

// ---- Service rack on the -Y deck with two modules lifted out ----
{
  const y0 = -HW - WT - 900, x0 = -3700, x1 = -2100;
  add('service-rack-base', blk(x0 - 200, y0 - 500, D, x1 + 200, y0 + 500, D + 120).color(cabinet));
  for (const x of [x0 - 150, x1 + 150]) add(`service-rack-upright-${x}`, blk(x - 40, y0 - 40, D + 120, x + 40, y0 + 40, D + 1900).color(cabinet));
  add('service-rack-top', blk(x0 - 190, y0 - 40, D + 1900, x1 + 190, y0 + 40, D + 1980).color(cabinet));
  module('lifted-module-a', x0, x1, y0 - 160, D + 120, true);
  module('lifted-module-b', x0, x1, y0 + 160, D + 120, true);
}

// ---- Handrail along the -Y deck edge ----
for (const [k, x] of [-4100, -1500, 300, 2000, 3900].entries()) add(`rail-post-${k}`, rod(28, D, D + 1100, 6).translate(x, -HW - WT - 60, 0).color(stainlessSteel));
for (const z of [D + 550, D + 1100]) add(`rail-${z}`, tube([-4100, -HW - WT - 60, z], [3900, -HW - WT - 60, z], 24, 6).color(stainlessSteel));

return p.model();
