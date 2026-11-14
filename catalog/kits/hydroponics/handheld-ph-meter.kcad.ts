// SPDX-License-Identifier: CC0-1.0
// Handheld pH meter: the portable meter a grower uses to check nutrient
// acidity, shown on the bench mid-reading with its probe standing in a
// beaker of sample solution.
// What makes it a pH meter: a rounded hand-sized body in a rubber bumper
// with a large LCD at the top, a short row of soft keys below it, a coiled
// cable from the top of the body to a slim glass electrode probe with a
// cap guard at the tip, the probe dipped in a sample beaker, and a pair of
// coloured calibration-buffer bottles (pH 4 red, pH 7 green) beside it.
// Generic visualization geometry at real size (meter 80 x 170 mm),
// millimetres, Z up, display toward -Y.

meta({
  name: "handheld-ph-meter",
  license: 'CC0-1.0',
  title: "Handheld pH meter",
  description: "Portable pH meter at real size, propped on its stand with a rubber bumper, LCD and soft keys, a coiled cable to a glass electrode probe dipped in a sample beaker, plus pH 4 and pH 7 calibration buffer bottles. Material controls: housing, bumper, display and sample solution, plus a reading choice (acidic, neutral, alkaline). labYellow, greyPro, nutrientBlue and weathered presets.",
  tags: ['ph meter', 'ph tester', 'ph probe', 'electrode', 'calibration buffer', 'beaker', 'nutrient testing', 'water testing', 'hydroponics', 'lab', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#e9eae6', { label: 'Housing (ABS)' });
const bumper = param('bumper', '#e0a21c', { label: 'Bumper (rubber)' });
const display = param('display', '#a9bfa0', { label: 'Display (LCD)' });
const solution = param('solution', '#7fb3c9', { label: 'Sample solution' });
const reading = param('reading', 'neutral', { choices: ['acidic', 'neutral', 'alkaline'], label: 'Reading' });

presets({
  labYellow: { housing: '#e9eae6', bumper: '#e0a21c', display: '#a9bfa0', solution: '#7fb3c9' },
  greyPro: { housing: '#3a3f44', bumper: '#22262a', display: '#9fb7a6', solution: '#8fc0d0' },
  nutrientBlue: { housing: '#eef0ec', bumper: '#2f6fa8', display: '#b0c6aa', solution: '#9fc36a' },
  weathered: { housing: '#cfcbbf', bumper: '#a8823a', display: '#8f9c86', solution: '#9aa78a' },
});

const p = assembly("handheld-ph-meter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: [number, number][], seg = 16) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

// Meter, leaning back 15 degrees on its kickstand. Built upright (front on -Y,
// base at z=0) then tilted, so it all shares one transform.
const lean = (s: Shape) => s.rotateX(-15).translate(-60, 0, 10);
const W = 80, H = 170, T = 32;
add("bumper", lean(extrudeRoundedRect(W + 8, H + 8, 16, T, { axis: 'y' }).translate(0, -T / 2, H / 2)).color(bumper));
add("housing-face", lean(extrudeRoundedRect(W - 6, H - 10, 10, 4, { axis: 'y' }).translate(0, -T / 2 - 3, H / 2)).color(housing));
add("display-bezel", lean(blk(0, -T / 2 - 5, H - 78, 62, 3, 58)).color('#2a2d30'));
add("display", lean(blk(0, -T / 2 - 6, H - 73, 54, 2, 48)).color(display));
// LCD digits for the chosen reading, as segment bars.
const digits = reading.value === 'acidic' ? [5, 8] : reading.value === 'alkaline' ? [8, 4] : [6, 9];
digits.forEach((d, i) => {
  const x = -14 + i * 24;
  add(`digit-${i}-top`, lean(blk(x, -T / 2 - 7.2, H - 36, 12, 1, 3)).color('#1f2a1c'));
  add(`digit-${i}-mid`, lean(blk(x, -T / 2 - 7.2, H - 51, 12, 1, 3)).color('#1f2a1c'));
  add(`digit-${i}-bot`, lean(blk(x, -T / 2 - 7.2, H - 66, 12, 1, 3)).color('#1f2a1c'));
  if (d !== 4) add(`digit-${i}-left`, lean(blk(x - 6, -T / 2 - 7.2, H - 65, 2, 1, 30)).color('#1f2a1c'));
  add(`digit-${i}-right`, lean(blk(x + 6, -T / 2 - 7.2, H - 65, 2, 1, 30)).color('#1f2a1c'));
});
add("decimal-point", lean(blk(-2, -T / 2 - 7.2, H - 66, 3, 1, 3)).color('#1f2a1c'));
add("ph-legend", lean(blk(20, -T / 2 - 7.2, H - 34, 8, 1, 5)).color('#1f2a1c'));
// Soft keys: power, cal, hold.
const keys = ['#c0392b', '#2f6fa8', '#5b6166'];
keys.forEach((c, i) => add(`key-${i}`, lean(cylinder(4, 8, 12).rotateX(90).translate(-22 + i * 22, -T / 2 - 4, 40)).color(c)));
add("brand-strip", lean(blk(0, -T / 2 - 5.5, 16, 40, 1, 6)).color(bumper));
add("cable-gland", lean(cylZ(22, 0, H + 2, 14, 6, 10)).color('#2a2d30'));
add("kickstand", blk(0, 0, 0, 60, 8, 60).rotateX(-25).translate(-60, 34, 6).color('#2a2d30'));
add("bench-pad", blk(-60, 5, 0, 110, 70, 6).color('#2a2d30'));

// Coiled cable from the top of the meter over to the probe.
const start: [number, number, number] = [-38, 48, 190];
const end: [number, number, number] = [80, -10, 212];
const coils = 9;
for (let k = 0; k < coils; k++) {
  const t = k / coils, t2 = (k + 1) / coils;
  const pt = (u: number): [number, number, number] => [
    start[0] + (end[0] - start[0]) * u,
    start[1] + (end[1] - start[1]) * u + Math.sin(u * coils * 2 * Math.PI) * 6,
    start[2] + (end[2] - start[2]) * u + Math.sin(Math.PI * u) * 60 + Math.cos(u * coils * 2 * Math.PI) * 6,
  ];
  add(`cable-${k}`, rod(pt(t), pt(t2), 2.6, 5).color('#1e2124'));
}

// Sample beaker with the probe standing in it.
const BX = 80, BY = -10;
add("beaker", turned([[38, 0], [40, 0], [40, 110], [43, 113], [43, 116], [38, 116], [38, 3], [0, 3], [0, 0]], 20).translate(BX, BY, 0).color('#dfe9ee'));
add("sample", cylZ(BX, BY, 3, 66, 37.5, 20).color(solution));
for (let k = 0; k < 4; k++) add(`grad-${k}`, blk(BX - 20, BY - 40.5, 25 + k * 18, 10, 1, 1.5).color('#4a5a66'));
add("probe-body", cylZ(BX, BY, 30, 160, 7, 12).color('#2a2d30'));
add("probe-glass", cylZ(BX, BY, 14, 20, 5, 10).color('#cfe3e8'));
add("probe-bulb", sphere(6).translate(BX, BY, 14).color('#d8ecf0'));
add("probe-guard", cylZ(BX, BY, 22, 26, 9, 12).subtract(blk(BX, BY - 10, 26, 8, 8, 14)).color('#3a3f44'));
add("probe-cap", turned([[0, 0], [8, 0], [10, 12], [3, 24], [0, 24]], 12).translate(BX, BY, 190).color('#2a2d30'));

// Calibration buffer bottles.
const bottle = (name: string, x: number, y: number, cap: string, label: string) => {
  add(`${name}-bottle`, turned([[0, 0], [24, 0], [24, 80], [12, 92], [9, 100], [0, 100]], 14).translate(x, y, 0).color('#f2f2ee'));
  add(`${name}-cap`, cylZ(x, y, 98, 16, 11, 12).color(cap));
  add(`${name}-label`, cylinder(36, 24.6, 14).subtract(cylinder(40, 20, 14).translate(0, 0, -2)).subtract(blk(0, 20, -4, 60, 30, 44)).translate(x, y, 22).color(label));
};
bottle('buffer-4', 150, 50, '#c0392b', '#e57a6c');
bottle('buffer-7', 200, 20, '#3b8a3e', '#87c27a');

return p.model();
