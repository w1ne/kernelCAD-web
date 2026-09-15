// L mounting bracket for the automatic-drawing example.
//
// Base plate bolts down through four ⌀6.6 clearance holes; a counterbored
// locating screw sits between them; the upright takes two ⌀8.5 bolts. Front
// base corners are rounded, the upright's top edges are chamfered. The
// drawing (dimensions, datums, GD&T, section) is derived from this geometry by
// `export svg-drawing` with `autoAnnotate`; see README.md.
const baseW = 90;
const baseD = 60;
const baseT = 8;
const uprightT = 8;
const uprightH = 50;

let bracket = box(baseW, baseD, baseT)
  .union(box(baseW, uprightT, uprightH).translate(0, baseD - uprightT, baseT));

// Rounded front corners, chamfered upright top edges.
bracket = bracket.fillet(3, { parallel: [0, 0, 1], within: { yMax: 1 } });
bracket = bracket.chamfer(1.5, { parallel: [1, 0, 0], atZ: baseT + uprightH });

// Base: 4× ⌀6.6 THRU on a 66 × 28 pattern.
for (const [x, y] of [[12, 12], [78, 12], [12, 40], [78, 40]]) {
  bracket = bracket.subtract(cylinder(baseT + 4, 3.3).translate(x, y, -2));
}
// Locating screw: ⌀5.5 THRU, counterbored ⌀10 × 3 from the top.
bracket = bracket
  .subtract(cylinder(baseT + 4, 2.75).translate(45, 26, -2))
  .subtract(cylinder(4, 5).translate(45, 26, baseT - 3));
// Upright: 2× ⌀8.5 THRU along Y.
for (const x of [25, 65]) {
  bracket = bracket.subtract(
    cylinder(uprightT + 4, 4.25).rotate([1, 0, 0], 90).translate(x, baseD + 2, baseT + 30),
  );
}

// GD&T the drawing must carry regardless of the automatic rules: the bolting
// face is datum A, and the upright bolt holes need a tighter position zone
// than the ISO 2768-m default.
bracket = bracket
  .datum('A', { atZ: 0 })
  .tolerance({
    type: 'position', value: 0.05, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [25, baseD, baseT + 30] },
  });

return bracket;
