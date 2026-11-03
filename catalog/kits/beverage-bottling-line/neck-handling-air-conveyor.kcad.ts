// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "neck-handling-air-conveyor",
  license: 'CC0-1.0',
  title: "Bottle neck-handling air conveyor",
  description: "Raised guide track and four support columns carry bottles by their neck rings over a clear floor path. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("neck-handling-air-conveyor");
p.part("top-spine", boxPart(0, 0, 1230, 1700, 120, 70, accent));
p.part("support-column-0", boxPart(-650, 0, 0, 55, 55, 1230, body));
p.part("support-column-1", boxPart(-220, 0, 0, 55, 55, 1230, body));
p.part("support-column-2", boxPart(210, 0, 0, 55, 55, 1230, body));
p.part("support-column-3", boxPart(640, 0, 0, 55, 55, 1230, body));
p.part("neck-guide-front", boxPart(0, -130, 1040, 1650, 25, 70, body));
p.part("neck-guide-back", boxPart(0, 130, 1040, 1650, 25, 70, body));
p.part("air-rail", boxPart(0, 0, 990, 1650, 90, 28, accent));
p.part("guide-spacer-0", cylinderPart(-600, 0, 1010, 45, 26, 8, body));
p.part("guide-spacer-1", cylinderPart(-360, 0, 1010, 45, 26, 8, body));
p.part("guide-spacer-2", cylinderPart(-120, 0, 1010, 45, 26, 8, body));
p.part("guide-spacer-3", cylinderPart(120, 0, 1010, 45, 26, 8, body));
p.part("guide-spacer-4", cylinderPart(360, 0, 1010, 45, 26, 8, body));
p.part("guide-spacer-5", cylinderPart(600, 0, 1010, 45, 26, 8, body));

return p.model();
