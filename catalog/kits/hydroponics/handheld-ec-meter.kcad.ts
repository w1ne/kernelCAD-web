// SPDX-License-Identifier: CC0-1.0
// Handheld EC meter: the pocket conductivity tester a grower dips in the
// reservoir to check nutrient strength, shown on a bench tray mid-reading.
// What makes it an EC meter: either a flat pen-style tester with an LCD near
// the top, two keys and a recessed electrode foot, or a long round
// "truncheon" wand that shows strength as a column of LEDs, standing in a
// sample cup of nutrient solution; its protective cap lying beside it, and
// a bottle of EC calibration standard on the tray.
// Generic visualization geometry at real size (pen 30 x 180 mm, truncheon
// 30 x 330 mm), millimetres, Z up, display toward -Y.

meta({
  name: "handheld-ec-meter",
  license: 'CC0-1.0',
  title: "Handheld EC meter",
  description: "Pocket conductivity (EC/TDS) tester at real size, standing in a sample cup of nutrient solution on a bench tray: either a pen tester with LCD, keys and electrode foot, or a truncheon wand with a column of LED strength indicators; protective cap and an EC calibration standard bottle beside it. Material controls: housing, trim, display and sample solution, plus a pen or truncheon style choice. classicWhite, blueTruncheon, blackPocket and weathered presets.",
  tags: ['ec meter', 'tds meter', 'conductivity', 'ec pen', 'truncheon', 'nutrient testing', 'calibration', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#eef0ec', { label: 'Housing (ABS)' });
const trim = param('trim', '#2f6fa8', { label: 'Cap and keys (rubberised polymer)' });
const display = param('display', '#a9bfa0', { label: 'Display (LCD)' });
const solution = param('solution', '#9fc36a', { label: 'Sample solution' });
const style = param('style', 'pen', { choices: ['pen', 'truncheon'], label: 'Meter style' });

presets({
  classicWhite: { housing: '#eef0ec', trim: '#2f6fa8', display: '#a9bfa0', solution: '#9fc36a' },
  blueTruncheon: { housing: '#2f6fa8', trim: '#22262a', display: '#b6c8b0', solution: '#7fb3c9' },
  blackPocket: { housing: '#2a2d30', trim: '#e0a21c', display: '#9fb7a6', solution: '#b9c96a' },
  weathered: { housing: '#cfcbbf', trim: '#5f7a8e', display: '#8f9c86', solution: '#9aa78a' },
});

const p = assembly("handheld-ec-meter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: [number, number][], seg = 16) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// Bench tray.
add("tray", extrudeRoundedRect(300, 200, 18, 8, { axis: 'z' }).translate(40, 10, 0).color('#3b3f42'));
add("tray-lip", extrudeRoundedRect(300, 200, 18, 14, { axis: 'z' }).subtract(extrudeRoundedRect(286, 186, 12, 20, { axis: 'z' }).translate(0, 0, -2)).translate(40, 10, 0).color('#3b3f42'));

// Sample cup of nutrient solution, the meter standing in it.
const CX = -40, CY = 0, CZ = 8;
add("sample-cup", turned([[0, 0], [34, 0], [40, 95], [37, 95], [31, 3], [0, 3]], 18).translate(CX, CY, CZ).color('#e9eae6'));
add("sample", turned([[0, 0], [31, 0], [36, 82], [0, 82]], 18).translate(CX, CY, CZ + 3).color(solution));
for (let k = 0; k < 3; k++) add(`cup-mark-${k}`, blk(CX - 12, CY - 37 - k * 0.6, CZ + 30 + k * 20, 12, 1, 1.5).color('#4a5a66'));

// The meter is built upright with its foot at the origin, then leaned back
// against the cup rim (top toward +Y) and dropped into the cup.
const lean = (s: Shape) => s.rotateX(-10).translate(CX, CY - 6, CZ + 12);

if (style.value === 'pen') {
  // Flat pen tester: electrode foot, body, LCD, two keys, battery cap.
  add("electrode-sleeve", lean(cylZ(0, 0, 0, 40, 11, 14)).color(housing));
  add("electrode-pin-a", lean(cylZ(-4, 0, -2, 8, 1.6, 6)).color('#c9ced1'));
  add("electrode-pin-b", lean(cylZ(4, 0, -2, 8, 1.6, 6)).color('#c9ced1'));
  add("pen-body", lean(extrudeRoundedRect(34, 140, 10, 22, { axis: 'y' }).translate(0, -11, 110)).color(housing));
  add("grip-band", lean(extrudeRoundedRect(36, 26, 10, 24, { axis: 'y' }).translate(0, -12, 60)).color(trim));
  add("display-bezel", lean(blk(0, -11.5, 128, 28, 2, 40)).color('#2a2d30'));
  add("display", lean(blk(0, -12.6, 132, 24, 1, 32)).color(display));
  for (const [z, w] of [[150, 14], [140, 14]]) add(`digit-row-${z}`, lean(blk(-2, -13.2, z, w, 0.6, 3)).color('#1f2a1c'));
  for (const z of [142, 152]) add(`digit-stroke-${z}`, lean(blk(5, -13.2, z, 2, 0.6, 9)).color('#1f2a1c'));
  add("units-legend", lean(blk(8, -13.2, 160, 6, 0.6, 3)).color('#1f2a1c'));
  add("key-on", lean(cylinder(3, 5, 10).rotateX(90).translate(-7, -11, 105)).color(trim));
  add("key-cal", lean(cylinder(3, 5, 10).rotateX(90).translate(7, -11, 105)).color(trim));
  add("battery-cap", lean(extrudeRoundedRect(34, 16, 8, 22, { axis: 'y' }).translate(0, -11, 188)).color(trim));
  add("pocket-clip", lean(blk(0, 13, 150, 8, 3, 46)).color('#c9ced1'));
  // Protective cap lying on the tray.
  add("cap", cylinder(46, 12, 14).rotateY(90).translate(40, -50, 21).color(trim));
  add("cap-end", sphere(12).translate(86, -50, 21).subtract(blk(76, -50, 0, 20, 30, 50)).color(trim));
} else {
  // Truncheon wand: long round tube, LED strength column, sensor foot.
  add("sensor-foot", lean(cylZ(0, 0, 0, 36, 14, 14)).color('#2a2d30'));
  add("sensor-ring", lean(cylZ(0, 0, -2, 4, 6, 10)).color('#c9ced1'));
  add("wand", lean(cylZ(0, 0, 36, 260, 15, 16)).color(housing));
  add("grip", lean(cylZ(0, 0, 110, 70, 16, 16)).color(trim));
  add("led-window", lean(blk(0, -13, 196, 14, 6, 92)).color('#2a2d30'));
  const lit = 6;
  for (let k = 0; k < 10; k++) {
    const col = k === lit ? '#e8862b' : k < 3 ? display : k < 8 ? '#5c7d55' : '#7a4a42';
    add(`led-${k}`, lean(cylinder(2, 3.2, 8).rotateX(90).translate(0, -16, 202 + k * 8.6)).color(col));
  }
  add("end-cap", lean(turned([[0, 0], [15, 0], [15, 10], [10, 18], [0, 20]], 16).translate(0, 0, 296)).color(trim));
  add("lanyard-loop", lean(torus(10, 2, 12).rotateY(90).translate(0, 0, 326)).color('#22262a'));
  // Wand's protective sensor cap lying on the tray.
  add("cap", cylinder(40, 16, 14).rotateY(90).translate(40, -50, 25).color(trim));
}

// EC calibration standard bottle.
add("cal-bottle", turned([[0, 0], [30, 0], [30, 120], [14, 136], [12, 146], [0, 146]], 16).translate(130, 40, 8).color('#f2f2ee'));
add("cal-cap", cylZ(130, 40, 152, 18, 14, 12).color(trim));
add("cal-label", cylinder(60, 30.6, 16).subtract(cylinder(64, 26, 16).translate(0, 0, -2)).subtract(blk(0, 26, -4, 80, 40, 70)).translate(130, 40, 40).color('#e3b52c'));
add("cal-label-band", blk(130, 9, 78, 30, 1, 8).color('#2a2d30'));

return p.model();
