// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "sanitary-lobe-pump",
  license: 'CC0-1.0',
  title: "Sanitary rotary-lobe pump",
  description: "Low-shear lobe pump with polished casing, motor, coupling guard, and cleanable feet. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("sanitary-lobe-pump");
p.part("base", boxPart(0, 0, 0, 660, 430, 50, accent));
p.part("pump-casing", cylinderPart(-130, 0, 80, 255, 160, 12, body));
p.part("front-cover", cylinderPart(-130, -185, 215, 50, 155, 12, accent));
p.part("inlet", cylinderPart(-130, 0, 330, 115, 62, 10, body));
p.part("outlet", cylinderPart(-130, 190, 205, 115, 62, 10, body));
p.part("gearbox", boxPart(120, 0, 95, 240, 250, 200, body));
p.part("motor", boxPart(350, 0, 110, 320, 280, 230, body));
p.part("coupling-guard", xCylinderPart(65, 0, 200, 185, 72, 10, accent));
p.part("foot-0", boxPart(-260, -145, 0, 75, 75, 95, body));
p.part("foot-1", boxPart(260, -145, 0, 75, 75, 95, body));
p.part("foot-2", boxPart(-260, 145, 0, 75, 75, 95, body));
p.part("foot-3", boxPart(260, 145, 0, 75, 75, 95, body));

return p.model();
