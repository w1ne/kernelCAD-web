// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-date-coder",
  license: 'CC0-1.0',
  title: "Bottle date coder",
  description: "Compact inkjet coding head and touchscreen stand beside a moving-bottle guide. Knobs: overall scale, equipment color, and safety accent.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'prop',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const body = param('body', '#a6b3b4', { label: 'Equipment color' });
const accent = param('accent', '#e3a23d', { label: 'Safety accent' });
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);

const p = assembly("bottle-date-coder");
p.part("base", boxPart(0, 0, 0, 500, 340, 50, accent));
p.part("pedestal", boxPart(0, 0, 70, 75, 75, 540, body));
p.part("controller", boxPart(0, -60, 610, 260, 120, 220, body));
p.part("screen", boxPart(0, -130, 690, 190, 25, 100, accent));
p.part("print-arm", boxPart(170, 0, 450, 340, 45, 45, body));
p.part("print-head", boxPart(330, 0, 410, 120, 100, 180, body));
p.part("adjustment-wheel", cylinderPart(170, -55, 370, 45, 42, 10, accent));
p.part("photoeye", boxPart(360, 0, 220, 90, 85, 70, body));
p.part("cable-cover", boxPart(-180, 0, 70, 35, 50, 550, accent));

return p.model();
