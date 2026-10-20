const a = box(20, 20, 20);
const b = box(10, 30, 20).translate(5, -5, 0);
return a.intersect(b);
