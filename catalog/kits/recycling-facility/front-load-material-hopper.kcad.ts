// SPDX-License-Identifier: CC0-1.0
// Front-load material hopper: the receiving hopper a wheel loader tips mixed
// recyclables into at the head of a sorting line. What makes it that hopper
// rather than a bin: a wide flared pyramid mouth on four braced columns, open
// to the loader on the low -Y side and walled on the back and sides with
// splash wings, a rubber curtain on the tipping lip, a concrete tyre-stop kerb
// with hazard chevrons in front, and an apron-pan feeder under the throat that
// carries the load out to a gearmotor head on +X and drops it down a chute.
// Generic visualization geometry at about real size (3 m mouth, 3 m tall),
// millimetres, Z up, loader side on -Y.

meta({
  name: "front-load-material-hopper",
  license: 'CC0-1.0',
  title: "Front-load material hopper",
  description: "Loader-fed receiving hopper at about real size: flared pyramid mouth on four braced columns, back and side splash wings, rubber tipping-lip curtain, concrete tyre-stop kerb with hazard chevrons, a heap of mixed recyclables in the throat, and an apron-pan feeder carrying it to a gearmotor head and discharge chute. High or low splash wings. Material controls: hopper, structure, feeder pans and load. mrf, weathered and greenWaste presets.",
  tags: ["recycling", "hopper", "receiving hopper", "loader", "apron feeder", "infeed", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hopper = param('hopper', '#2f6b8f', { label: 'Hopper and wings (paint)' });
const structure = param('structure', '#e0a526', { label: 'Columns and feeder frame (paint)' });
const feeder = param('feeder', '#3a3d40', { label: 'Apron feeder pans (steel)' });
const load = param('load', '#9a8b6a', { label: 'Mixed recyclables load' });
const wings = param('wings', 'high', { choices: ['high', 'low'], label: 'Splash wing height' });

presets({
  mrf: { hopper: '#2f6b8f', structure: '#e0a526', feeder: '#3a3d40', load: '#9a8b6a' },
  weathered: { hopper: '#5d6a6e', structure: '#a88a4a', feeder: '#4a3c30', load: '#857a62' },
  greenWaste: { hopper: '#3f6e3a', structure: '#c9ccc6', feeder: '#3a3d40', load: '#6b5a2e' },
});

const p = assembly("front-load-material-hopper");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rodXZ = (x0: number, z0: number, x1: number, z1: number, y: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

// Pyramid mouth: throat 2200 x 700 at Z0, mouth 3000 x 2000 at Z1.
const Z0 = 1300;
const Z1 = 2400;
const BW = 2200, BD = 700, TW = 3000, TD = 2000, T = 40;
const lerp = (a: number, b: number, z: number) => a + ((b - a) * (z - Z0)) / (Z1 - Z0);
const outer = rect(BW, BD).loft([rect(TW, TD)], { planes: [plane(Z0), plane(Z1)], ruled: true });
const zi0 = Z0 - 20, zi1 = Z1 + 20;
const inner = rect(lerp(BW, TW, zi0) - 2 * T, lerp(BD, TD, zi0) - 2 * T).loft([rect(lerp(BW, TW, zi1) - 2 * T, lerp(BD, TD, zi1) - 2 * T)], { planes: [plane(zi0), plane(zi1)], ruled: true });
add("hopper-shell", outer.subtract(inner).color(hopper));
// Rim stiffener band round the mouth.
add("rim-front", blk(0, -TD / 2 - 40, Z1 - 160, TW + 160, 80, 160).color(structure));
add("rim-back", blk(0, TD / 2 + 40, Z1 - 160, TW + 160, 80, 160).color(structure));
for (const [s, sx] of [['l', -1], ['r', 1]] as const) add(`rim-${s}`, blk(sx * (TW / 2 + 40), 0, Z1 - 160, 80, TD, 160).color(structure));

// Load heaped in the throat and spilling up the mouth.
add("load-heap", sphere(1000).scale([1.15, 0.66, 0.5]).translate(0, 60, 1950).color(load));
const bits: [number, number, number, number, string][] = [
  [-500, -150, 2330, 120, '#3c7fc0'], [300, -80, 2380, 90, '#e8e4d6'], [-100, 250, 2400, 140, '#b0402c'],
  [650, 200, 2280, 110, '#5aa04a'], [-800, 120, 2230, 100, '#d9c27a'], [150, 120, 2430, 80, '#c9ccce'],
];
bits.forEach(([x, y, z, s, c], k) => add(`load-bit-${k}`, box(s * 1.6, s, s * 0.7, true).rotateZ(k * 37).rotateX(12).translate(x, y, z).color(c)));

// Splash wings: back wall and two sloping side wings, tipping lip open on -Y.
const WH = wings.value === 'high' ? 700 : 300;
add("back-wing", profileXZ([[-TW / 2 - 80, Z1], [TW / 2 + 80, Z1], [TW / 2 + 80, Z1 + WH - 150], [TW / 2 - 70, Z1 + WH], [-TW / 2 + 70, Z1 + WH], [-TW / 2 - 80, Z1 + WH - 150]], 60).translate(0, TD / 2 + 50, 0).color(hopper));
for (const [s, sx] of [['l', -1], ['r', 1]] as const) {
  add(`side-wing-${s}`, profileYZ([[-TD / 2, Z1], [TD / 2 + 80, Z1], [TD / 2 + 80, Z1 + WH], [-TD / 2 + 500, Z1 + 120], [-TD / 2, Z1 + 120]], 60).translate(sx * (TW / 2 + 50), 0, 0).color(hopper));
  add(`wing-stiffener-${s}`, blk(sx * (TW / 2 + 95), TD / 2 - 300, Z1, 30, 80, WH - 60).color(structure));
}
add("back-wing-stiffener-l", blk(-700, TD / 2 + 95, Z1, 80, 30, WH - 60).color(structure));
add("back-wing-stiffener-r", blk(700, TD / 2 + 95, Z1, 80, 30, WH - 60).color(structure));
// Sign on the back wing facing the loader driver.
add("tip-sign", blk(0, TD / 2 + 12, Z1 + WH * 0.25, 900, 10, WH * 0.5).color('#f2f0e6'));
add("tip-sign-band", blk(0, TD / 2 + 4, Z1 + WH * 0.25 + WH * 0.32, 900, 10, WH * 0.12).color('#c8322a'));
// Rubber curtain on the tipping lip.
for (let k = 0; k < 10; k++) add(`lip-flap-${k}`, blk(-TW / 2 + 150 + k * 300, -TD / 2 - 95, Z1 - 320, 280, 14, 320).color('#1c1d1e'));

// Four braced columns.
const CX = TW / 2 - 60, CY = TD / 2 - 60;
for (const [s, sx, sy] of [['fl', -1, -1], ['fr', 1, -1], ['bl', -1, 1], ['br', 1, 1]] as const) {
  add(`column-${s}`, blk(sx * CX, sy * CY, 0, 200, 200, Z1 - 160).color(structure));
  add(`base-plate-${s}`, blk(sx * CX, sy * CY, 0, 340, 340, 20).color('#5d6366'));
}
for (const [s, sy] of [['f', -1], ['b', 1]] as const) {
  add(`brace-${s}-a`, rodXZ(-CX, 200, -300, Z0 - 300, sy * (CY + 110), 70).color(structure));
  add(`brace-${s}-b`, rodXZ(CX, 200, 300, Z0 - 300, sy * (CY + 110), 70).color(structure));
}
add("tie-beam-f", blk(0, -CY - 110, Z0 - 300, 2 * CX, 70, 120).color(structure));
add("tie-beam-b", blk(0, CY + 110, Z0 - 300, 2 * CX, 70, 120).color(structure));

// Apron-pan feeder under the throat, running out to +X.
const FX0 = -BW / 2 - 200, FX1 = 2700, FZ = Z0 - 60;
add("feeder-frame-f", blk((FX0 + FX1) / 2, -420, FZ - 380, FX1 - FX0, 60, 420).color(structure));
add("feeder-frame-b", blk((FX0 + FX1) / 2, 420, FZ - 380, FX1 - FX0, 60, 420).color(structure));
for (let k = 0; k < 18; k++) add(`apron-pan-${k}`, blk(FX0 + 110 + k * 210, 0, FZ - 40, 196, 780, 50).color(k % 2 ? feeder : '#55595c'));
add("tail-shaft", cylinder(900, 70, 10).rotateX(90).translate(FX0 + 80, 450, FZ - 160).color('#5d6366'));
for (const x of [-200, 1900]) add(`feeder-leg-f-${x}`, blk(x, -420, 0, 140, 140, FZ - 380).color(structure));
for (const x of [-200, 1900]) add(`feeder-leg-b-${x}`, blk(x, 420, 0, 140, 140, FZ - 380).color(structure));
add("feeder-leg-head-f", blk(FX1 - 120, -420, 0, 140, 140, FZ - 380).color(structure));
add("feeder-leg-head-b", blk(FX1 - 120, 420, 0, 140, 140, FZ - 380).color(structure));
// Head sprocket, gearmotor on the -Y side, and discharge chute.
add("head-shaft", cylinder(1100, 90, 12).rotateX(90).translate(FX1 - 120, 550, FZ - 160).color('#5d6366'));
add("gearbox", blk(FX1 - 120, -620, FZ - 400, 360, 220, 420).color(structure));
add("gear-motor", cylinder(520, 160, 14).rotateY(90).translate(FX1 - 680, -640, FZ - 190).color('#2c5ea8'));
add("motor-cowl", cylinder(80, 165, 14).rotateY(90).translate(FX1 - 760, -640, FZ - 190).color('#2b2e30'));
add("chute", profileYZ([[-480, FZ - 400], [480, FZ - 400], [380, 500], [-380, 500]], 600).translate(FX1 + 300, 0, 0).color(hopper));
add("chute-skirt", blk(FX1 + 300, 0, 380, 640, 820, 120).color('#1c1d1e'));

// Concrete tyre-stop kerb with hazard chevrons on the loader side.
const KY = -TD / 2 - 900;
add("tyre-kerb", blk(0, KY, 0, TW + 400, 400, 320).color('#a7a49c'));
for (let k = 0; k < 9; k++) add(`kerb-chevron-${k}`, box(120, 8, 200, true).rotateY(35).translate(-1500 + k * 375, KY - 204, 160).color(k % 2 ? '#1c1d1e' : '#f0c419'));
add("kerb-cap", blk(0, KY, 320, TW + 400, 400, 20).color('#f0c419'));

return p.model();
