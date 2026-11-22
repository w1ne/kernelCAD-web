// SPDX-License-Identifier: CC0-1.0
// Biogas holder: the double-membrane gas store beside an anaerobic
// digester. An inner membrane holds the biogas; an outer weather membrane
// is kept taut by a support-air blower so the dome holds its shape
// whatever the fill. What makes it that object rather than a tank: the
// three-quarter-sphere fabric dome clamped to a low concrete ring, the
// welded seams running over it, the blower with its air duct, the yellow
// gas main with a condensate trap, and the water-seal pressure relief
// valve and fill-level sensor that every holder carries. Generic
// visualization geometry at about real size (11 m dome, 7.6 m high),
// millimetres, Z up, services on the -Y side.

meta({
  name: "biogas-holder",
  license: 'CC0-1.0',
  title: "Biogas holder",
  description: "Double-membrane biogas holder at about real size: three-quarter-sphere fabric dome with welded seams clamped to a low concrete ring wall, support-air blower in a weather housing with its duct into the base, yellow gas main and riser with a valve and condensate trap, water-seal pressure relief tank, fill-level sensor cable to a sight dome on top, lightning mast and access steps. Material controls: outer membrane, concrete base, gas pipework, blower housing. agri, weathered, sludgeWorks and highVisibility presets.",
  tags: ["recycling", "biogas", "gas holder", "double membrane", "anaerobic digestion", "gas storage", "renewable energy", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 6400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const membrane = param('membrane', '#5f8c55', { label: 'Outer membrane (fabric)' });
const concrete = param('concrete', '#b9b6ad', { label: 'Concrete ring base' });
const pipework = param('pipework', '#f2c230', { label: 'Gas pipework' });
const housing = param('housing', '#d7dadc', { label: 'Blower housing' });

presets({
  agri: { membrane: '#5f8c55', concrete: '#b9b6ad', pipework: '#f2c230', housing: '#d7dadc' },
  weathered: { membrane: '#6f7a63', concrete: '#9a978e', pipework: '#c9a440', housing: '#a9aca8' },
  sludgeWorks: { membrane: '#c9c6bd', concrete: '#a8a59d', pipework: '#f2c230', housing: '#2f6f9e' },
  highVisibility: { membrane: '#e7e3d6', concrete: '#b9b6ad', pipework: '#e3742b', housing: '#2f3438' },
});

const p = assembly("biogas-holder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const dark = '#2b2f33';
const steel = '#a9b1b5';

// Dome: a sphere of radius R cut at the clamp ring height.
const R = 5000, ZR = 600, ZC = ZR + 1800;
const RR = Math.sqrt(R * R - (ZC - ZR) * (ZC - ZR)); // clamp ring radius
const cut = blk(0, 0, ZC - R - 100, 2 * R + 400, 2 * R + 400, ZR - (ZC - R - 100));
add("outer-membrane", sphere(R).translate(0, 0, ZC).subtract(cut).color(membrane));
for (let k = 0; k < 4; k++) add(`seam-${k}`, torus(R + 5, 25, 32).rotateX(90).rotateZ(k * 45).translate(0, 0, ZC).subtract(cut).color('#3f5f3a'));
add("ring-wall", cylinder(ZR, RR + 250, 32).subtract(cylinder(ZR + 20, RR - 150, 32).translate(0, 0, 100)).color(concrete));
add("clamp-ring", torus(RR + 40, 60, 32).translate(0, 0, ZR).color(steel));
add("sight-dome", cylinder(120, 300, 16).translate(0, 0, ZC + R - 60).color(steel));
add("sight-glass", sphere(200).scale([1, 1, 0.5]).translate(0, 0, ZC + R + 60).color('#9fc7d8'));

// Fill-level sensor junction box on the ring wall.
add("level-sensor-box", blk(-RR - 400, -900, 0, 300, 220, ZR + 500).color(housing));

// Support-air blower in its housing, ducted into the ring.
const BX = -1600, BY = -RR - 1700;
add("blower-pad", blk(BX, BY, 0, 2200, 1500, 120).color(concrete));
add("blower-housing", blk(BX, BY, 120, 1600, 1100, 1300).color(housing));
add("blower-roof", blk(BX, BY, 1420, 1700, 1200, 60).color(dark));
for (let i = 0; i < 5; i++) add(`blower-louvre-${i}`, blk(BX - 300, BY - 555, 400 + i * 150, 700, 10, 60).color(dark));
add("blower-fan-cowl", cylinder(200, 300, 16).rotateX(90).translate(BX + 500, BY - 550, 800).color(dark));
add("air-duct", cylinder(1250, 160, 12).rotateX(-90).translate(BX, BY + 550, 400).color(steel));

// Gas main: riser out of the ring wall, valve, trap, run to the plant.
const GX = 1800, GY = -RR - 100;
add("gas-riser", cylinder(900, 110, 12).translate(GX, GY - 200, 100).color(pipework));
add("gas-elbow", cylinder(400, 110, 12).rotateX(90).translate(GX, GY + 80, 900).color(pipework));
add("gas-main", cylinder(5200, 110, 12).rotateX(90).translate(GX, GY - 200, 300).color(pipework));
add("valve-body", blk(GX, GY - 1600, 170, 380, 260, 260).color(dark));
add("valve-wheel", torus(160, 22, 14).translate(GX, GY - 1600, 560).color('#c23b2f'));
add("valve-stem", cylinder(130, 25, 8).translate(GX, GY - 1600, 430).color(steel));
add("condensate-trap", cylinder(900, 260, 14).translate(GX, GY - 3200, 0).color(pipework));
add("trap-lid", cylinder(60, 300, 14).translate(GX, GY - 3200, 900).color(dark));
for (let i = 0; i < 3; i++) add(`pipe-support-${i}`, blk(GX, GY - 900 - i * 1600, 0, 160, 160, 190).color(concrete));

// Water-seal pressure relief valve beside the ring, piped from the base.
const PX = 3600, PY = -RR + 300;
add("relief-tank", cylinder(1300, 380, 16).translate(PX, PY - 1400, 0).color(steel));
add("relief-cap", cylinder(200, 440, 16).translate(PX, PY - 1400, 1300).color(dark));
add("relief-vent", cylinder(900, 60, 10).translate(PX, PY - 1400, 1500).color(steel));
add("relief-pipe", cylinder(1900, 80, 10).rotateX(90).translate(PX, PY + 600, 1000).color(pipework));

// Lightning mast and access steps on the ring.
add("lightning-mast", cylinder(10500, 70, 10).translate(-RR - 1100, RR * 0.4, 0).color(steel));
add("mast-base", blk(-RR - 1100, RR * 0.4, 0, 600, 600, 200).color(concrete));
for (let i = 0; i < 3; i++) add(`step-${i}`, blk(-RR - 900 + i * 300, -2200, 0, 300, 900, 200 * (i + 1)).color(concrete));
add("warning-sign", blk(GX + 600, GY - 300, 0, 60, 60, 1500).color(steel));
add("warning-plate", blk(GX + 600, GY - 335, 1100, 500, 10, 400).color('#f2c230'));

return p.model();
