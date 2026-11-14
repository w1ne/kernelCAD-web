// SPDX-License-Identifier: CC0-1.0
// Nutrient measuring cylinder: the graduated cylinder a grower measures
// two-part nutrient concentrate into before dosing it into the reservoir.
// What makes it a measuring cylinder: a tall narrow clear polypropylene tube
// on a hexagonal foot (so it can't roll off the bench), a rolled rim with a
// pouring spout, graduation ticks up the front with longer numbered majors,
// and solution visible through the wall up to the fill line; beside it the
// A and B concentrate bottles it is measured from and a dosing syringe.
// Generic visualization geometry at real size (1000 mL cylinder 66 mm bore,
// about 440 mm tall), millimetres, Z up, graduations toward -Y.

meta({
  name: "nutrient-measuring-cylinder",
  license: 'CC0-1.0',
  title: "Nutrient measuring cylinder",
  description: "Graduated measuring cylinder at real size on a hexagonal foot, rolled rim and pouring spout, front graduation ticks with numbered majors, nutrient solution visible to the fill line, beside two-part A and B concentrate bottles and a dosing syringe. Material controls: cylinder wall, foot, solution and concentrate bottles, plus a 250, 500 or 1000 mL capacity choice that sets bore and height. labClear, blueFoot, amberSolution and weathered presets.",
  tags: ['measuring cylinder', 'graduated cylinder', 'nutrient', 'fertiliser', 'concentrate', 'dosing', 'syringe', 'two part nutrient', 'hydroponics', 'lab', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const wall = param('cylinderWall', '#d6e8ec', { label: 'Cylinder wall (clear polypropylene)' });
const foot = param('foot', '#2f6fa8', { label: 'Hexagonal foot (polypropylene)' });
const solution = param('solution', '#6fae5a', { label: 'Nutrient solution' });
const bottles = param('concentrateBottles', '#eef0ec', { label: 'Concentrate bottles (HDPE)' });
const capacity = param('capacity', '1000 mL', { choices: ['250 mL', '500 mL', '1000 mL'], label: 'Capacity' });

presets({
  labClear: { cylinderWall: '#d6e8ec', foot: '#2f6fa8', solution: '#6fae5a', concentrateBottles: '#eef0ec' },
  blueFoot: { cylinderWall: '#dceef2', foot: '#1f5d99', solution: '#7fb3c9', concentrateBottles: '#22262a' },
  amberSolution: { cylinderWall: '#e3ece6', foot: '#3b3f42', solution: '#c98a2b', concentrateBottles: '#f2f2ee' },
  weathered: { cylinderWall: '#bcc9c4', foot: '#5f7a8e', solution: '#8d9a5c', concentrateBottles: '#cfcbbf' },
});

const p = assembly("nutrient-measuring-cylinder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// Capacity sets bore (R) and graduated height (H); majors every 1/5 of it.
const [R, H, majors] = capacity.value === '250 mL' ? [20, 220, [50, 100, 150, 200, 250]]
  : capacity.value === '500 mL' ? [26, 270, [100, 200, 300, 400, 500]]
  : [34, 330, [200, 400, 600, 800, 1000]];
const ZF = 22; // top of the foot, bottom of the bore
const ZTOP = ZF + H + 40; // rim height (headroom above the top mark)
const FILL = 0.6; // filled to 60 percent of capacity

// Hexagonal foot with a stem collar.
const hex: [number, number][] = [];
for (let k = 0; k < 6; k++) hex.push([Math.cos((k * Math.PI) / 3) * (R + 52), Math.sin((k * Math.PI) / 3) * (R + 52)]);
add("foot", extrudePolygon(hex, 14).color(foot));
add("foot-collar", turned([[0, 14], [R + 22, 14], [R + 8, ZF + 6], [0, ZF + 6]]).color(foot));

// Tube: the part below the fill line takes the solution tint seen through
// the clear wall; above it the wall stays clear. Open top, rolled rim.
const zFill = ZF + H * FILL;
add("tube-filled", turned([[0, ZF], [R + 3, ZF], [R + 3, zFill], [0, zFill]]).color(solution));
add("tube-wall", turned([[R, zFill], [R + 3, zFill], [R + 3, ZTOP], [R, ZTOP]]).color(wall));
add("meniscus", cylZ(0, 0, zFill - 2, 2, R, 18).color(solution));
add("rim", turned([[R, ZTOP - 4], [R + 6, ZTOP - 4], [R + 6, ZTOP + 3], [R, ZTOP + 3]]).color(wall));
// Pouring spout on +X: a small wedge flaring out of the rim.
add("spout", extrudePolygon([[R - 2, -10], [R + 22, -4], [R + 22, 4], [R - 2, 10]], 8).translate(0, 0, ZTOP - 5).color(wall));

// Graduations on the -Y face: minor ticks every tenth, longer majors with
// numeral bars, and a capacity badge near the top.
for (let k = 1; k <= 10; k++) {
  const z = ZF + (H * k) / 10;
  const major = k % 2 === 0;
  add(`tick-${k}`, blk(major ? 0 : -4, -R - 3.6, z - 0.8, major ? 22 : 12, 1.2, 1.6).color('#2a3a44'));
  if (major) {
    const digits = String(majors[k / 2 - 1]).length;
    for (let d = 0; d < digits; d++) add(`num-${k}-${d}`, blk((d - (digits - 1) / 2) * 6, -R - 3.6, z + 4, 4, 1.2, 8).color('#2a3a44'));
  }
}
add("capacity-badge", blk(0, -R - 3.6, ZTOP - 30, 26, 1.2, 10).color(foot));

// Two-part concentrate bottles, A and B, with coloured caps.
const bottle = (tag: string, x: number, y: number, cap: string) => {
  add(`${tag}-bottle`, extrudeRoundedRect(110, 70, 14, 200, { axis: 'z' }).translate(x, y, 0).color(bottles));
  add(`${tag}-shoulder`, turned([[0, 0], [40, 0], [16, 34], [0, 34]], 14).translate(x, y, 200).color(bottles));
  add(`${tag}-neck`, cylZ(x, y, 232, 14, 16, 12).color(bottles));
  add(`${tag}-cap`, cylZ(x, y, 244, 22, 19, 12).color(cap));
  add(`${tag}-label`, blk(x, y - 36, 60, 86, 1.2, 100).color(cap));
  add(`${tag}-letter`, blk(x, y - 37, 100, 24, 1, 34).color('#f2f2ee'));
};
bottle('part-a', 130, 70, '#3b8a3e');
bottle('part-b', 260, 70, '#c0392b');

// 60 mL dosing syringe lying on the bench, plunger drawn back.
const S = (s: Shape) => s.rotateY(90).rotateZ(-20).translate(110, -60, 15);
add("syringe-barrel", S(cylZ(0, 0, 0, 110, 14, 14)).color(wall));
add("syringe-dose", S(cylZ(0, 0, 0, 60, 14.4, 14)).color(solution));
add("syringe-tip", S(turned([[0, -24], [4, -24], [14, 0], [0, 0]], 12)).color(wall));
add("syringe-flange", S(blk(0, 0, 108, 26, 48, 4)).color(wall));
add("plunger-rod", S(blk(0, 0, 112, 6, 18, 40)).color('#f2f2ee'));
add("plunger-thumb", S(cylZ(0, 0, 152, 4, 13, 12)).color('#f2f2ee'));

return p.model();
