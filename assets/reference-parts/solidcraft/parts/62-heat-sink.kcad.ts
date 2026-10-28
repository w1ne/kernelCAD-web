const base = box(60, 50, 5);
// Fifteen 1.5 mm fins on a 4 mm pitch, starting at x = 2, standing on the base.
const fin = box(1.5, 50, 25).translate(2, 0, 5);
return base.union(fin.patternLinear({ count: 15, direction: [1, 0, 0], spacing: 4 }));
