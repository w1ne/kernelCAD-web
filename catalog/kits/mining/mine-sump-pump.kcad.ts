// SPDX-License-Identifier: CC0-1.0
// Mine sump pump station, the low point where an underground mine collects
// its groundwater and drill water and lifts it out. What makes it one: a
// concrete-lined pit cut into the drive floor, full of muddy mine water,
// with a pump over it and a steel discharge column climbing away. The
// fixed version is a vertical spindle pump: a motor standing on a stool on
// a baseplate across two steel beams, the column pipe dropping into the
// water to the pump bowl, and a discharge leg with check valve and gate
// valve feeding a riser. The portable version is a submersible pump hung
// on a chain from an A-frame with a lay-flat hose over the pit lip. A
// starter panel, float switch and handrail finish the station.
// Millimetres, Z up, pit centred on the origin, discharge towards +X.
meta({
  name: "mine-sump-pump",
  license: 'CC0-1.0',
  title: "Mine sump pump",
  description: "Underground sump pump station at about real size: drive floor with a concrete-lined 2.4 m sump pit holding mine water, handrail with toe boards round the pit, starter panel on a stand with door, lamps and isolator, float switch, and a choice of pump. Vertical spindle pump: motor with fan cowl and terminal box on a motor stool, baseplate on two steel beams, column pipe to a pump bowl and strainer in the water, discharge leg with check valve, gate valve and handwheel, flanged riser with support post. Submersible pump: pump with motor cap and lifting handle hung on a chain from an A-frame, lay-flat discharge hose over the pit lip. Material controls: pump paint, pipe steel, concrete and mine water. weathered, mineGreen and highVisibility presets.",
  tags: ['mining', 'underground', 'dewatering', 'sump pump', 'vertical spindle pump', 'submersible pump', 'mine water'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pumpPaint = param('pumpPaint', '#c8452e', { label: 'Pump paint' });
const pipeSteel = param('pipeSteel', '#5b6469', { label: 'Pipe steel' });
const concrete = param('concrete', '#9f9a90', { label: 'Concrete' });
const mineWater = param('mineWater', '#5a5d4a', { label: 'Mine water' });
const pumpType = param('pumpType', 'verticalSpindle', { choices: ['verticalSpindle', 'submersible'], label: 'Pump type' });
presets({
  weathered: { pumpPaint: '#7f5a48', pipeSteel: '#6a625a', concrete: '#85807a', mineWater: '#4e4a3c' },
  mineGreen: { pumpPaint: '#3f7a4a', pipeSteel: '#4b5459', concrete: '#a8a398', mineWater: '#4f5a50' },
  highVisibility: { pumpPaint: '#f08a1c', pipeSteel: '#465159', concrete: '#b8b3a8', mineWater: '#5f6a5c' },
});

const p = assembly("mine-sump-pump");
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
// Round bar along X from x0 to x1, centred on (y, z).
const cylX = (r, x0, x1, y, z, n = 12) => rod(r, x0, x1, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const rail = '#e8c21e', black = '#1c1f21', hose = '#2f63a8', panel = '#c9ccc8';
const spindle = pumpType.value === 'verticalSpindle';
const P = 1200; // pit half width
const ZF = 1200; // drive floor level
const ZW = 760; // water level

// ---- Drive floor and sump pit ----
add('floor-left', blk(-1700, -1700, 0, -P, 1700, ZF).color(concrete));
add('floor-right', blk(P, -1700, 0, 3800, 1700, ZF).color(concrete));
add('floor-front', blk(-P, -1700, 0, P, -P, ZF).color(concrete));
add('floor-back', blk(-P, P, 0, P, 1700, ZF).color(concrete));
add('pit-floor', blk(-P, -P, 0, P, P, 100).color(concrete));
add('mine-water', blk(-P, -P, 100, P, P, ZW).color(mineWater));
for (const [k, s] of [-1, 1].entries()) add(`curb-${k}`, blk(-P - 120, s * (P + 60) - 60, ZF, P + 120, s * (P + 60) + 60, ZF + 100).color(rail));

// ---- Handrail round the pit, open on the +X service side ----
const posts = [[-P - 60, -P - 60], [0, -P - 60], [P + 60, -P - 60], [-P - 60, 0], [-P - 60, P + 60], [0, P + 60], [P + 60, P + 60]];
for (const [k, [x, y]] of posts.entries()) add(`rail-post-${k}`, rod(25, ZF, ZF + 1100, 6).translate(x, y, 0).color(rail));
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, z] of [ZF + 1100, ZF + 550].entries()) add(`rail-${k}-${j}`, cylX(22, -P - 60, P + 60, s * (P + 60), z, 6).color(rail));
}
for (const [j, z] of [ZF + 1100, ZF + 550].entries()) add(`rail-end-${j}`, tube([-P - 60, -P - 60, z], [-P - 60, P + 60, z], 22, 6).color(rail));

if (spindle) {
  // Two beams across the pit carry the baseplate.
  for (const [k, x] of [-450, 450].entries()) add(`support-beam-${k}`, blk(x - 100, -P - 300, ZF, x + 100, P + 300, ZF + 250).color(pipeSteel));
  add('baseplate', blk(-600, -600, ZF + 250, 600, 600, ZF + 300).color(pipeSteel));
  add('column-pipe', rod(150, 450, ZF + 250, 10).color(pipeSteel));
  add('pump-bowl', lathe([[260, 280], [380, 380], [380, 520], [200, 640]], 12).color(pumpPaint));
  add('strainer', rod(180, 120, 280, 10).color(black));
  add('motor-stool', lathe([[380, ZF + 300], [300, ZF + 700]], 8).color(pumpPaint));
  add('motor', rod(330, ZF + 700, ZF + 1450, 14).color(pumpPaint));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    add(`motor-fin-${i}`, blk(-20, -20, ZF + 760, 20, 20, ZF + 1400).translate(355 * Math.cos(a), 355 * Math.sin(a), 0).color(pumpPaint));
  }
  add('fan-cowl', lathe([[340, ZF + 1450], [300, ZF + 1620], [120, ZF + 1660]], 14).color(pipeSteel));
  add('terminal-box', blk(-560, -160, ZF + 900, -330, 160, ZF + 1150).color(pumpPaint));
  // Discharge leg: head elbow, check valve, gate valve, riser.
  const DZ = ZF + 550;
  add('discharge-head', blk(150, -180, ZF + 300, 450, 180, ZF + 700).color(pumpPaint));
  add('discharge-pipe', cylX(120, 450, 2900, 0, DZ, 10).color(pipeSteel));
  add('check-valve', blk(1100, -220, DZ - 220, 1500, 220, DZ + 260).color(pumpPaint));
  add('gate-valve', blk(1900, -200, DZ - 200, 2100, 200, DZ + 200).color(pumpPaint));
  add('gate-bonnet', rod(60, DZ + 200, DZ + 600, 6).translate(2000, 0, 0).color(pipeSteel));
  add('handwheel', torus(170, 22, 10).translate(2000, 0, DZ + 620).color(black));
  for (const [k, x] of [800, 1700, 2400].entries()) add(`flange-${k}`, cylX(190, x - 20, x + 20, 0, DZ, 10).color(pipeSteel));
  add('riser-elbow', blk(2780, -170, DZ - 170, 3120, 170, DZ + 170).color(pipeSteel));
  add('riser', rod(120, DZ + 170, 4600, 10).translate(2950, 0, 0).color(pipeSteel));
  for (const [k, z] of [2800, 3800].entries()) add(`riser-flange-${k}`, rod(190, z - 20, z + 20, 10).translate(2950, 0, 0).color(pipeSteel));
  add('riser-stand', blk(2850, -100, ZF, 3050, 100, DZ - 170).color(pipeSteel));
  add('motor-cable', tube([2250, -1350, ZF + 900], [-450, -200, ZF + 1000], 22, 6).color(black));
} else {
  // A-frame gantry with a chain hoist over the pit.
  const TZ = 3700;
  for (const [k, y] of [-P - 200, P + 200].entries()) {
    add(`aframe-leg-a-${k}`, tube([-1500, y, ZF], [0, y, TZ], 50, 8).color(pipeSteel));
    add(`aframe-leg-b-${k}`, tube([1500, y, ZF], [0, y, TZ], 50, 8).color(pipeSteel));
    add(`aframe-tie-${k}`, cylX(35, -800, 800, y, ZF + 1200, 6).color(pipeSteel));
  }
  add('aframe-beam', blk(-100, -P - 300, TZ, 100, P + 300, TZ + 200).color(pipeSteel));
  add('chain-hoist', blk(-150, -150, TZ - 450, 150, 150, TZ).color(pumpPaint));
  add('chain', rod(18, 1380, TZ - 450, 6).color('#6d7175'));
  add('pump-body', rod(260, 380, 1050, 14).color(pumpPaint));
  add('pump-motor-cap', lathe([[270, 1050], [270, 1250], [160, 1330]], 14).color(pumpPaint));
  add('pump-strainer', rod(240, 260, 380, 12).color(black));
  add('lifting-handle', torus(110, 20, 8).rotateX(90).translate(0, 0, 1350).color(pipeSteel));
  add('pump-outlet', cylX(90, 200, 420, 0, 1200, 8).color(pipeSteel));
  add('hose-up', tube([420, 0, 1200], [P + 100, 0, ZF + 250], 80, 8).color(hose));
  add('hose-floor', cylX(80, P + 100, 3700, 0, ZF + 80, 8).color(hose));
  add('pump-cable', tube([-150, 0, 1330], [P + 100, -400, ZF + 100], 22, 6).color(black));
  add('pump-cable-run', tube([P + 100, -400, ZF + 100], [2250, -1350, ZF + 900], 22, 6).color(black));
}

// ---- Float switch and starter panel ----
add('float-cable', rod(10, ZW - 100, ZF + 100, 4).translate(-900, 900, 0).color(black));
add('float-switch', blk(-980, 820, ZW - 120, -820, 980, ZW + 30).color(rail));
const SX = 2700, SY = -1350;
for (const [k, x] of [SX - 350, SX + 350].entries()) add(`panel-leg-${k}`, blk(x - 40, SY - 40, ZF, x + 40, SY + 40, ZF + 800).color(pipeSteel));
add('starter-panel', blk(SX - 450, SY - 150, ZF + 800, SX + 450, SY + 200, ZF + 2000).color(panel));
add('panel-roof', blk(SX - 520, SY - 260, ZF + 2000, SX + 520, SY + 250, ZF + 2060).color(pipeSteel));
add('isolator', blk(SX + 200, SY - 200, ZF + 1300, SX + 320, SY - 150, ZF + 1500).color('#d23a2a'));
add('lamp-run', rod(35, 0, 30, 8).rotateX(90).translate(SX - 250, SY - 150, ZF + 1800).color('#3fe06a'));
add('lamp-trip', rod(35, 0, 30, 8).rotateX(90).translate(SX - 100, SY - 150, ZF + 1800).color('#ff3b2a'));

return p.model();
