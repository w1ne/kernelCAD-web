// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "air-rinse-enclosure",
  license: 'CC0-1.0',
  title: "Air rinse enclosure",
  description: "Compact enclosure around an ionized-air bottle rinse with access doors and extraction hood. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("air-rinse-enclosure");
p.part("base-tray", boxPart(0, 0, 0, 1250, 780, 60, accent));
p.part("left-panel", boxPart(-540, 0, 60, 90, 720, 760, body));
p.part("right-panel", boxPart(540, 0, 60, 90, 720, 760, body));
p.part("rear-panel", boxPart(0, 330, 60, 1020, 80, 760, body));
p.part("roof", boxPart(0, 0, 820, 1180, 780, 70, body));
p.part("front-door-left", boxPart(-280, -350, 80, 450, 35, 680, accent));
p.part("front-door-right", boxPart(280, -350, 80, 450, 35, 680, accent));
p.part("air-jet-0", cylinderPart(-390, 0, 500, 180, 28, 8, body));
p.part("air-jet-1", cylinderPart(-260, 0, 500, 180, 28, 8, body));
p.part("air-jet-2", cylinderPart(-130, 0, 500, 180, 28, 8, body));
p.part("air-jet-3", cylinderPart(0, 0, 500, 180, 28, 8, body));
p.part("air-jet-4", cylinderPart(130, 0, 500, 180, 28, 8, body));
p.part("air-jet-5", cylinderPart(260, 0, 500, 180, 28, 8, body));
p.part("air-jet-6", cylinderPart(390, 0, 500, 180, 28, 8, body));
p.part("exhaust-stack", cylinderPart(0, 260, 870, 210, 110, 10, accent));

return p.model();
