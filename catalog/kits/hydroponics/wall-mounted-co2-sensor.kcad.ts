// SPDX-License-Identifier: CC0-1.0
// Wall-mounted CO2 sensor: the NDIR carbon-dioxide transmitter a grow-room
// controller reads to dose CO2 and run the extract fans. What makes it a
// CO2 transmitter rather than a plain box: a slim rounded housing on a
// screw-down wall plate, a backlit LCD reading out ppm, a status LED and
// two calibration buttons, a slotted vent grille over the diffusion
// chamber on the front and sides (the gas has to reach the sensor), and a
// cable gland at the bottom feeding a 4-20 mA signal cable down into
// conduit. Generic visualization geometry at about real size (about
// 90 x 140 mm housing), millimetres, Z up, front -Y.

meta({
  name: "wall-mounted-co2-sensor",
  license: 'CC0-1.0',
  title: "Wall-mounted CO2 sensor",
  description: "Wall-mounted NDIR CO2 transmitter at about real size: slim rounded housing on a screw-down wall plate, backlit ppm LCD with status LED and calibration buttons, slotted front and side vent grilles over the diffusion chamber, and a bottom cable gland feeding signal cable into conduit. Material controls: housing, vent and plate trim, LCD backlight and cable, plus display (LCD or blind). standard, darkHousing, weathered and highVisibility presets.",
  tags: ['CO2 sensor', 'NDIR', 'transmitter', 'grow room', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#eceae4', { label: 'Housing (white ABS)' });
const trim = param('trim', '#6f777c', { label: 'Vent grille, wall plate and gland (grey polymer)' });
const lcd = param('lcdBacklight', '#9fd0a8', { label: 'LCD backlight' });
const cable = param('cable', '#26282a', { label: 'Signal cable and conduit' });
const display = param('display', 'LCD', { choices: ['LCD', 'blind'], label: 'Display' });

presets({
  standard: { housing: '#eceae4', trim: '#6f777c', lcdBacklight: '#9fd0a8', cable: '#26282a' },
  darkHousing: { housing: '#3a3f44', trim: '#1f2326', lcdBacklight: '#7fc4e8', cable: '#26282a' },
  weathered: { housing: '#cfc9b8', trim: '#5e6463', lcdBacklight: '#a9bb8f', cable: '#3a3a36' },
  highVisibility: { housing: '#f2c84b', trim: '#e87832', lcdBacklight: '#c8f0b0', cable: '#1b1b1b' },
});

const p = assembly("wall-mounted-co2-sensor");
// Lifted so the conduit end rests on z = 0.
const add = (name: string, shape: Shape) => p.part(name, shape.translate(0, 0, 70).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: [number, number][], seg = 12) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// Wall plate (wall at y = 0) with two screw ears.
add("wall-plate", extrudeRoundedRect(104, 170, 8, 6, { axis: 'y' }).translate(0, -6, 110).color(trim));
for (const z of [35, 185]) add(`screw-${z}`, cylinder(3, 5, 8).rotateX(90).translate(0, -6, z).color('#b8bcbe'));

// Housing: a rounded body with a slightly smaller front bezel.
const ZC = 110;
add("housing", extrudeRoundedRect(90, 140, 12, 30, { axis: 'y' }).translate(0, -36, ZC).color(housing));
add("bezel", extrudeRoundedRect(84, 134, 10, 4, { axis: 'y' }).translate(0, -40, ZC).color(housing));

// Display window, digits and status/buttons in the upper half.
if (display.value === 'LCD') {
  add("lcd-window", blk(0, -41, 128, 64, 2, 34).color(lcd));
  // "800" in chunky segment bars + a small ppm tag.
  const digit = (x0: number, middle: boolean) => [
    blk(x0, -42.5, 156, 12, 1, 2.5), blk(x0, -42.5, 131, 12, 1, 2.5),
    ...(middle ? [blk(x0, -42.5, 143.5, 12, 1, 2.5)] : []),
    blk(x0 - 6, -42.5, 131, 2.5, 1, 27.5), blk(x0 + 6, -42.5, 131, 2.5, 1, 27.5),
  ];
  [-18, -2, 14].forEach((x, i) => digit(x, i === 0).forEach((s, j) => add(`digit-${i}-${j}`, s.color('#1d2a22'))));
  add("ppm-tag", blk(25, -42.5, 132, 6, 1, 6).color('#1d2a22'));
} else {
  add("blind-label", blk(0, -41, 128, 64, 2, 34).color(trim));
}
add("status-led", cylinder(2, 3.5, 8).rotateX(90).translate(-30, -41, 110).color('#46d46a'));
for (const x of [10, 28]) add(`button-${x}`, cylinder(3, 5, 10).rotateX(90).translate(x, -41, 110).color(trim));

// Vent grille over the diffusion chamber: raised slot ribs on the front.
add("grille-panel", blk(0, -41.5, 52, 70, 2, 40).color(trim));
for (let k = 0; k < 5; k++) add(`grille-slot-${k}`, blk(0, -43, 57 + k * 7, 60, 1.5, 3).color('#2a2e31'));
for (const x of [-46, 46]) {
  for (let k = 0; k < 4; k++) add(`side-slot-${x}-${k}`, blk(x, -21, 58 + k * 8, 1.5, 18, 3).color('#2a2e31'));
}

// Bottom cable gland, signal cable and a short run of conduit.
add("gland-nut", turned([[0, 0], [9, 0], [9, 8], [0, 8]], 6).rotateX(180).translate(0, -21, 40).color(trim));
add("gland-dome", turned([[0, 0], [7, 0], [5, -10], [0, -12]], 10).translate(0, -21, 32).color(trim));
add("signal-cable", cylZ(0, -21, -2, 34, 3, 8).color(cable));
add("conduit-coupler", cylZ(0, -21, -18, 18, 9, 10).color(cable));
add("conduit", cylZ(0, -21, -70, 52, 8, 10).color(cable));
add("conduit-clip", blk(0, -11, -50, 26, 20, 8).color(trim));

return p.model();
