// SPDX-License-Identifier: CC0-1.0
// Wet drum magnetic separator (LIMS), the machine that pulls magnetite out
// of a slurry in an iron-ore or coal-washing plant. What makes it one: a
// long horizontal stainless drum, about 1.2 m across, turning half-sunk in
// a U-shaped tank of slurry. A fixed magnet arc inside the drum holds the
// magnetic particles to the shell and carries them up and over into a
// concentrate launder on one side, washed off by a spray pipe along the
// top, while the non-magnetic tails leave through spigots under the tank.
// Slurry arrives in a feed box on the other side, the drum is driven by a
// geared motor at one end, and a lever on the shaft end sets the angle of
// the magnet arc. The tank sits on a steel frame with bearing pedestals.
// Millimetres, Z up, drum axis along Y, concentrate side towards -X.
meta({
  name: "magnetic-separator-drum",
  license: 'CC0-1.0',
  title: "Wet magnetic separator",
  description: "Wet drum low-intensity magnetic separator at about real size: 1200 mm stainless drum on a through shaft in a U-shaped slurry tank, slurry level in the tank, end flanges, bearing pedestals on a legged steel frame, geared drive motor at one end, magnet-arc adjustment lever with quadrant at the other, feed box with feed pipe, wash-water spray pipe over the drum, concentrate launder with outlet pipe, tails spigots with pinch valves under the tank, and an access platform with handrail. Material controls: tank paint, drum stainless, frame steel and slurry, plus a stage choice (single drum or two drums in series). weathered, plantBlue and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'magnetic separation', 'LIMS', 'magnetite', 'iron ore', 'wet drum separator'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tankPaint = param('tankPaint', '#3f8f7f', { label: 'Tank paint' });
const drumStainless = param('drumStainless', '#c3cbcc', { label: 'Drum stainless' });
const frameSteel = param('frameSteel', '#4b5459', { label: 'Frame steel' });
const slurry = param('slurry', '#3b3833', { label: 'Slurry' });
const stages = param('stages', 'single', { choices: ['single', 'double'], label: 'Drum stages' });
presets({
  weathered: { tankPaint: '#5f6d66', drumStainless: '#a1a7a4', frameSteel: '#5f625f', slurry: '#4a443c' },
  plantBlue: { tankPaint: '#2f5f9e', drumStainless: '#cfd5d6', frameSteel: '#3b4246', slurry: '#2f2d2a' },
  highVisibility: { tankPaint: '#e48a1e', drumStainless: '#d0d6d6', frameSteel: '#465159', slurry: '#3b3833' },
});

const p = assembly("magnetic-separator-drum");
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
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// (x, z) outline extruded along Y from y0 to y1.
const profileXZ = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});

const water = '#7fa6b8', rubber = '#25292b', rail = '#e8c21e';
const L = 1200; // half drum length
const ZC = 1700; // drum axis height
const R = 600;

const unit = (k, dx) => {
  const n = (s) => `${s}-${k}`;
  // U-shaped tank, wall 80 mm, concentric with the drum.
  const outer = arc(dx, ZC, 780, 180, 360, 8);
  const inner = arc(dx, ZC, 700, 360, 180, 8);
  add(n('tank'), profileXZ([[dx - 780, ZC + 250], ...outer, [dx + 780, ZC + 250], [dx + 700, ZC + 250], ...inner, [dx - 700, ZC + 250]], -L - 80, L + 80).color(tankPaint));
  for (const [j, y] of [-L - 80, L].entries()) {
    add(n(`tank-end-${j}`), profileXZ([[dx - 780, ZC + 250], ...arc(dx, ZC, 780, 180, 360, 8), [dx + 780, ZC + 250]], y, y + 80).color(tankPaint));
  }
  add(n('slurry'), profileXZ([[dx - 700, ZC - 40], ...arc(dx, ZC, 700, 183, 357, 6), [dx + 700, ZC - 40]], -L, L).color(slurry));
  add(n('drum'), cylY(R, -L + 40, L - 40, dx, ZC, 20).color(drumStainless));
  for (const [j, s] of [-1, 1].entries()) {
    add(n(`drum-flange-${j}`), cylY(R + 30, s > 0 ? L - 40 : -L + 10, s > 0 ? L - 10 : -L + 40, dx, ZC, 20).color(frameSteel));
    add(n(`bearing-${j}`), blk(dx - 160, s * 1500 - 120, ZC - 250, dx + 160, s * 1500 + 120, ZC + 120).color(frameSteel));
  }
  add(n('shaft'), cylY(90, -1750, 1700, dx, ZC, 10).color(frameSteel));
  // Drive at -Y: gearbox on a bracket with the motor alongside.
  add(n('gearbox'), blk(dx - 300, -2050, ZC - 300, dx + 300, -1750, ZC + 300).color(tankPaint));
  add(n('drive-motor'), cylY(220, -2600, -2050, dx, ZC, 12).color(tankPaint));
  add(n('motor-fan-cowl'), cylY(230, -2700, -2600, dx, ZC, 12).color(frameSteel));
  add(n('drive-bracket'), blk(dx - 350, -2650, ZC - 600, dx + 350, -1750, ZC - 300).color(frameSteel));
  // Magnet-arc adjustment lever and quadrant at +Y.
  add(n('quadrant'), profileXZ([[dx, ZC], ...arc(dx, ZC, 520, 60, 120, 4)], 1720, 1750).color(frameSteel));
  add(n('adjust-lever'), blk(dx - 40, 1750, ZC, dx + 40, 1790, ZC + 600).color(rail));
  // Feed box on +X, concentrate launder on -X.
  add(n('feed-box'), blk(dx + 780, -L, ZC - 200, dx + 1250, L, ZC + 350).color(tankPaint));
  add(n('feed-pulp'), blk(dx + 800, -L + 20, ZC + 250, dx + 1230, L - 20, ZC + 320).color(slurry));
  add(n('feed-pipe'), rod(130, ZC + 350, ZC + 1300, 10).translate(dx + 1015, 0, 0).color(frameSteel));
  add(n('feed-pipe-elbow'), cylY(130, -150, 600, dx + 1015, ZC + 1300, 10).color(frameSteel));
  add(n('launder'), profileXZ([[dx - 1350, ZC + 300], [dx - 1350, ZC - 150], [dx - 800, ZC - 150], [dx - 780, ZC + 260], [dx - 860, ZC + 260], [dx - 880, ZC - 80], [dx - 1270, ZC - 80], [dx - 1270, ZC + 300]], -L, L).color(tankPaint));
  add(n('concentrate'), blk(dx - 1260, -L + 20, ZC - 80, dx - 890, L - 20, ZC - 20).color('#2a2a2c'));
  add(n('launder-outlet'), rod(110, 300, ZC - 150, 10).translate(dx - 1075, -L + 250, 0).color(rubber));
  add(n('spray-pipe'), cylY(45, -L - 200, L, dx - 150, ZC + R + 130, 8).color(frameSteel));
  for (let i = 0; i < 6; i++) {
    add(n(`spray-nozzle-${i}`), rod(22, ZC + R + 40, ZC + R + 110, 6).translate(dx - 150, -L + 200 + i * 400, 0).color(drumStainless));
  }
  add(n('wash-header'), rod(45, ZC + R + 130, ZC + R + 700, 8).translate(dx - 150, -L - 200, 0).color(water));
  // Tails spigots with pinch valves under the tank.
  for (const [j, y] of [-600, 600].entries()) {
    add(n(`tails-spigot-${j}`), rod(100, 300, ZC - 760, 10).translate(dx, y, 0).color(rubber));
    add(n(`pinch-valve-${j}`), blk(dx - 150, y - 150, 500, dx + 150, y + 150, 700).color(frameSteel));
  }
  // Frame: four legs, longitudinal rails and cross beams.
  for (const [j, [x, y]] of [[-860, -1500], [860, -1500], [-860, 1500], [860, 1500]].entries()) {
    add(n(`leg-${j}`), blk(dx + x - 80, y - 80, 0, dx + x + 80, y + 80, ZC - 250).color(frameSteel));
    add(n(`foot-${j}`), blk(dx + x - 150, y - 150, 0, dx + x + 150, y + 150, 25).color(frameSteel));
  }
  for (const [j, s] of [-1, 1].entries()) {
    add(n(`rail-${j}`), blk(dx + s * 860 - 80, -1580, ZC - 450, dx + s * 860 + 80, 1580, ZC - 250).color(frameSteel));
    add(n(`crossbeam-${j}`), blk(dx - 940, s * 1500 - 80, ZC - 450, dx + 940, s * 1500 + 80, ZC - 250).color(frameSteel));
  }
};

const double = stages.value === 'double';
unit(0, 0);
if (double) {
  unit(1, 2900);
  // Tails of stage one feed stage two.
  add('transfer-pipe', cylY(110, -900, 900, 1450, 450, 10).color(rubber));
  add('transfer-riser', rod(110, 450, ZC + 1300, 10).translate(1450, 900, 0).color(rubber));
} else {
  // Access platform on the feed side.
  add('platform', blk(1350, -1600, 1150, 2400, 1600, 1200).color(frameSteel));
  for (const [j, [x, y]] of [[2350, -1550], [2350, 1550]].entries()) {
    add(`platform-leg-${j}`, blk(x - 50, y - 50, 0, x + 50, y + 50, 1150).color(frameSteel));
  }
  add('handrail', blk(2350, -1600, 2200, 2400, 1600, 2250).color(rail));
  add('midrail', blk(2350, -1600, 1700, 2400, 1600, 1740).color(rail));
  for (let i = 0; i < 4; i++) add(`stanchion-${i}`, blk(2350, -1550 + i * 1030, 1200, 2400, -1500 + i * 1030, 2250).color(rail));
  add('ladder', blk(2400, -1500, 0, 2440, -1100, 1200).color(rail));
}

return p.model();
