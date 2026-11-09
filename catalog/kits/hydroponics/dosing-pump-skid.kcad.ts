// SPDX-License-Identifier: CC0-1.0
// Dosing pump skid: the packaged chemical dosing station that meters acid,
// base or concentrated nutrient into the irrigation water from day tanks.
// What makes it a dosing skid: diaphragm metering pumps (motor on top, stroke
// knob and display on the front, dosing head with suction and discharge
// valves on the side) bolted to a backboard frame, each drawing through a
// suction line from its own labelled day tank standing in a bunded spill
// tray, calibration columns below the pumps, and the discharge lines rising
// into a common header with a pressure relief valve and pulsation damper,
// plus the local control panel.
// Generic visualization geometry at about real size (about 1.3 m wide,
// 1.7 m tall), millimetres, Z up, front toward -Y.

meta({
  name: "dosing-pump-skid",
  license: 'CC0-1.0',
  title: "Dosing pump skid",
  description: "Chemical dosing skid at about real size: two or three diaphragm metering pumps with motor, stroke knob, display and dosing head on a steel backboard frame, each fed from a labelled day tank with cap and level strip standing in a bunded spill tray, calibration columns, discharge lines into a header with pressure relief valve and pulsation damper, and a local control panel. Material controls: frame, day tanks, pump housing, spill bund, plus a two or three pump choice. industrial, nutrientGreen, stainless and weathered presets.",
  tags: ['dosing', 'dosing pump', 'metering pump', 'diaphragm pump', 'chemical dosing', 'pH dosing', 'skid', 'day tank', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#5c7d73', { label: 'Frame and backboard (powder-coated steel)' });
const tank = param('tank', '#e8e4d6', { label: 'Day tanks (natural polyethylene)' });
const pump = param('pumpHousing', '#d8dcdf', { label: 'Pump housing (glass-filled polymer)' });
const bund = param('bund', '#e3b52c', { label: 'Spill bund (yellow polyethylene)' });
const heads = param('pumps', 'two', { choices: ['two', 'three'], label: 'Metering pumps' });

presets({
  industrial: { frame: '#5c7d73', tank: '#e8e4d6', pumpHousing: '#d8dcdf', bund: '#e3b52c' },
  nutrientGreen: { frame: '#2f5d3a', tank: '#f0eee4', pumpHousing: '#3f7d4c', bund: '#3b3f42' },
  stainless: { frame: '#b9c0c4', tank: '#dfe3e2', pumpHousing: '#eef0f0', bund: '#8c969b' },
  weathered: { frame: '#6d746d', tank: '#d2c9a8', pumpHousing: '#b8b6a8', bund: '#b8963a' },
});

const p = assembly("dosing-pump-skid");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 18) => {
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

const three = heads.value === 'three';
const xs = three ? [-400, 0, 400] : [-260, 260];
const chem = three
  ? [{ cap: '#c0392b', tag: 'acid' }, { cap: '#2f6fa8', tag: 'base' }, { cap: '#4f9a3a', tag: 'nutrient' }]
  : [{ cap: '#c0392b', tag: 'acid' }, { cap: '#2f6fa8', tag: 'base' }];
const TR = three ? 175 : 220; // day tank radius
const TY = -90; // day tank centre line
const TH = 620; // day tank top
const PZ = 1000; // pump shelf top
const PY = 130; // pump body front face

// Bunded spill tray: an open tub the tanks stand in.
add("bund-tray", blk(0, -80, 0, 1300, 740, 220).subtract(blk(0, -80, 20, 1240, 680, 220)).color(bund));
add("bund-lip", blk(0, -452, 200, 1300, 10, 20).color(bund));
add("bund-label", blk(0, -456, 90, 300, 4, 70).color('#22262a'));

// Backboard frame behind the tray.
for (const sx of [-1, 1]) {
  add(`post-${sx > 0 ? 'r' : 'l'}`, blk(sx * 620, 320, 0, 60, 60, 1720).color(frame));
  add(`foot-${sx > 0 ? 'r' : 'l'}`, blk(sx * 620, 250, 0, 120, 260, 12).color(frame));
}
add("backboard", blk(0, 310, 650, 1180, 20, 1010).color(frame));
add("top-rail", blk(0, 320, 1660, 1300, 60, 60).color(frame));

for (const [i, x] of xs.entries()) {
  const t = `p${i + 1}`;
  const c = chem[i];
  // Day tank: turned drum with filler cap, level strip and hazard diamond.
  add(`${t}-tank`, turned([[0, 20], [TR - 8, 20], [TR, 50], [TR, TH - 40], [TR - 30, TH], [0, TH]]).translate(x, TY, 0).color(tank));
  add(`${t}-cap`, cylZ(x + TR * 0.35, TY, TH - 6, 40, 60, 14).color(c.cap));
  add(`${t}-suction-gland`, cylZ(x - 40, TY + 40, TH - 6, 30, 28, 10).color('#3b3f42'));
  add(`${t}-level-strip`, blk(x - TR * 0.55, TY - TR * 0.82, 80, 24, 6, TH - 160).color('#9ca39c'));
  add(`${t}-hazard`, box(80, 6, 80, true).rotateY(45).translate(x, TY - TR * 0.985 - 1, 380).color(c.cap));
  add(`${t}-hazard-core`, box(46, 6, 46, true).rotateY(45).translate(x, TY - TR * 0.985 - 4, 380).color('#f2f2ec'));
  // Pump shelf bracket on the backboard.
  add(`${t}-shelf`, blk(x, PY + 80, PZ - 30, 260, 170, 30).color(frame));
  add(`${t}-gusset`, blk(x, PY + 140, PZ - 140, 20, 60, 110).color(frame));
  // Metering pump: rounded body, motor on top, stroke knob and display.
  add(`${t}-body`, extrudeRoundedRect(220, 200, 22, 165, { axis: 'y' }).translate(x, PY, PZ + 100).color(pump));
  add(`${t}-motor`, cylZ(x + 35, PY + 85, PZ + 200, 150, 58, 16).color('#3b3f42'));
  add(`${t}-motor-cap`, cylZ(x + 35, PY + 85, PZ + 350, 14, 50, 16).color('#22262a'));
  add(`${t}-display`, blk(x + 40, PY - 2, PZ + 120, 100, 4, 60).color('#3d5b4a'));
  add(`${t}-stroke-knob`, cylY(x - 45, PY, PZ + 140, 34, 34, 14).color('#22262a'));
  add(`${t}-stroke-mark`, blk(x - 45, PY - 36, PZ + 158, 6, 4, 18).color('#f2f2ec'));
  add(`${t}-keys`, blk(x + 40, PY - 2, PZ + 40, 100, 6, 30).color(c.cap));
  // Dosing head on the -X side with suction (bottom) and discharge (top) valves.
  add(`${t}-head`, cylX(x - 152, PY + 80, PZ + 100, 44, 62, 16).color('#e9ece8'));
  add(`${t}-head-bolts`, cylX(x - 160, PY + 80, PZ + 100, 8, 50, 6).color('#8f989e'));
  add(`${t}-suction-valve`, cylZ(x - 130, PY + 80, PZ + 10, 34, 16, 8).color('#5a6066'));
  add(`${t}-discharge-valve`, cylZ(x - 130, PY + 80, PZ + 156, 34, 16, 8).color('#5a6066'));
  // Suction line down into the tank, calibration column with ball valve.
  add(`${t}-suction-line`, rod([x - 130, PY + 80, PZ + 12], [x - 40, TY + 40, TH + 20], 7).color('#eef0ea'));
  add(`${t}-cal-column`, cylZ(x + 60, PY + 70, 700, 220, 26, 12).color('#d9e4e6'));
  for (let k = 0; k < 4; k++) add(`${t}-cal-mark-${k}`, blk(x + 60, PY + 42, 740 + k * 45, 26, 4, 4).color('#3b3f42'));
  add(`${t}-cal-valve`, cylX(x - 20, PY + 70, 720, 80, 10, 8).color('#5a6066'));
  add(`${t}-cal-lever`, blk(x + 10, PY + 30, 728, 14, 60, 10).color('#c0392b'));
  // Discharge up into the header.
  add(`${t}-discharge-line`, cylZ(x - 130, PY + 80, PZ + 190, 1460 - PZ - 190, 8, 8).color('#eef0ea'));
  add(`${t}-tag`, blk(x, 298, 1360, 160, 4, 50).color(c.cap));
}

// Common discharge header with relief valve and pulsation damper.
const HX0 = xs[0] - 180;
const HX1 = 600;
add("header", cylX(HX0, PY + 80, 1470, HX1 - HX0, 18, 12).color('#8f989e'));
add("header-cap", cylX(HX0 - 12, PY + 80, 1470, 12, 24, 12).color('#5a6066'));
for (const x of [HX0 + 60, 460]) add(`header-clamp-${x}`, blk(x, PY + 160, 1440, 30, 160, 60).color(frame));
add("damper", turned([[0, 0], [24, 0], [24, 30], [70, 60], [70, 160], [40, 200], [0, 210]]).translate(xs[0] + 90, PY + 80, 1488).color('#c9ced1'));
add("relief-valve", cylZ(xs[xs.length - 1] + 90, PY + 80, 1488, 90, 24, 10).color('#c9a43a'));
add("relief-cap", cylZ(xs[xs.length - 1] + 90, PY + 80, 1578, 30, 32, 10).color('#c0392b'));
add("outlet-valve", cylX(530, PY + 80, 1470, 60, 32, 12).color('#5a6066'));
add("outlet-lever", blk(560, PY + 30, 1505, 20, 100, 12).color('#c0392b'));
add("outlet-gauge", cylY(430, PY + 40, 1530, 20, 40, 14).color('#22262a'));
add("outlet-gauge-face", cylY(430, PY + 20, 1530, 4, 34, 14).color('#f2f2ec'));

// Local control panel on the outside of the right post.
add("panel", extrudeRoundedRect(180, 280, 14, 110, { axis: 'y' }).translate(745, 180, 1180).color('#e9ece8'));
add("panel-isolator", cylY(745, 180, 1250, 24, 36, 12).color('#e3b52c'));
add("panel-isolator-handle", blk(745, 150, 1250, 70, 10, 18).color('#c0392b'));
add("panel-lamp-run", cylY(715, 180, 1130, 14, 14, 10).color('#4f9a3a'));
add("panel-lamp-fault", cylY(775, 180, 1130, 14, 14, 10).color('#c0392b'));
add("panel-gland", cylZ(745, 235, 1000, 40, 18, 10).color('#3b3f42'));

return p.model();
