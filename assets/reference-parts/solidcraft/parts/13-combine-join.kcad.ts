const block = box(40, 40, 20);
const pin = cylinder(40, 12).translate(40, 20, 0);
return block.union(pin);
