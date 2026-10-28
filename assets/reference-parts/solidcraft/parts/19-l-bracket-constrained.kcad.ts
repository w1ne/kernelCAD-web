const foot = box(60, 8, 20);
const wall = box(8, 32, 20).translate(0, 8, 0);
return foot.union(wall);
