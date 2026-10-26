const base = box(40, 20, 8);
const wall = box(8, 20, 20).translate(0, 0, 8);
return base.union(wall);
