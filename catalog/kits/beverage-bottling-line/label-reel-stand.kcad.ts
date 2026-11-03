// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "label-reel-stand",
  license: 'CC0-1.0',
  title: "Label reel stand",
  description: "Freestanding unwind and rewind reels with a tensioning roller and web guide. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("label-reel-stand");
p.part("base", boxPart(0, 0, 20, 500, 420, 50, accent));
p.part("upright", boxPart(0, 0, 70, 60, 60, 850, body));
p.part("unwind-reel", cylinderPart(-190, 0, 520, 45, 170, 12, body));
p.part("rewind-reel", cylinderPart(190, 0, 520, 45, 125, 12, accent));
p.part("top-web-roller", xCylinderPart(0, 0, 810, 360, 38, 10, body));
p.part("lower-web-roller", xCylinderPart(0, 0, 300, 300, 32, 10, body));
p.part("tension-arm", boxPart(0, 0, 425, 380, 35, 35, accent));
p.part("adjustment-knob", cylinderPart(0, -60, 430, 50, 45, 10, body));
p.part("foot-0", boxPart(-190, -150, 0, 70, 70, 65, body));
p.part("foot-1", boxPart(190, -150, 0, 70, 70, 65, body));
p.part("foot-2", boxPart(-190, 150, 0, 70, 70, 65, body));
p.part("foot-3", boxPart(190, 150, 0, 70, 70, 65, body));

return p.model();
