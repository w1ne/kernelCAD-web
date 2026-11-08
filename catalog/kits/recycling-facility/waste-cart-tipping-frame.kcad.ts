// SPDX-License-Identifier: CC0-1.0
// Waste-cart tipping frame: a bin lifter that empties wheelie bins into a
// skip or hopper behind it.
// What makes it a bin lifter rather than a tank: a floor-bolted base plate,
// two tall steel masts, a lifting carriage with a comb bar that grips the
// front rim of a 240-litre wheelie bin, a hydraulic ram between the masts,
// a deflector hood at the top that guides the tipped load over the far edge,
// hazard-striped guards and a two-button control box. A wheelie bin waits in
// the cradle.
// Generic visualization geometry at about real size (1.4 m wide, 2.4 m tall),
// millimetres, Z up, loading side toward -Y, base plate on z = 0.

meta({
  name: "waste-cart-tipping-frame",
  license: 'CC0-1.0',
  title: "Waste-cart tipping frame",
  description: "Wheelie-bin lifter at about real size: floor-bolted base plate, two steel masts, lifting carriage with comb bar, hydraulic ram, top deflector hood, hazard-striped guards, two-button control box and a 240-litre wheelie bin in the cradle. Material controls: frame, ram rod and comb (chrome), wheelie bin, hazard stripes. depotBlue, safetyYellow and weathered presets.",
  tags: ["bin lifter", "bin tipper", "wheelie bin", "cart tipper", "hydraulic lift", "recycling", "materials recovery", "waste management", "equipment", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3b5d7a', { label: 'Frame (painted steel)' });
const chrome = param('chrome', '#c4ccd0', { label: 'Ram rod, comb and fixings (chrome)' });
const bin = param('bin', '#2f7d3a', { label: 'Wheelie bin (HDPE)' });
const hazard = param('hazard', '#f2c230', { label: 'Hazard stripes and buttons' });
const cart = param('cart', 'loaded', { choices: ['loaded', 'empty'], label: 'Bin in cradle' });

presets({
  depotBlue: { frame: '#3b5d7a', chrome: '#c4ccd0', bin: '#2f7d3a', hazard: '#f2c230' },
  safetyYellow: { frame: '#e0b22a', chrome: '#b9c2c6', bin: '#3a4046', hazard: '#1d1f21' },
  weathered: { frame: '#5c6a6e', chrome: '#9aa3a6', bin: '#6a4a2a', hazard: '#c99a2e' },
});

const p = assembly("waste-cart-tipping-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude a (y, z) side profile across X, centred on x = cx.
const sideYZ = (pts: [number, number][], width: number, cx = 0) => extrudePolygon(pts, width).rotateX(90).rotateZ(90).translate(cx - width / 2, 0, 0);

const MX = 480;
const MY = 250;
const H = 2200;

// Base plate with anchor bolts.
add("base-plate", blk(0, 150, 0, 1400, 900, 40).color(frame));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(`anchor-${sx}-${sy}`, cylinder(30, 22, 8).translate(sx * 640, 150 + sy * 390, 40).color(chrome));

// Masts with diagonal back stays.
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  add(`mast-${tag}`, blk(s * MX, MY, 40, 120, 120, H).color(frame));
  add(`mast-cap-${tag}`, blk(s * MX, MY, 40 + H, 150, 150, 20).color(frame));
  add(`stay-${tag}`, sideYZ([[MY + 60, 40], [MY + 560, 40], [MY + 60, 1300], [MY + 60, 1200], [MY + 460, 80], [MY + 60, 80]], 60, s * MX).color(frame));
  // Hazard stripes on the mast fronts.
  for (let k = 0; k < 6; k++) add(`stripe-${tag}-${k}`, blk(s * MX, MY - 62, 200 + k * 160, 122, 4, 80).color(hazard));
}
add("cross-beam", blk(0, MY, 40 + H - 140, 2 * MX - 120, 100, 140).color(frame));

// Deflector hood: a bent plate that leans back over the receiving container.
add("hood", sideYZ([[MY - 60, H - 100], [MY + 60, H - 100], [MY + 700, H + 250], [MY + 700, H + 330], [MY + 40, H - 20], [MY - 60, H - 20]], 2 * MX + 120).color(frame));
add("hood-lip", sideYZ([[MY + 680, H + 250], [MY + 760, H + 250], [MY + 760, H + 360], [MY + 680, H + 360]], 2 * MX + 120).color(hazard));

// Hydraulic ram: barrel on the base, chrome rod up into the carriage.
add("ram-barrel", cylinder(600, 60, 14).translate(0, MY + 40, 40).color(frame));
add("ram-rod", cylinder(160, 30, 12).translate(0, MY + 40, 640).color(chrome));
add("ram-clevis", blk(0, MY + 40, 780, 120, 80, 60).color(frame));

// Lifting carriage riding on the mast fronts, with the comb bar.
const CZ = 760;
add("carriage", blk(0, MY - 100, CZ, 2 * MX + 120, 80, 300).color(frame));
for (const s of [-1, 1]) add(`carriage-shoe-${s < 0 ? 'l' : 'r'}`, blk(s * MX, MY - 70, CZ - 20, 160, 40, 340).color(chrome));
add("comb-bar", blk(0, MY - 180, CZ + 220, 700, 80, 50).color(chrome));
for (let k = -3; k <= 3; k++) add(`comb-tooth-${k + 3}`, blk(k * 95, MY - 205, CZ + 270, 30, 30, 40).color(chrome));
add("lower-cradle", blk(0, MY - 160, 300, 600, 60, 120).color(frame));

// Control box on the right mast.
add("control-box", blk(MX + 150, MY - 40, 1100, 180, 120, 260).color(frame));
add("button-up", cylinder(20, 22, 12).rotateX(90).translate(MX + 110, MY - 100, 1260).color(hazard));
add("button-down", cylinder(20, 22, 12).rotateX(90).translate(MX + 190, MY - 100, 1260).color(chrome));
add("e-stop", cylinder(30, 32, 12).rotateX(90).translate(MX + 150, MY - 100, 1160).color('#c8302c'));

// The 240-litre wheelie bin standing in the cradle, front rim on the comb.
if (cart.value === 'loaded') {
  const BW = 580;
  const back = MY - 220;
  add("bin-body", sideYZ([[back, 70], [back - 520, 70], [back - 600, 1060], [back + 20, 1060]], BW).color(bin));
  add("bin-rim", sideYZ([[back + 20, 1020], [back - 620, 1020], [back - 620, 1070], [back + 40, 1070]], BW + 30).color(bin));
  add("bin-lid", sideYZ([[back + 40, 1070], [back - 650, 1070], [back - 650, 1100], [back + 40, 1100]], BW + 40).color(bin));
  add("bin-handle", cylinder(BW - 60, 18, 10).rotateY(90).translate(-(BW - 60) / 2, back + 40, 1030).color(bin));
  for (const s of [-1, 1]) {
    add(`bin-wheel-${s < 0 ? 'l' : 'r'}`, cylinder(60, 100, 16).rotateY(90).translate(s * (BW / 2 - 20) - 30, back - 40, 100).color('#1d1f21'));
  }
  add("bin-axle", cylinder(BW, 15, 8).rotateY(90).translate(-BW / 2, back - 40, 100).color(chrome));
}

return p.model();
