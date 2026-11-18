// 2 mm sheet-metal L bracket, fixed: R2 bend (= thickness) and the second
// hole moved 10 mm back from the bend line.
const s = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close();
let b = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
b = b.holes({ byNormal: 'Z' }, { positions: [{ u: -25, v: 0 }, { u: 6, v: 0 }], diameter: 4, depth: 'through' });
b = b.bend({ atX: 60 }, 90, 2);
return b;
