const tabAngle = param('tabAngle', 60, { min: 0, max: 80, unit: '°' });
let plate = box(160, 120, 8).fillet(3);
for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
  plate = plate.subtract(cylinder(10, 3).translate(15 + i * 26, 18 + j * 28, -1));
}
// One tab, angled with plain trig on the param.
const rise = Math.tan(tabAngle * Math.PI / 180) * 20;
const tab = box(20, 10, 4 + rise).translate(150, 55, 0);
return plate.union(tab);
