// SPDX-License-Identifier: CC0-1.0
// Bottle return kiosk: the reverse vending machine by a supermarket
// entrance that takes empty bottles and cans for a deposit voucher. What
// makes it a return machine rather than a cabinet: a round lit intake
// with a bottle half-fed into it, a touchscreen and big donate/print
// buttons beside it, a voucher slot, a crate-intake hatch with a roller
// bed below, a recycling-loop graphic, and a raked lit header. Generic
// visualization geometry at about real size (900 mm wide, 1.95 m tall),
// millimetres, Z up, customer side on -Y.

meta({
  name: "bottle-return-kiosk",
  license: 'CC0-1.0',
  title: "Bottle return kiosk",
  description: "Reverse vending machine at about real size: round lit intake with a bottle half-fed in, touchscreen, donate and print buttons, voucher slot, crate hatch (open or shut) with roller bed, recycling-loop graphic and raked lit header. Material controls: cabinet, front fascia, light ring and graphics, stainless trim. ecoGreen, municipalBlue and charcoalOrange presets; crate hatch choice.",
  tags: ['bottle return', 'reverse vending machine', 'deposit return', 'recycling', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#2f3a36', { label: 'Cabinet paint' });
const fascia = param('fascia', '#eef1ee', { label: 'Front fascia' });
const accent = param('accent', '#3fae5a', { label: 'Light ring and graphics' });
const stainless = param('stainless', '#b7bfc3', { label: 'Stainless trim' });
const hatch = param('hatch', 'open', { choices: ['open', 'shut'], label: 'Crate hatch' });

presets({
  ecoGreen: { cabinet: '#2f3a36', fascia: '#eef1ee', accent: '#3fae5a', stainless: '#b7bfc3' },
  municipalBlue: { cabinet: '#1f3550', fascia: '#e6edf3', accent: '#2f8fd8', stainless: '#a9b3ba' },
  charcoalOrange: { cabinet: '#26282b', fascia: '#3a3d41', accent: '#f08a2c', stainless: '#8d969b' },
});

const p = assembly("bottle-return-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const circle = (r, n, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 900;
const D = 720;
const H = 1750;
const YF = -D / 2;
const IX = -150;
const IZ = 1060;

// Cabinet, kick plate and front fascia with the round intake cut through.
const intakeHole = cylinder(260, 125, 20).rotateX(90).translate(IX, YF + 200, IZ);
const crateBay = blk(-150, YF + 150, 300, 520, 300, 360);
add("cabinet", blk(0, 20, 0, W, D - 40, H).subtract(intakeHole).subtract(crateBay).color(cabinet));
add("kick-plate", blk(0, YF + 10, 0, W, 20, 100).color(stainless));
add("fascia", blk(0, YF + 20, 100, W, 40, H - 100).subtract(intakeHole).subtract(blk(-150, YF, 300, 520, 120, 360)).color(fascia));
add("intake-ring", extrudePolygon([...circle(150, 24), ...circle(126, 24).reverse()], 16).rotateX(90).translate(IX, YF - 16, IZ).color(accent));
add("intake-throat", cylinder(200, 126, 20).rotateX(90).translate(IX, YF + 220, IZ).subtract(cylinder(220, 112, 20).rotateX(90).translate(IX, YF + 210, IZ)).color('#2a2d30'));
add("intake-back", blk(IX, YF + 200, IZ - 130, 260, 10, 260).color('#1a1c1e'));
add("intake-label", blk(IX, YF - 4, IZ + 175, 260, 6, 40).color(accent));

// Bottle half-fed into the intake, base first.
add("bottle", turned([[0, 0], [36, 0], [36, 190], [14, 250], [14, 290], [0, 290]]).rotateX(90).translate(IX, YF + 150, IZ - 40).color('#3f8a5a'));
add("bottle-cap", cylinder(14, 16, 12).rotateX(90).translate(IX, YF - 140, IZ - 40).color('#d2362d'));
add("bottle-label", cylinder(70, 37, 16).rotateX(90).translate(IX, YF + 20, IZ - 40).color('#f2e6c8'));

// Touchscreen, buttons and voucher slot to the right of the intake.
const SX = 250;
add("screen-hood", profileYZ([[0, 0], [-60, 0], [-40, 300], [0, 300]], 300).translate(SX, YF, 1020).color(cabinet));
// A strip lying on the hood's sloped face, `off` mm proud of it.
const onSlope = (z0: number, z1: number, off: number, th: number) => {
  const sy = (z: number) => -60 + (20 * z) / 300 - off;
  return [[sy(z0), z0], [sy(z0) - th, z0], [sy(z1) - th, z1], [sy(z1), z1]];
};
add("screen", profileYZ(onSlope(30, 270, 0, 4), 250).translate(SX, YF, 1020).color('#1d3340'));
add("screen-tile-a", profileYZ(onSlope(160, 250, 4, 3), 200).translate(SX, YF, 1020).color(accent));
add("screen-tile-b", profileYZ(onSlope(60, 140, 4, 3), 90).translate(SX - 55, YF, 1020).color('#f4f1ea'));
add("screen-tile-c", profileYZ(onSlope(60, 140, 4, 3), 90).translate(SX + 55, YF, 1020).color('#f4f1ea'));
add("button-donate", cylinder(30, 50, 20).rotateX(90).translate(SX - 70, YF, 880).color('#f2b632'));
add("button-print", cylinder(30, 50, 20).rotateX(90).translate(SX + 70, YF, 880).color(accent));
add("voucher-bezel", blk(SX, YF - 10, 760, 200, 12, 50).color(stainless));
add("voucher-slot", blk(SX, YF - 17, 780, 140, 4, 8).color('#111315'));
add("voucher", blk(0, 0, 0, 90, 60, 2).rotateX(15).translate(SX, YF - 40, 778).color('#f6f3ea'));

// Recycling-loop graphic: a ring with three arrowheads.
const LX = 250;
const LZ = 500;
add("loop-ring", profileXZ([...circle(110, 24, LX, LZ), ...circle(85, 24, LX, LZ).reverse()], 6).translate(0, YF - 3, 0).color(accent));
for (let k = 0; k < 3; k++) {
  const a = (k * 2 * Math.PI) / 3 + 0.4;
  const cx = LX + 97 * Math.cos(a);
  const cz = LZ + 97 * Math.sin(a);
  const tx = -Math.sin(a);
  const tz = Math.cos(a);
  const nx = Math.cos(a);
  const nz = Math.sin(a);
  add(`loop-arrow-${k}`, profileXZ([[cx + 40 * nx, cz + 40 * nz], [cx + 45 * tx, cz + 45 * tz], [cx - 40 * nx, cz - 40 * nz]], 8).translate(0, YF - 4, 0).color(accent));
}

// Crate hatch with a roller bed behind it.
add("crate-bay", blk(-150, YF + 290, 300, 520, 10, 360).color('#1a1c1e'));
add("bay-floor", blk(-150, YF + 150, 290, 520, 280, 10).color('#3a3f43'));
for (let i = 0; i < 6; i++) add(`roller-${i}`, cylinder(500, 18, 10).rotateY(90).translate(-400, YF + 40 + i * 45, 318).color(stainless));
add("crate-lip", blk(-150, YF - 6, 280, 560, 30, 20).color(stainless));
if (hatch.value === 'open') {
  // Hinged on its top edge and swung up past horizontal.
  add("hatch", blk(0, -4, -300, 520, 8, 300).rotateX(-100).translate(-150, YF - 6, 660).color(fascia));
  add("hatch-handle", blk(0, -14, -60, 200, 14, 24).rotateX(-100).translate(-150, YF - 6, 660).color(stainless));
} else {
  add("hatch", blk(-150, YF - 6, 310, 520, 12, 340).color(fascia));
  add("hatch-handle", blk(-150, YF - 20, 580, 200, 14, 24).color(stainless));
}

// Raked lit header with the brand panel.
add("header", profileYZ([[D / 2, 0], [YF, 0], [YF - 60, 200], [D / 2, 200]], W).translate(0, 0, H).color(cabinet));
const onHeader = (z0: number, z1: number, off: number, th: number) => {
  const sy = (z: number) => YF - (60 * z) / 200 - off;
  return [[sy(z0), z0], [sy(z0) - th, z0], [sy(z1) - th, z1], [sy(z1), z1]];
};
add("header-panel", profileYZ(onHeader(25, 180, 0, 4), W - 60).translate(0, 0, H).color(accent));
add("header-text", profileYZ(onHeader(75, 135, 4, 4), 420).translate(-120, 0, H).color(fascia));
add("header-bottle", profileYZ(onHeader(50, 160, 4, 4), 50).translate(250, 0, H).color(fascia));
add("header-bottle-neck", profileYZ(onHeader(160, 170, 4, 4), 20).translate(250, 0, H).color(fascia));

return p.model();
