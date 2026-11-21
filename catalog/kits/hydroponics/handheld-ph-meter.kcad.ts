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
const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  // cylinder() keeps an analytic surface and ignores its legacy segment slot.
  // An explicit polygon profile keeps each cable section within the mesh budget.
  return path().circle(0, 0, r, seg).extrude(l).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

// Meter, leaning back 15 degrees on its kickstand. Built upright (front on -Y,
// base at z=0) then tilted, so it all shares one transform.
const leanAngle = -15;
const lean = (s: Shape) => s.rotateX(leanAngle).translate(-60, 0, 10);
const W = 80, H = 170, T = 32;
add("bumper", lean(extrudeRoundedRect(W + 8, H + 8, 16, T, { axis: 'y' }).translate(0, -T / 2, H / 2)).color(bumper));
add("housing-face", lean(extrudeRoundedRect(W - 6, H - 10, 10, 4, { axis: 'y' }).translate(0, -T / 2 - 3, H / 2)).color(housing));
add("display-bezel", lean(blk(0, -T / 2 - 5, H - 78, 62, 3, 58)).color('#2a2d30'));
add("display", lean(blk(0, -T / 2 - 6, H - 73, 54, 2, 48)).color(display));
// LCD digits for the chosen reading, as segment bars.
const digits = reading.value === 'acidic' ? [5, 8] : reading.value === 'alkaline' ? [8, 4] : [6, 9];
// Independent upper/lower vertical strokes are needed to distinguish 4, 5, 6 and 9.
const glyphs: Record<number, string[]> = {
  4: ['upper-right', 'lower-right', 'upper-left', 'mid'],
  5: ['top', 'lower-right', 'bot', 'upper-left', 'mid'],
  6: ['top', 'lower-right', 'bot', 'lower-left', 'upper-left', 'mid'],
  8: ['top', 'upper-right', 'lower-right', 'bot', 'lower-left', 'upper-left', 'mid'],
  9: ['top', 'upper-right', 'lower-right', 'bot', 'upper-left', 'mid'],
};
const strokes: [string, number, number, number, number][] = [
  ['top', 0, H - 36, 12, 3],
  ['upper-right', 6, H - 48, 2, 12],
  ['lower-right', 6, H - 63, 2, 12],
  ['bot', 0, H - 66, 12, 3],
  ['lower-left', -6, H - 63, 2, 12],
  ['upper-left', -6, H - 48, 2, 12],
  ['mid', 0, H - 51, 12, 3],
];
digits.forEach((d, i) => {
  const x = -14 + i * 24;
  for (const [name, dx, z, width, height] of strokes) {
    if (glyphs[d].includes(name)) {
      add(`digit-${i}-${name}`, lean(blk(x + dx, -T / 2 - 7.2, z, width, 1, height)).color('#1f2a1c'));
    }
  }
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

// Low-poly coiled cable from the meter gland to the probe cap. Eight samples
// per turn retain the winding; one sample per turn collapses it to its centreline.
const glandExitZ = H + 15;
const leanRadians = leanAngle * Math.PI / 180;
const start: [number, number, number] = [-38, -Math.sin(leanRadians) * glandExitZ, 10 + Math.cos(leanRadians) * glandExitZ];
const end: [number, number, number] = [80, -10, 212];
const coils = 9;
const samplesPerCoil = 8;
const cableSegments = coils * samplesPerCoil;
const cablePoint = (u: number): [number, number, number] => [
  start[0] + (end[0] - start[0]) * u,
  start[1] + (end[1] - start[1]) * u + Math.sin(u * coils * 2 * Math.PI) * 6,
  start[2] + (end[2] - start[2]) * u + Math.sin(Math.PI * u) * 60 + Math.cos(u * coils * 2 * Math.PI) * 6,
];
add('cable-inlet', rod(start, cablePoint(0), 2.6, 5).color('#1e2124'));
for (let k = 0; k < cableSegments; k++) {
  add(`cable-${k}`, rod(cablePoint(k / cableSegments), cablePoint((k + 1) / cableSegments), 2.6, 5).color('#1e2124'));
}
add('cable-outlet', rod(cablePoint(1), end, 2.6, 5).color('#1e2124'));

// Sample beaker with the probe standing in it.
const BX = 80, BY = -10;
add("beaker", turned([[38, 0], [40, 0], [40, 110], [43, 113], [43, 116], [38, 116], [38, 3], [0, 3], [0, 0]]).translate(BX, BY, 0).color('#dfe9ee'));
add("sample", cylZ(BX, BY, 3, 66, 37.5, 20).color(solution));
for (let k = 0; k < 4; k++) add(`grad-${k}`, blk(BX - 20, BY - 40.5, 25 + k * 18, 10, 1, 1.5).color('#4a5a66'));
add("probe-body", cylZ(BX, BY, 30, 160, 7, 12).color('#2a2d30'));
add("probe-glass", cylZ(BX, BY, 14, 20, 5, 10).color('#cfe3e8'));
add("probe-bulb", sphere(6).translate(BX, BY, 14).color('#d8ecf0'));
add("probe-guard", cylZ(BX, BY, 22, 26, 9, 12).subtract(blk(BX, BY - 10, 26, 8, 8, 14)).color('#3a3f44'));
add("probe-cap", turned([[0, 0], [8, 0], [10, 12], [3, 24], [0, 24]]).translate(BX, BY, 190).color('#2a2d30'));

// Calibration buffer bottles.
const bottle = (name: string, x: number, y: number, cap: string, label: string) => {
  add(`${name}-bottle`, turned([[0, 0], [24, 0], [24, 80], [12, 92], [9, 100], [0, 100]]).translate(x, y, 0).color('#f2f2ee'));
  add(`${name}-cap`, cylZ(x, y, 98, 16, 11, 12).color(cap));
  add(`${name}-label`, cylinder(36, 24.6, 14).subtract(cylinder(40, 20, 14).translate(0, 0, -2)).subtract(blk(0, 20, -4, 60, 30, 44)).translate(x, y, 22).color(label));
};
bottle('buffer-4', 150, 50, '#c0392b', '#e57a6c');
bottle('buffer-7', 200, 20, '#3b8a3e', '#87c27a');

return p.model();
