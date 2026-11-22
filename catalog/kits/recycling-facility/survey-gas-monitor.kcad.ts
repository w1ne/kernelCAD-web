// SPDX-License-Identifier: CC0-1.0
// Survey gas monitor: the portable landfill gas analyser a technician
// carries across a capped landfill on a walk-over survey, pushing a probe
// into bar holes to read methane, carbon dioxide and oxygen in the soil.
// What makes it a gas survey kit: a rugged analyser with a big screen,
// keypad, rubber bumpers, gas inlet and outlet nipples and a shoulder
// strap; a coiled sample hose running to a stainless probe wand with a
// T-handle and filter, pushed into a bar hole; a steel bar-hole spike and a
// marker flag beside it; and the open hard carry case with its foam
// insert, spare filter and a calibration gas cylinder.
// Generic visualization geometry at about real size (1.5 m wide, 0.9 m
// deep, 1.2 m high), millimetres, Z up, screen facing -Y.

meta({
  name: "survey-gas-monitor",
  license: 'CC0-1.0',
  title: "Survey gas monitor",
  description: "Portable landfill gas survey kit at about real size: rugged analyser with screen, keypad, bumpers, gas nipples and shoulder strap, sample hose to a stainless probe wand with T-handle pushed into a bar hole, bar-hole spike, marker flag, and an open hard carry case with foam insert, spare filter and calibration gas cylinder. Material controls: analyser housing, carry case, probe steel and sample hose. safetyOrange, fieldYellow, labGrey and weathered presets.",
  tags: ['gas monitor', 'gas analyser', 'landfill gas', 'methane', 'walk-over survey', 'gas probe', 'bar hole', 'portable instrument', 'carry case', 'environmental monitoring', 'recycling', 'waste management', 'residuals', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#f07a1a', { label: 'Analyser housing (moulded plastic)' });
const caseShell = param('caseShell', '#2f3437', { label: 'Carry case shell (polypropylene)' });
const probeSteel = param('probeSteel', '#c3c8cb', { label: 'Probe wand and spike (stainless steel)' });
const hose = param('hose', '#3a7fc0', { label: 'Sample hose (PVC tube)' });

presets({
  safetyOrange: { housing: '#f07a1a', caseShell: '#2f3437', probeSteel: '#c3c8cb', hose: '#3a7fc0' },
  fieldYellow: { housing: '#f2c230', caseShell: '#3a4a3a', probeSteel: '#b8bfc2', hose: '#d8dcdc' },
  labGrey: { housing: '#8f969a', caseShell: '#c0392b', probeSteel: '#d2d6d8', hose: '#2e9a63' },
  weathered: { housing: '#b86a2a', caseShell: '#3d3b38', probeSteel: '#8f8c84', hose: '#4f6a85' },
});

const p = assembly("survey-gas-monitor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
// A polyline of rods with a ball at each joint.
const line = (n: string, pts: [number, number, number][], r: number, c: string) => {
  for (let i = 0; i + 1 < pts.length; i++) add(`${n}-${i}`, rod(pts[i], pts[i + 1], r).color(c));
  for (let i = 1; i + 1 < pts.length; i++) add(`${n}-joint-${i}`, sphere(r).translate(pts[i][0], pts[i][1], pts[i][2]).color(c));
};

// Patch of capped landfill soil around the bar hole.
add("soil-patch", cylZ(300, -150, 0, 20, 650, 18).color('#7a6a4a'));
add("bar-hole", cylZ(560, -330, 15, 8, 40, 10).color('#2a2218'));

// Open hard carry case with foam, spare filter and calibration cylinder.
const KX = -380, KY = 150, KW = 620, KD = 460, KH = 180;
add("case-base", blk(KX, KY, 20, KW, KD, KH).subtract(blk(KX, KY, 50, KW - 40, KD - 40, KH)).color(caseShell));
add("case-foam", blk(KX, KY, 50, KW - 40, KD - 40, 90).subtract(blk(KX - 120, KY - 40, 110, 320, 200, 60)).color('#4a4d50'));
add("cal-cylinder", cylinder(300, 40, 12).rotateY(90).translate(KX - 270, KY - 40, 150).color('#e6e2d6'));
add("cal-cylinder-shoulder", cylinder(40, 24, 10).rotateY(90).translate(KX + 30, KY - 40, 150).color('#2e9a63'));
add("cal-regulator", blk(KX + 100, KY - 40, 125, 50, 50, 60).color('#c3c8cb'));
add("spare-filter", cylZ(KX + 180, KY + 100, 140, 70, 45, 12).color('#e6e2d6'));
add("filter-cap", cylZ(KX + 180, KY + 100, 210, 12, 47, 12).color(hose));
for (const s of [-1, 1]) add(`case-latch-${s}`, blk(KX + s * 180, KY - KD / 2 - 6, 140, 70, 12, 50).color('#7e8487'));
add("case-handle", blk(KX, KY - KD / 2 - 30, 120, 200, 30, 30).color(caseShell));
// Lid hinged along the back edge, swung up past vertical.
add("case-lid", blk(0, -KD / 2, 0, KW, KD, 80).subtract(blk(0, -KD / 2, -20, KW - 40, KD - 40, 80)).rotateX(-105).translate(KX, KY + KD / 2, KH + 20).color(caseShell));
add("lid-foam", blk(0, -KD / 2, 10, KW - 40, KD - 40, 40).rotateX(-105).translate(KX, KY + KD / 2, KH + 20).color('#4a4d50'));

// The analyser, standing on its bumpers, screen toward -Y.
const AX = -60, AY = -260, AW = 240, AD = 110, AH = 360;
const tipBack = (s: Shape) => s.rotateX(-12).translate(AX, AY, 0);
add("analyser-body", tipBack(blk(0, 0, 40, AW, AD, AH)).color(housing));
for (const z of [20, AH + 20]) add(`bumper-${z}`, tipBack(blk(0, 0, z, AW + 30, AD + 30, 50)).color('#1d2023'));
add("screen-bezel", tipBack(blk(0, -AD / 2 - 3, 220, AW - 40, 6, 150)).color('#1d2023'));
add("screen", tipBack(blk(0, -AD / 2 - 6, 235, AW - 70, 4, 120)).color('#1f3a52'));
for (let i = 0; i < 3; i++) add(`screen-bar-${i}`, tipBack(blk(-50 + i * 50, -AD / 2 - 9, 250, 30, 2, 30 + i * 30)).color(['#7ee08a', '#f2c230', '#e6e8e6'][i]));
for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
  add(`key-${r}-${c}`, tipBack(blk(-75 + c * 50, -AD / 2 - 5, 90 + r * 50, 34, 8, 30)).color(r === 0 && c === 3 ? '#c0392b' : '#3b3e40'));
}
add("inlet-nipple", tipBack(cylZ(-60, 0, AH + 70, 50, 12, 8)).color(probeSteel));
add("outlet-nipple", tipBack(cylZ(60, 0, AH + 70, 50, 12, 8)).color(probeSteel));
add("strap-lug-l", tipBack(blk(-AW / 2 - 20, 0, AH - 40, 20, 30, 50)).color('#7e8487'));
add("strap-lug-r", tipBack(blk(AW / 2 + 20, 0, AH - 40, 20, 30, 50)).color('#7e8487'));
line("strap", [[AX - AW / 2 - 20, AY + 40, AH - 10], [AX - AW / 2 - 60, AY + 120, 200], [AX - AW / 2 - 10, AY + 230, 25], [AX + 100, AY + 260, 25], [AX + AW / 2 + 40, AY + 160, 200], [AX + AW / 2 + 20, AY + 40, AH - 10]], 10, '#1d2023');

// Sample hose from the inlet nipple to the probe handle.
const HX = 420, HY = -230, HZ = 1050;
line("sample-hose", [[AX - 60, AY + 85, AH + 115], [AX - 40, AY + 40, AH + 260], [AX + 120, AY - 80, AH + 120], [AX + 300, AY - 160, 60], [HX - 120, HY - 160, 40], [HX - 60, HY - 120, 420], [HX - 20, HY - 40, HZ - 120]], 9, hose);

// Probe wand: T-handle, filter, stainless shaft down into the bar hole.
add("probe-shaft", rod([560, -330, 30], [HX, HY, HZ], 12).color(probeSteel));
add("probe-filter", rod([HX + 14, HY - 10, HZ - 110], [HX, HY, HZ - 10], 26, 12).color('#e6e2d6'));
add("probe-grip", rod([HX - 160, HY - 20, HZ + 20], [HX + 160, HY + 20, HZ + 20], 22, 12).color('#1d2023'));
add("probe-tee", cylZ(HX, HY, HZ - 10, 40, 30, 12).color(probeSteel));

// Bar-hole spike lying on the soil and a marker flag at the last reading.
add("spike-shaft", rod([80, -650, 30], [700, -560, 30], 15).color('#5d6366'));
add("spike-head", cylinder(40, 30, 10).rotateY(90).rotateZ(8).translate(40, -655, 30).color('#5d6366'));
add("flag-pin", cylZ(800, 60, 20, 700, 5, 6).color('#c3c8cb'));
add("flag", blk(890, 60, 560, 180, 3, 120).color('#c0392b'));
add("flag-band", blk(890, 58, 600, 180, 3, 30).color('#f2f2ec'));

return p.model();
