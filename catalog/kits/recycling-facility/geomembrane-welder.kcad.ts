// SPDX-License-Identifier: CC0-1.0
// Geomembrane welder: the self-propelled hot-wedge welder that seams HDPE
// landfill liner panels in the cell. What makes it a wedge welder rather
// than a generic machine: a compact low chassis that runs on the liner
// overlap, a heated wedge poking forward between the top and bottom sheet,
// a pair of knurled pressure rollers squeezing the seam behind it, a carry
// handle and an upright control box with temperature and speed dials, and
// the double weld track with its test channel left behind on the overlap.
// Generic visualization geometry at about real size (welder 0.5 m long;
// liner patch 1.6 m x 1.2 m on subgrade), millimetres, Z up, welder
// travelling toward -X along the seam.

meta({
  name: "geomembrane-welder",
  license: 'CC0-1.0',
  title: "Geomembrane welder",
  description: "Self-propelled hot-wedge geomembrane welder at about real size on an overlapped HDPE liner seam: low chassis with drive wheels, heated wedge between the sheets, knurled pressure rollers, carry handle, control box with temperature and speed dials, trailing power cable and the double weld track with test channel behind it. Material controls: welder housing, liner, metal and controls. landfillBlack, whiteLiner, pondLiner and worn presets.",
  tags: ["recycling", "landfill", "geomembrane", "HDPE liner", "wedge welder", "seaming", "tools", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#e8a21c', { label: 'Welder housing (paint)' });
const liner = param('liner', '#25282a', { label: 'Liner (HDPE)' });
const metal = param('metal', '#b9bfc2', { label: 'Wedge, rollers and handle (metal)' });
const controls = param('controls', '#3b4044', { label: 'Control box and cable' });

presets({
  landfillBlack: { housing: '#e8a21c', liner: '#25282a', metal: '#b9bfc2', controls: '#3b4044' },
  whiteLiner: { housing: '#d4402a', liner: '#e4e6e0', metal: '#a8b0b4', controls: '#2a2e31' },
  pondLiner: { housing: '#2f6fa8', liner: '#2f4f3a', metal: '#c6ccce', controls: '#24282b' },
  worn: { housing: '#a8884a', liner: '#3a3c3a', metal: '#8f8a80', controls: '#4a4540' },
});

const p = assembly("geomembrane-welder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Wheel or roller with its axis along Y, centred at (x, y, z).
const wheelY = (x: number, y: number, z: number, r: number, w: number, n = 14) => cylinder(w, r, n).rotateX(-90).translate(x, y - w / 2, z);
const dark = '#1e2022';

// Subgrade and the two overlapped liner sheets (seam along X at y = 0).
const T = 6;
add("subgrade", blk(0, 0, 0, 1700, 1300, 30).color('#8a7458'));
add("bottom-sheet", blk(0, -200, 30, 1600, 800, T).color(liner));
add("top-sheet", blk(0, 250, 30 + T, 1600, 700, T).color(liner));
add("top-sheet-flap", box(1600, 60, T, true).rotateX(-12).translate(0, -120, 30 + T + 8).color(liner));
const LZ = 30 + 2 * T; // top of the overlap

// Double weld track with the test channel between, behind the welder.
for (const y of [-55, 15]) add(`weld-track-${y}`, blk(330, y, LZ, 940, 40, 3).color('#3a3e40'));
add("test-channel", blk(330, -20, LZ, 940, 30, 1).color(dark));
add("seam-marks", blk(520, 40, LZ, 300, 6, 2).color('#f2f2ee'));

// Chassis on drive wheels.
const CZ = LZ + 70; // chassis bottom
add("chassis", blk(20, 0, CZ, 420, 300, 150).color(housing));
add("chassis-nose", box(120, 300, 110, true).rotateY(30).translate(-200, 0, CZ + 70).color(housing));
for (const s of [-1, 1]) for (const x of [-120, 170]) add(`drive-wheel-${s}-${x}`, wheelY(x, s * 175, LZ + 55, 55, 40).color(dark));
add("motor-housing", blk(80, 60, CZ + 150, 220, 160, 130).color(housing));
add("motor-cap", cylinder(40, 70, 12).rotateX(-90).translate(80, 140, CZ + 215).color(controls));

// Heated wedge pushed forward into the overlap, with heater block.
add("wedge-arm", blk(-260, -110, LZ + 10, 160, 40, 60).color(metal));
add("wedge", extrudePolygon([[0, 0], [-170, 12], [-170, 28], [0, 46]], 70).rotateX(90).translate(-300, -75, LZ - 4).color('#c86a2a'));
add("heater-block", blk(-260, -110, LZ + 70, 120, 60, 70).color(metal));
add("heater-lead", box(16, 16, 160, true).rotateY(35).translate(-220, -110, LZ + 190).color(controls));

// Pressure rollers squeezing the seam behind the wedge (upper on the overlap).
add("pressure-roller", wheelY(-70, -20, LZ + 45, 45, 120, 16).color(metal));
add("roller-knurl", wheelY(-70, -20, LZ + 45, 47, 30, 16).color('#8a9094'));
add("roller-yoke", blk(-70, -110, LZ + 45, 70, 20, 120).color(metal));
add("pressure-screw", cylinder(110, 14, 8).translate(-70, -110, CZ + 150).color(metal));
add("pressure-knob", cylinder(26, 38, 10).translate(-70, -110, CZ + 260).color(dark));

// Carry handle: two uprights and a grip bar across.
for (const s of [-1, 1]) add(`handle-upright-${s}`, box(24, 24, 330, true).rotateY(18).translate(260, s * 120, CZ + 300).color(metal));
add("handle-grip", cylinder(280, 18, 10).rotateX(-90).translate(310, -140, CZ + 455).color(metal));
add("grip-rubber", cylinder(160, 22, 10).rotateX(-90).translate(310, -80, CZ + 455).color(dark));

// Control box on a post: display and two dials facing the operator (-Y).
add("control-post", blk(-40, -60, CZ + 150, 40, 40, 140).color(metal));
add("control-box", blk(-40, -60, CZ + 290, 220, 140, 170).color(controls));
add("display", blk(-80, -132, CZ + 380, 90, 4, 50).color('#3fbf6a'));
for (const x of [-100, 20]) add(`dial-${x}`, cylinder(14, 22, 12).rotateX(90).translate(x, -130, CZ + 330).color('#d4402a'));
add("power-switch", blk(30, -132, CZ + 400, 30, 6, 30).color('#e8e6dc'));

// Power cable trailing back from the control box over the liner.
add("cable-drop", box(20, 20, 240, true).rotateY(40).translate(140, -10, CZ + 250).color(controls));
add("cable-run-1", blk(500, -10, LZ, 500, 20, 18).color(controls));
add("cable-run-2", box(500, 20, 18, true).rotateZ(25).translate(690, 90, LZ + 9).color(controls));
add("cable-plug", blk(760, 250, LZ, 70, 50, 40).color('#f0b429'));

return p.model();
