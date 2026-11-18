// 2 mm sheet-metal L bracket, first pass: an R1 bend (tighter than the
// thickness) and a mounting hole 2 mm from the bend line.
const s = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close();
let b = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
b = b.holes({ byNormal: 'Z' }, { positions: [{ u: -25, v: 0 }, { u: 16, v: 0 }], diameter: 4, depth: 'through' });
b = b.bend({ atX: 60 }, 90, 1);
return b;
