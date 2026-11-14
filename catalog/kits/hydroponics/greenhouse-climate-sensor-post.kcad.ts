// SPDX-License-Identifier: CC0-1.0
// Greenhouse climate sensor post: a freestanding mast that carries the
// sensors a climate computer reads to run vents, heating and screens.
// What makes it a climate post: a weighted cast foot and galvanised mast,
// a louvred stack of white radiation-shield plates on one arm (keeps the
// sun off the temperature/RH probe), an aspirated measuring tube with a
// fan housing on the other arm, a PAR light sensor dome and small solar
// panel on top, and a grey junction box with cable glands half way up.
// Generic visualization geometry at about real size (about 2.2 m tall),
// millimetres, Z up, front -Y.

meta({
  name: "greenhouse-climate-sensor-post",
  license: 'CC0-1.0',
  title: "Greenhouse climate sensor post",
  description: "Freestanding greenhouse climate post at about real size: weighted cast foot, galvanised mast, louvred radiation-shield stack for the temperature/RH probe, aspirated measuring tube with fan housing, PAR sensor dome, small solar panel and a junction box with cable glands. Material controls: mast steel, shield and tube polymer, enclosure and solar panel, plus shield plates (8 or 5). galvanised, weathered and highVisibility presets.",
  tags: ['climate sensor', 'weather station', 'radiation shield', 'PAR sensor', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const mast = param('mastSteel', '#a4abae', { label: 'Mast, foot and arms (galvanised steel)' });
const shield = param('shieldPolymer', '#f1f0ea', { label: 'Radiation shield and measuring tube (UV-stable polymer)' });
const enclosure = param('enclosure', '#7d8589', { label: 'Junction box and fan housing (grey ABS)' });
const solar = param('solarPanel', '#1f3554', { label: 'Solar panel cells' });
const plates = param('shieldPlates', '8', { choices: ['8', '5'], label: 'Shield plates' });

presets({
  galvanised: { mastSteel: '#a4abae', shieldPolymer: '#f1f0ea', enclosure: '#7d8589', solarPanel: '#1f3554' },
  weathered: { mastSteel: '#7f8480', shieldPolymer: '#d2cfc2', enclosure: '#666b68', solarPanel: '#2c3a48' },
  highVisibility: { mastSteel: '#e87832', shieldPolymer: '#fbfaf4', enclosure: '#f2c84b', solarPanel: '#1b2f4f' },
});

const p = assembly("greenhouse-climate-sensor-post");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 16) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// Weighted cast foot and mast.
add("foot", turned([[0, 0], [230, 0], [230, 30], [150, 70], [50, 90], [0, 90]]).color('#4a4f52'));
add("mast", cylZ(0, 0, 80, 2050, 30, 14).color(mast));
add("mast-cap", cylZ(0, 0, 2130, 20, 34, 14).color(mast));

// Junction box half way up, door facing the camera, glands underneath.
add("jbox-bracket", blk(0, -45, 880, 90, 30, 300).color(mast));
add("jbox", extrudeRoundedRect(240, 300, 20, 120, { axis: 'y' }).translate(0, -180, 1030).color(enclosure));
add("jbox-door", extrudeRoundedRect(210, 270, 14, 8, { axis: 'y' }).translate(0, -188, 1030).color('#9aa1a4'));
add("jbox-latch", blk(80, -194, 1020, 14, 10, 40).color('#3a3d40'));
for (const x of [-70, 0, 70]) add(`gland-${x}`, cylZ(x, -120, 850, 30, 13, 8).color('#2a2c2e'));
add("cable-up", cylZ(0, -60, 1180, 330, 7, 6).color('#2a2c2e'));

// Cross-arm with the shield on +X and the aspirated tube on -X.
const AZ = 1500;
add("cross-arm", cylX(-560, 0, AZ, 1120, 18, 10).color(mast));
add("arm-clamp", blk(0, 0, AZ - 50, 90, 90, 100).color(mast));

// Louvred radiation shield: conical plates stacked on three rods.
const n = Number(plates.value);
const SX = 420, top = AZ - 30;
add("shield-mount", blk(SX, 0, AZ - 30, 60, 60, 50).color(mast));
const plate: [number, number][] = [[0, 0], [110, -26], [110, -32], [0, -8]];
for (let k = 0; k < n; k++) add(`shield-plate-${k}`, turned(plate).translate(SX, 0, top - k * 32).color(shield));
add("shield-cap", turned([[0, 30], [125, -6], [125, -14], [0, 16]]).translate(SX, 0, top).color(shield));
for (const a of [0, 120, 240]) {
  const r = 80, ax = SX + r * Math.cos((a * Math.PI) / 180), ay = r * Math.sin((a * Math.PI) / 180);
  add(`shield-rod-${a}`, cylZ(ax, ay, top - n * 32 - 10, n * 32 + 20, 4, 6).color(mast));
}
add("probe-tail", cylZ(SX, 0, top - n * 32 - 90, 80, 9, 8).color('#2a2c2e'));

// Aspirated measuring tube with fan housing (front intake toward -Y).
const TX = -420;
add("tube-hanger", cylZ(TX, 0, AZ - 120, 120, 8, 8).color(mast));
add("measuring-tube", cylinder(380, 60, 18).rotateX(90).translate(TX, 190, AZ - 180).color(shield));
add("tube-intake", turned([[60, 0], [72, 0], [72, 30], [60, 30]], 18).rotateX(90).translate(TX, -160, AZ - 180).color(shield));
add("fan-housing", extrudeRoundedRect(170, 170, 30, 110, { axis: 'y' }).translate(TX, 190, AZ - 180).color(enclosure));
add("fan-grille", cylinder(8, 62, 18).rotateX(90).translate(TX, 308, AZ - 180).color('#2a2c2e'));

// PAR sensor dome and small solar panel on top.
add("par-arm", blk(0, 0, 2130, 40, 40, 90).color(mast));
add("par-body", cylZ(0, 0, 2220, 30, 32, 14).color(shield));
add("par-dome", sphere(24).translate(0, 0, 2252).color('#e8f1f4'));
add("solar-bracket", blk(0, 60, 1960, 40, 70, 120).color(mast));
add("solar-frame", box(320, 240, 22, true).rotateX(35).translate(0, 120, 2070).color('#b9bec1'));
add("solar-cells", box(296, 216, 6, true).rotateX(35).translate(0, 116, 2085).color(solar));

return p.model();
