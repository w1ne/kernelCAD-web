// Small native kernelCAD part used by the mesh-tolerance export demo.
let plate = box(30, 20, 4).translate(-15, -10, 0);
plate = plate.subtract(cylinder(8, 3).translate(-8, 0, -2));
plate = plate.subtract(cylinder(8, 3).translate(8, 0, -2));
return plate;
