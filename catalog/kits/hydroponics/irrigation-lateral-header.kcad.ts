// SPDX-License-Identifier: CC0-1.0
// Irrigation lateral header: the distribution end of a drip system that
// splits one filtered, regulated supply into many drip laterals running
// down the crop rows.
// What makes it a drip header: an inlet train you can read left to right
// (ball valve with red lever, disc filter with coloured cap, pressure
// regulator and a solenoid valve with its coil), a PVC header pipe on
// saddle stands, and a row of start connectors with mini lever valves
// feeding black polyethylene drip laterals that drop to the floor and run
// back along the rows with inline drippers and dark wet spots under each.
// Generic visualization geometry at about real size (1.6 m header, 1.6 m
// laterals), millimetres, Z up, front -Y.

meta({
  name: "irrigation-lateral-header",
  license: 'CC0-1.0',
  title: "Irrigation lateral header",
  description: "Drip irrigation lateral header at about real size: inlet train with ball valve, disc filter, pressure regulator and solenoid valve, PVC header on saddle stands, start connectors with mini lever valves, and black drip laterals with inline drippers and wet spots, ending in folded flush ends. Material controls: header PVC, drip line, valves and filter, plus lateral count (4, 6 or 8). standard, purpleReclaim, weathered and highVisibility presets.",
  tags: ['drip irrigation', 'lateral header', 'drip line', 'disc filter', 'pressure regulator', 'solenoid valve', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pvc = param('headerPvc', '#e6e8e3', { label: 'Header and inlet pipe (PVC)' });
const drip = param('dripLine', '#202326', { label: 'Drip laterals (polyethylene)' });
const valve = param('valves', '#2f6fa8', { label: 'Valve bodies' });
const filter = param('filterHousing', '#c8372d', { label: 'Disc filter housing' });
const laterals = param('laterals', '6', { choices: ['4', '6', '8'], label: 'Drip laterals' });

presets({
  standard: { headerPvc: '#e6e8e3', dripLine: '#202326', valves: '#2f6fa8', filterHousing: '#c8372d' },
  purpleReclaim: { headerPvc: '#7b4d93', dripLine: '#2a2230', valves: '#5a3a6e', filterHousing: '#e0a32a' },
  weathered: { headerPvc: '#c8c6b8', dripLine: '#33302c', valves: '#4b6a84', filterHousing: '#93473d' },
  highVisibility: { headerPvc: '#f4f4ef', dripLine: '#1a1c1e', valves: '#e87832', filterHousing: '#f2c84b' },
});

const p = assembly("irrigation-lateral-header");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);

const HY = -400, HZ = 180, HX = 800, LY1 = 1300;
const handle = '#d23a2c', wet = '#5b4a3a';

// Header pipe on saddle stands, end cap with flush valve.
add("header", cylX(-HX, HY, HZ, 2 * HX, 28, 14).color(pvc));
for (const x of [-HX + 120, 0, HX - 120]) {
  add(`stand-foot-${x}`, blk(x, HY, 0, 160, 120, 14).color('#8d9497'));
  add(`stand-post-${x}`, blk(x, HY, 14, 40, 40, HZ - 44).color('#8d9497'));
  add(`stand-saddle-${x}`, blk(x, HY, HZ - 36, 90, 70, 14).color('#8d9497'));
  add(`stand-clamp-${x}`, cylX(x - 15, HY, HZ, 30, 33, 14).color('#8d9497'));
}
add("end-cap", cylX(HX, HY, HZ, 40, 34, 14).color(pvc));
add("flush-valve", cylZ(HX - 60, HY, HZ - 120, 90, 20, 10).color(valve));
add("flush-handle", blk(HX - 60, HY - 30, HZ - 80, 16, 60, 10).color(handle));

// Inlet train along -Y from the left end of the header.
const IX = -HX - 40;
add("inlet-elbow", blk(IX, HY, HZ - 34, 80, 80, 68).color(pvc));
add("inlet-pipe", cylY(IX, HY - 40, HZ, 760, 28, 14).color(pvc));
// Solenoid valve: body with coil on top.
add("solenoid-body", blk(IX, HY - 170, HZ - 45, 110, 120, 90).color(valve));
add("solenoid-coil", cylZ(IX, HY - 170, HZ + 45, 80, 32, 12).color('#222527'));
add("solenoid-cable", cylY(IX, HY - 120, HZ + 110, 120, 5, 6).color('#222527'));
// Pressure regulator: a bell on the line.
add("regulator", cylZ(IX, HY - 330, HZ - 50, 150, 40, 14).color('#c9ccc7'));
add("regulator-cap", cylZ(IX, HY - 330, HZ + 100, 30, 30, 14).color(valve));
// Disc filter: housing, clamp ring, coloured cap, drain.
add("filter-body", cylZ(IX, HY - 500, HZ - 110, 200, 62, 16).color(filter));
add("filter-clamp", cylZ(IX, HY - 500, HZ + 50, 26, 70, 16).color('#2a2c2e'));
add("filter-cap", cylZ(IX, HY - 500, HZ + 76, 60, 60, 16).color(filter));
add("filter-drain", cylZ(IX, HY - 500, HZ - 140, 30, 12, 8).color('#2a2c2e'));
add("filter-foot", blk(IX, HY - 500, 0, 140, 140, HZ - 140).color('#8d9497'));
// Ball valve with red lever, then supply coupling.
add("ball-valve", blk(IX, HY - 660, HZ - 40, 80, 100, 80).color(valve));
add("ball-valve-stem", cylZ(IX, HY - 660, HZ + 40, 25, 8, 6).color('#c9ccc7'));
add("ball-valve-lever", blk(IX + 60, HY - 660, HZ + 60, 140, 24, 12).color(handle));
add("supply-coupling", cylY(IX, HY - 760, HZ, 60, 40, 14).color('#2a2c2e'));

// Drip laterals: start connector + mini valve on the header, drop to the
// floor, run back along the rows with drippers and wet spots.
const n = Number(laterals.value);
for (let i = 0; i < n; i++) {
  const x = -HX + 120 + 60 + (i * (2 * HX - 360)) / (n - 1);
  add(`start-${i}`, cylY(x, HY + 70, HZ, 40, 12, 8).color(valve));
  add(`mini-valve-${i}`, blk(x, HY + 70, HZ + 14, 12, 34, 34).color(handle));
  add(`riser-${i}`, cylZ(x, HY + 70, 30, HZ - 30, 8, 6).color(drip));
  add(`lateral-${i}`, cylY(x, LY1, 22, LY1 - HY - 70, 8, 6).color(drip));
  for (let y = HY + 260; y < LY1 - 60; y += 260) {
    add(`dripper-${i}-${y}`, cylY(x, y + 15, 22, 30, 12, 8).color('#6a3d8e'));
    add(`wet-${i}-${y}`, cylZ(x, y, 0, 3, 75, 10).color(wet));
  }
  add(`flush-end-${i}`, blk(x, LY1 + 20, 4, 30, 60, 30).color(drip));
}

return p.model();
