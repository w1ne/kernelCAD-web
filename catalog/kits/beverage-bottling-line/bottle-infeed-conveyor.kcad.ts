// SPDX-License-Identifier: CC0-1.0
// Bottle infeed conveyor: the tabletop-chain conveyor that queues bottles
// single file (or in two lanes) into the rinser. What makes it this thing
// rather than a plank on legs: formed stainless C-channel side frames, a
// plastic tabletop chain wrapping round end sprockets, low-friction guide
// rails on adjustable rod brackets holding a queue of real bottle-shaped PET
// bottles, a hanging geared drive motor at the discharge end, a dead plate
// and a jam photo-eye, all on braced legs with adjustable sanitary feet.
// Generic visualization geometry at real size, millimetres, Z up, feet on
// z = 0, bottles travel toward +X.
meta({
  name: "bottle-infeed-conveyor",
  license: 'CC0-1.0',
  title: "Bottle infeed conveyor",
  description: "Tabletop-chain bottle infeed conveyor: stainless C-channel side frames, plastic chain round end sprockets, wear-strip guide rails on adjustable rod brackets holding a queue of PET bottles, hanging geared drive motor, dead plate, jam photo-eye, braced legs on adjustable feet. Material controls: stainless steel, painted drive, food-grade chain and wear strips, PET bottles. Single or double lane; sanitaryLine and legacyPlant presets.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'conveyor', 'tabletop chain', 'bottle', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const lanes = param('lanes', 'single', { choices: ['single', 'double'], label: 'Bottle lanes' });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Painted drive motor' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade chain and wear strips' });
const petBottle = param('petBottle', '#b5e2ea', { label: 'PET bottles' });

presets({
  sanitaryLine: { stainlessSteel: '#d2dfe1', powderCoat: '#4b95a4', foodPolymer: '#2c828c', petBottle: '#a6dbe3' },
  legacyPlant: { stainlessSteel: '#858f91', powderCoat: '#315b70', foodPolymer: '#286c75', petBottle: '#5d9a72' },
});

const p = assembly("bottle-infeed-conveyor");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 12) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// PET bottle standing on z = 0: straight body, tapered shoulder, neck finish.
const bottle = () => turned([[0, 0], [33, 0], [33, 180], [15, 238], [15, 272], [0, 272]]);

const L = 1800;
const x0 = -L * 0.5;
const double = lanes.value === 'double';
const lanePitch = 100;
const laneYs = double ? [-lanePitch * 0.5, lanePitch * 0.5] : [0];
const chainW = double ? 200 : 100;
const half = chainW * 0.5 + 20;
const zChain = 860;

// Formed C-channel side frames, open side facing inwards.
for (const [s, side] of [[-1, 'front'], [1, 'back']]) {
  const y = s * half;
  const c = [[y, zChain - 120], [y + s * 30, zChain - 120], [y + s * 30, zChain - 4], [y, zChain - 4], [y, zChain - 16], [y + s * 18, zChain - 16], [y + s * 18, zChain - 108], [y, zChain - 108]];
  add(`side-frame-${side}`, alongX(c, x0, L).color(stainlessSteel));
}

// Tabletop chain: carry run, return run, wrapping end sprockets.
add('chain-carry', box(L, chainW, 12, true).translate(0, 0, zChain - 6).color(foodPolymer));
add('chain-return', box(L, chainW, 10, true).translate(0, 0, zChain - 96).color(foodPolymer));
for (const [k, x] of [[0, x0], [1, -x0]]) add(`chain-sprocket-${k}`, rod([x, -chainW * 0.5, zChain - 51], [x, chainW * 0.5, zChain - 51], 51, 12).color(foodPolymer));

// Legs: braced pairs on adjustable sanitary feet.
for (const [i, x] of [x0 + 150, 0, -x0 - 150].entries()) {
  for (const [s, side] of [[-1, 'front'], [1, 'back']]) {
    add(`leg-${i}-${side}`, box(40, 40, zChain - 200, true).translate(x, s * (half + 15), (zChain - 200) * 0.5 + 80).color(stainlessSteel));
    add(`foot-${i}-${side}`, turned([[0, 0], [40, 0], [40, 10], [12, 26], [10, 80], [0, 80]]).translate(x, s * (half + 15), 0).color(stainlessSteel));
  }
  add(`leg-brace-${i}`, box(30, 2 * half + 30, 30, true).translate(x, 0, 300).color(stainlessSteel));
}
add('leg-stretcher', box(L - 300, 30, 30, true).translate(0, half + 15, 300).color(stainlessSteel));

// Guide rails: wear strips on rod brackets either side of each lane.
const zGuide = zChain + 130;
const guideYs = double ? [-lanePitch - 8, 0, lanePitch + 8] : [-lanePitch * 0.5 + 8, lanePitch * 0.5 - 8];
for (const [g, gy] of guideYs.entries()) {
  add(`guide-rail-${g}`, box(L - 40, 10, 34, true).translate(0, gy, zGuide).color(foodPolymer));
  for (const [b, bx] of [x0 + 200, 0, -x0 - 200].entries()) {
    const out = gy === 0 ? 0 : Math.sign(gy);
    if (out === 0) {
      add(`guide-hanger-${g}-${b}`, rod([bx, 0, zGuide + 17], [bx, 0, zGuide + 120], 7, 6).color(stainlessSteel));
      continue;
    }
    add(`guide-bracket-${g}-${b}`, rod([bx, out * (half + 30), zChain - 60], [bx, out * (half + 30), zGuide], 8, 6).color(stainlessSteel));
    add(`guide-arm-${g}-${b}`, rod([bx, out * (half + 30), zGuide], [bx, gy + out * 5, zGuide], 7, 6).color(stainlessSteel));
  }
}
if (double) add('centre-guide-bar', box(L - 40, 20, 20, true).translate(0, 0, zGuide + 130).color(stainlessSteel));

// Queue of bottles backed up toward the discharge end.
const nQ = double ? 6 : 8;
for (const [l, ly] of laneYs.entries()) {
  for (let i = 0; i < nQ; i += 1) add(`bottle-${l}-${i}`, bottle().translate(-x0 - 120 - i * 70 - l * 35, ly, zChain).color(petBottle));
}

// Discharge end: dead plate, jam photo-eye and hanging geared drive.
add('dead-plate', box(120, chainW + 20, 10, true).translate(-x0 + 60, 0, zChain - 5).color(stainlessSteel));
add('photo-eye-post', rod([x0 + 500, -half - 30, zChain - 60], [x0 + 500, -half - 30, zChain + 140], 10).color(stainlessSteel));
add('photo-eye', box(40, 40, 50, true).translate(x0 + 500, -half - 30, zChain + 160).color(powderCoat));
add('drive-gearbox', box(160, 140, 180, true).translate(-x0 - 20, half + 100, zChain - 120).color(powderCoat));
add('drive-motor', rod([-x0 - 20, half + 170, zChain - 150], [-x0 - 20, half + 400, zChain - 150], 75, 12).color(powderCoat));
add('drive-fan-cowl', rod([-x0 - 20, half + 400, zChain - 150], [-x0 - 20, half + 440, zChain - 150], 70, 12).color(stainlessSteel));
add('drive-shaft', rod([-x0, -half, zChain - 51], [-x0, half + 40, zChain - 51], 15).color(stainlessSteel));

return p.model();
