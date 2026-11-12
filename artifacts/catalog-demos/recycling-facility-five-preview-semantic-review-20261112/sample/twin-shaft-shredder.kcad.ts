// SPDX-License-Identifier: CC0-1.0
// Low-speed twin-shaft shear shredder, the primary size-reduction machine at
// the head of a MRF or waste-wood line. What makes it one: two parallel hex
// shafts carrying interleaved hooked cutter discs that counter-rotate in an
// open cutting chamber; a flared feed hopper above it with a low loading lip
// on the grab side; heavy end walls carrying a planetary gearbox and finned
// motor at opposite ends, one per shaft; and a discharge chute under the
// cutters on a column stand. Millimetres, Z up, floor origin, shafts run
// along X and the loading side faces -Y.
meta({
  name: "twin-shaft-shredder",
  license: 'CC0-1.0',
  title: "Twin-shaft shredder",
  description: "Low-speed twin-shaft shear shredder at about real size: two hex shafts with interleaved three-hook cutter discs in an open cutting chamber, flared feed hopper with a low loading lip, heavy end walls with bearing blocks, a planetary gearbox and finned motor driving each shaft from opposite ends, discharge chute on a column stand, control cabinet with beacon. Material controls: machine body, cutter steel, drive paint, safety trim; weathered, highVisibility and blue-machine presets.",
  tags: ["recycling", "materials recovery", "waste management", "shredder", "twin shaft", "size reduction", "cutter discs", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f6b4f', { label: 'Machine body and hopper' });
const cutters = param('cutters', '#8c9196', { label: 'Cutter discs and shafts' });
const drive = param('drive', '#2c4a72', { label: 'Gearboxes and motors' });
const safety = param('safety', '#f2b51c', { label: 'Safety trim and guards' });
presets({
  weathered: { body: '#4c5f52', cutters: '#6f6a62', drive: '#3c4a5a', safety: '#c9993a' },
  highVisibility: { body: '#d77632', safety: '#ffd044' },
  blueMachine: { body: '#255d93', drive: '#3b3f44', safety: '#e8e3d4' },
});

const p = assembly("twin-shaft-shredder");
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
const alongX = (shape) => shape.rotateY(90);

const az = 1100; // shaft centreline height
const shaftY = [-220, 220];
const dark = '#23272a';

// ---- Column stand and discharge chute ----
for (const x of [-800, 800]) for (const y of [-520, 520]) {
  add(`column-${x}-${y}`, blk(x - 100, y - 100, 0, x + 100, y + 100, 700).color(body));
  add(`column-foot-${x}-${y}`, blk(x - 150, y - 150, 0, x + 150, y + 150, 25).color(body));
}
for (const y of [-1, 1]) add(`deck-beam-${y}`, blk(-1000, y > 0 ? 480 : -660, 560, 1000, y > 0 ? 660 : -480, 700).color(body));
for (const x of [-1, 1]) add(`deck-cross-${x}`, blk(x > 0 ? 840 : -1000, -660, 560, x > 0 ? 1000 : -840, 660, 700).color(body));
add('discharge-chute', prismX([[-560, 700], [560, 700], [420, 300], [-420, 300]], -840, 840).color(body));
add('discharge-mouth', prismX([[-430, 300], [430, 300], [430, 260], [-430, 260]], -850, 850).color(safety));

// ---- Cutting chamber: heavy end walls that also carry the hopper ends ----
const endWall = [[-600, 700], [600, 700], [600, 1350], [1140, 2400], [-200, 2400], [-960, 1700], [-600, 1250]];
add('end-wall-drive', prismX(endWall, 840, 980).color(body));
add('end-wall-idle', prismX(endWall, -980, -840).color(body));
add('chamber-wall-back', blk(-840, 560, 700, 840, 600, 1350).color(body));
add('chamber-wall-front', blk(-840, -600, 700, 840, -560, 1250).color(body));
for (const x of [-560, -280, 0, 280, 560]) add(`front-rib-${x}`, blk(x - 15, -640, 760, x + 15, -600, 1230).color(body));

// ---- Feed hopper: tall back wall, short front loading lip ----
add('hopper-back', prismX([[560, 1350], [600, 1350], [1140, 2400], [1100, 2400]], -980, 980).color(body));
add('hopper-front', prismX([[-560, 1250], [-600, 1250], [-960, 1700], [-920, 1700]], -980, 980).color(body));
add('hopper-rim-back', blk(-1000, 1090, 2400, 1000, 1160, 2450).color(safety));
add('hopper-rim-front', blk(-1000, -990, 1700, 1000, -900, 1745).color(safety));
for (const x of [-1, 1]) add(`hopper-rim-end-${x}`, prismX([[600, 1350], [1160, 2450], [1100, 2450], [560, 1350]], x > 0 ? 980 : -1000, x > 0 ? 1000 : -980).color(safety));
for (const x of [-600, 0, 600]) add(`hopper-stiffener-${x}`, prismX([[600, 1400], [640, 1400], [1180, 2380], [1140, 2380]], x - 20, x + 20).color(body));

// ---- Hex shafts with interleaved three-hook cutter discs ----
const hex = (cy, cz, r) => {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([cy + r * Math.cos((Math.PI * i) / 3), cz + r * Math.sin((Math.PI * i) / 3)]);
  return pts;
};
// Sawtooth disc: each 120 degree sector ramps out to a hook tip then drops back.
const cutterDisc = (cy, cz, phase) => {
  const pts = [];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 6; i++) {
      const a = phase + ((Math.PI * 2) / 3) * k + (Math.PI / 9) * i;
      const r = 215 + 22 * i;
      pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    const tip = phase + ((Math.PI * 2) / 3) * k + (Math.PI / 9) * 5.4;
    pts.push([cy + 300 * Math.cos(tip), cz + 300 * Math.sin(tip)]);
    pts.push([cy + 215 * Math.cos(tip + 0.05), cz + 215 * Math.sin(tip + 0.05)]);
  }
  return pts;
};
const pitch = 140, t = 66;
shaftY.forEach((y, s) => {
  add(`shaft-${s}`, prismX(hex(y, az, 115), -1060, 1060).color(cutters));
  for (let i = 0; i < 12; i++) {
    const x0 = -840 + i * pitch + (s === 0 ? 4 : pitch / 2 + 4);
    if (x0 + t > 836) continue;
    const phase = (s === 0 ? 1 : -1) * i * 0.7;
    add(`cutter-${s}-${i}`, prismX(cutterDisc(y, az, phase), x0, x0 + t).color(cutters));
  }
});
// Stripper combs on the walls clear the gaps between discs.
for (let i = 0; i < 12; i++) {
  const x = -840 + i * pitch + pitch / 2 + 4;
  if (x + t <= 836) add(`comb-front-${i}`, prismX([[-560, 960], [-560, 1230], [-470, 1180], [-470, 1000]], x, x + t).color(body));
  const xb = -840 + i * pitch + 4;
  add(`comb-back-${i}`, prismX([[560, 960], [560, 1300], [470, 1240], [470, 1000]], xb, xb + t).color(body));
}

// ---- Bearing blocks on the non-drive ends ----
const bearing = (name, x0, x1, y) => {
  add(name, blk(x0, y - 190, az - 190, x1, y + 190, az + 190).color(drive));
  add(`${name}-cap`, alongX(rod(110, x0 < 0 ? x0 - 40 : x1, x0 < 0 ? x0 : x1 + 40)).translate(0, y, az).color(cutters));
};
bearing('bearing-front', -1060, -980, shaftY[0]);
bearing('bearing-back', 980, 1060, shaftY[1]);

// ---- Drives: planetary gearbox and finned motor on each shaft, opposite ends ----
const driveTrain = (name, y, dir) => {
  const place = (shape) => alongX(shape).rotateZ(dir > 0 ? 0 : 180).translate(0, y, az);
  add(`${name}-gearbox`, place(turned([[0, 980], [210, 980], [265, 1030], [265, 1290], [225, 1350], [0, 1350]])).color(drive));
  for (const x of [1060, 1180]) add(`${name}-gear-band-${x}`, place(ring(262, 280, x, x + 40)).color(drive));
  add(`${name}-motor`, place(turned([[0, 1350], [170, 1350], [190, 1390], [190, 1900], [160, 1950], [0, 1950]])).color(drive));
  for (let i = 0; i < 10; i++) add(`${name}-fin-${i}`, place(ring(188, 206, 1420 + i * 46, 1432 + i * 46)).color(drive));
  add(`${name}-fan-cowl`, place(turned([[0, 1950], [185, 1950], [185, 2050], [130, 2090], [0, 2090]])).color(dark));
  const xs = (x0, x1) => (dir > 0 ? [x0, x1] : [-x1, -x0]);
  const [a0, a1] = xs(1100, 1950);
  add(`${name}-pedestal`, blk(a0, y - 200, 0, a1, y + 200, 640).color(body));
  for (const x of [1250, 1800]) {
    const [b0, b1] = xs(x - 60, x + 60);
    add(`${name}-motor-foot-${x}`, blk(b0, y - 170, 640, b1, y + 170, az - 160).color(drive));
  }
  const [c0, c1] = xs(1500, 1700);
  add(`${name}-terminal-box`, blk(c0, y - 110, az + 190, c1, y + 110, az + 300).color(drive));
  add(`${name}-torque-arm`, blk(dir > 0 ? 1000 : -1300, y - 40, 640, dir > 0 ? 1300 : -1000, y + 40, az - 200).color(safety));
};
driveTrain('drive-front', shaftY[0], 1);
driveTrain('drive-back', shaftY[1], -1);

// ---- Control cabinet with door, e-stop and beacon behind the idle end ----
add('cabinet', blk(-1700, 900, 0, -1150, 1250, 1750).color(body));
add('cabinet-door', blk(-1680, 885, 80, -1170, 900, 1690).color(body));
add('cabinet-handle', blk(-1220, 860, 820, -1200, 885, 1020).color(cutters));
add('cabinet-hmi', blk(-1600, 878, 1200, -1360, 888, 1420).color(dark));
add('e-stop', rod(32, 0, 30).rotateX(90).translate(-1480, 885, 1050).color('#d0302a'));
add('beacon-stem', rod(25, 1750, 1850).translate(-1425, 1075, 0).color(cutters));
add('beacon', turned([[0, 1850], [65, 1850], [60, 1990], [30, 2020], [0, 2020]]).translate(-1425, 1075, 0).color('#f08c00'));

return p.model();
