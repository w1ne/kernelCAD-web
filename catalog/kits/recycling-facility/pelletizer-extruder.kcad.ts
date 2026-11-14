// SPDX-License-Identifier: CC0-1.0
// Pelletizer extruder: the line that turns washed plastic flake back into
// pellets. What makes it that machine rather than a cabinet: a big motor
// and reduction gearbox driving a long horizontal barrel wrapped in
// heater bands, a feed hopper over the throat, a vent stack part way
// along, a hydraulic screen changer and die head at the end, molten
// strands running through a long water bath to a strand pelletizer, and
// the pellet bin and control cabinet beside it.
// Generic visualization geometry at about real size (11 m long, 2.4 m
// wide, 2.8 m high at the hopper), millimetres, Z up, die toward -Y.

meta({
  name: "pelletizer-extruder",
  license: 'CC0-1.0',
  title: "Pelletizer extruder",
  description: "Plastic recycling pelletizing line at about real size: drive motor and reduction gearbox, long horizontal barrel with heater bands, feed hopper over the throat, vacuum vent stack, hydraulic screen changer and strand die, strands through a water bath to a strand pelletizer, pellet bin and control cabinet. Material controls: machine paint, barrel steel, heater bands, guards and trim; natural, blue, black or green pellet colour. plant, weathered, cleanRoom and highVisibility presets.",
  tags: ["recycling", "plastic recycling", "extruder", "pelletizer", "pelletising", "strand pelletizer", "water bath", "barrel", "screen changer", "regrind", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machine = param('machine', '#2f6a9a', { label: 'Machine body and frame (paint)' });
const barrel = param('barrel', '#b8bfc2', { label: 'Barrel, die and bath (steel)' });
const heaters = param('heaters', '#b5652e', { label: 'Heater bands (copper-clad)' });
const trim = param('trim', '#f0b429', { label: 'Guards and safety trim' });
const pellet = param('pellet', 'natural', { choices: ['natural', 'blue', 'black', 'green'], label: 'Pellet colour' });

presets({
  plant: { machine: '#2f6a9a', barrel: '#b8bfc2', heaters: '#b5652e', trim: '#f0b429' },
  weathered: { machine: '#56646c', barrel: '#8f9497', heaters: '#7e5236', trim: '#a8893f' },
  cleanRoom: { machine: '#e3e6e7', barrel: '#cfd5d8', heaters: '#9a9fa3', trim: '#2f8f4e' },
  highVisibility: { machine: '#3e7d3a', barrel: '#c2c8cb', heaters: '#c8402a', trim: '#f2d21b' },
});

const p = assembly("pelletizer-extruder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = cx.
const profileYZ = (pts, t: number, cx = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90).translate(cx, 0, 0);
// Cylinder along Y from y0, axis at (x, z).
const alongY = (y0: number, len: number, r: number, x: number, z: number, seg = 16) => cylinder(len, r, seg).rotateX(-90).translate(x, y0, z);
const dark = '#2b2f33';
const pelletColor = pellet.value === 'blue' ? '#3f7fc4' : pellet.value === 'black' ? '#26292b' : pellet.value === 'green' ? '#4f9a5a' : '#e6e1cf';

const ZA = 1150; // barrel axis height

// Machine base: a long skid under motor, gearbox and barrel.
add("skid", blk(0, 2600, 0, 1300, 8200, 200).color(machine));
add("barrel-stand", blk(0, 1800, 200, 900, 5200, ZA - 450).color(machine));
add("stand-recess", blk(0, 1800, 450, 920, 4400, ZA - 900).color(dark));

// Drive: motor and reduction gearbox at the back.
add("motor", alongY(5300, 1500, 420, 0, ZA + 50, 18).color(machine));
add("motor-fins", alongY(5500, 1100, 440, 0, ZA + 50, 18).subtract(alongY(5400, 1300, 425, 0, ZA + 50, 18)).color(dark));
add("motor-cowl", alongY(6800, 200, 380, 0, ZA + 50, 18).color(dark));
add("motor-terminal-box", blk(450, 5900, ZA + 200, 220, 360, 300).color(machine));
add("motor-foot", blk(0, 6050, 200, 900, 1300, ZA - 600).color(machine));
add("gearbox", blk(0, 4700, 200, 1200, 1100, 1550).color(machine));
add("gearbox-cap", blk(0, 4700, 1750, 900, 800, 150).color(dark));
add("coupling-guard", alongY(5150, 200, 300, 0, ZA + 50, 12).color(trim));

// Barrel with heater bands and their cooling fans underneath.
add("barrel", alongY(-200, 4400, 200, 0, ZA, 18).color(barrel));
for (let k = 0; k < 8; k++) {
  add(`heater-${k}`, alongY(150 + k * 470, 320, 250, 0, ZA, 18).color(heaters));
  add(`fan-${k}`, blk(0, 310 + k * 470, ZA - 480, 380, 300, 200).color(dark));
}

// Feed hopper: a tapered funnel over the throat, with a level sensor.
const HY = 3800;
add("throat", blk(0, HY, ZA + 150, 380, 380, 300).color(barrel));
const sq = (h: number) => path().moveTo(-h, -h).lineTo(h, -h).lineTo(h, h).lineTo(-h, h).close();
const at = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const funnel = (h0: number, h1: number, z0: number, z1: number) => sq(h0).loft([sq(h1)], { planes: [at(z0), at(z1)], ruled: true });
add("feed-hopper", funnel(190, 550, 0, 900).subtract(funnel(150, 510, 20, 920)).translate(0, HY, ZA + 450).color(barrel));
add("hopper-rim", blk(0, HY, ZA + 1350, 1160, 1160, 50).subtract(blk(0, HY, ZA + 1300, 1020, 1020, 200)).color(trim));
add("flake", blk(0, HY, ZA + 1000, 960, 960, 200).color('#a7c4d6'));

// Vacuum vent stack part way along the barrel.
add("vent-port", blk(0, 1400, ZA + 150, 300, 300, 220).color(barrel));
add("vent-pipe", cylinder(900, 80, 12).translate(0, 1400, ZA + 370).color(barrel));
add("vent-pot", cylinder(380, 220, 14).translate(0, 1400, ZA + 1270).color(barrel));
add("vacuum-pump", blk(-800, 1400, 200, 500, 600, 520).color(machine));
add("vacuum-line", box(60, 60, 1300, true).rotateY(-36).translate(-400, 1400, ZA + 900).color(dark));

// Screen changer and strand die at the front.
add("screen-changer", blk(0, -450, ZA - 380, 1000, 300, 760).color(machine));
for (const s of [-1, 1]) add(`changer-ram-${s}`, cylinder(500, 70, 12).rotateY(90).translate(s > 0 ? 500 : -1000, -450, ZA).color(barrel));
add("die-adapter", alongY(-800, 350, 170, 0, ZA, 14).color(heaters));
add("die-head", blk(0, -950, ZA - 160, 700, 220, 320).color(barrel));

// Strands falling into the water bath, then to the strand pelletizer.
const ZW = 750, Y2 = -4800; // water level, pelletizer entry
for (let k = 0; k < 6; k++) {
  const x = -250 + k * 100;
  add(`strand-drop-${k}`, box(14, 14, ZA - 160 - ZW, true).rotateX(-10).translate(x, -1080, (ZA - 160 + ZW) / 2).color(pelletColor));
  add(`strand-${k}`, blk(x, (-1150 + Y2) / 2, ZW - 30, 14, -1150 - Y2, 14).color(pelletColor));
}
add("water-bath", blk(0, (-1000 + Y2) / 2, ZW - 350, 800, -1000 - Y2, 400).subtract(blk(0, (-1000 + Y2) / 2, ZW - 280, 700, -1100 - Y2, 400)).color(barrel));
add("water", blk(0, (-1000 + Y2) / 2, ZW - 280, 700, -1100 - Y2, 230).color('#5d9cc4'));
for (const y of [-1300, -2900, -4500]) for (const s of [-1, 1]) add(`bath-leg-${y}-${s}`, blk(s * 330, y, 0, 70, 70, ZW - 350).color(machine));
add("air-knife", blk(0, Y2 + 300, ZW + 50, 760, 120, 120).color(trim));

// Strand pelletizer: feed rolls and cutter rotor in a housing, chute to the bin.
const PY = Y2 - 600;
add("pelletizer-housing", profileYZ([[PY + 400, 300], [PY + 400, 1300], [PY, 1450], [PY - 500, 1300], [PY - 500, 300]], 900).color(machine));
add("pelletizer-door", blk(470, PY - 50, 650, 30, 600, 550).color(trim));
add("pelletizer-motor", cylinder(500, 180, 14).rotateY(90).translate(450, PY - 100, 1150).color(machine));
add("pelletizer-stand", blk(0, PY - 50, 0, 700, 700, 300).color(machine));
add("pellet-chute", box(260, 600, 260, true).rotateX(35).translate(0, PY - 650, 450).color(barrel));
add("pellet-bin", blk(0, PY - 1200, 0, 900, 900, 700).subtract(blk(0, PY - 1200, 80, 820, 820, 700)).color(trim));
add("pellets", blk(0, PY - 1200, 80, 820, 820, 520).color(pelletColor));

// Control cabinet beside the barrel.
add("control-cabinet", blk(1400, 2200, 0, 600, 1200, 2000).color(machine));
add("cabinet-door-line", blk(1702, 2200, 100, 6, 10, 1800).color(dark));
add("hmi-screen", blk(1705, 1900, 1300, 10, 400, 300).color('#1e3a52'));
add("stack-light", cylinder(300, 50, 10).translate(1500, 2600, 2000).color('#c8202a'));
add("cable-tray", blk(700, 2200, 2100, 1400, 300, 60).color(dark));

return p.model();
