const plate = box(50, 30, 10);
const slot = box(20, 8, 12).translate(15, 11, -1);
return plate.subtract(slot);
