// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-rinser-carousel",
  license: 'CC0-1.0',
  title: "Bottle rinser carousel",
  description: "Rotary bottle rinser with an infeed starwheel, spray turret, and catch basin. Knobs: overall scale, equipment color, and safety accent.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const body = param('body', '#a6b3b4', { label: 'Equipment color' });
const accent = param('accent', '#e3a23d', { label: 'Safety accent' });
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);

const p = assembly("bottle-rinser-carousel");
p.part("catch-basin", cylinderPart(0, 0, 0, 130, 480, 14, body));
p.part("rotary-table", cylinderPart(0, 0, 130, 90, 370, 16, accent));
p.part("rinse-turret", cylinderPart(0, 0, 220, 690, 130, 12, body));
p.part("top-drive", cylinderPart(0, 0, 910, 140, 180, 12, body));
p.part("infeed-lane", boxPart(-500, 0, 255, 420, 150, 45, accent));
p.part("outfeed-lane", boxPart(500, 0, 255, 420, 150, 45, accent));
p.part("rinse-nozzle-0", cylinderPart(-330, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-1", cylinderPart(-220, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-2", cylinderPart(-110, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-3", cylinderPart(0, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-4", cylinderPart(110, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-5", cylinderPart(220, -220, 570, 135, 22, 8, accent));
p.part("rinse-nozzle-6", cylinderPart(330, -220, 570, 135, 22, 8, accent));
p.part("support-0", boxPart(-300, 0, 0, 55, 55, 430, body));
p.part("support-1", boxPart(-100, 0, 0, 55, 55, 430, body));
p.part("support-2", boxPart(100, 0, 0, 55, 55, 430, body));
p.part("support-3", boxPart(300, 0, 0, 55, 55, 430, body));
p.part("spray-guard", boxPart(0, 0, 580, 900, 640, 48, body));

return p.model();
