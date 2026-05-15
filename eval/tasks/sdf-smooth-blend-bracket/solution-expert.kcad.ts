const plate = sdf.box([30, 20, 4]);
const pin   = sdf.cylinder(5, 16);
const field = sdf.smoothBlend(plate, pin, 2);
return sdf.materialize(field, { resolution: 25 });
