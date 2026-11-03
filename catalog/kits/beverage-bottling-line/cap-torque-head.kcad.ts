// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cap-torque-head",
  license: 'CC0-1.0',
  title: "Cap torque head",
  description: "Compact capping chuck with drive housing, adjustable spindle, and closure grip ring. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cap-torque-head");
p.part("spindle", cylinderPart(0, 0, 0, 310, 34, 10, body));
p.part("chuck", cylinderPart(0, 0, 310, 100, 90, 12, accent));
p.part("grip-ring", cylinderPart(0, 0, 300, 35, 106, 12, body));
p.part("drive-body", boxPart(0, 0, 480, 220, 220, 230, body));
p.part("mount-plate", boxPart(0, 0, 710, 330, 310, 50, accent));
p.part("air-port", boxPart(160, 0, 545, 95, 75, 65, body));
p.part("bolt-tab-0", boxPart(-145, -135, 710, 50, 50, 75, body));
p.part("bolt-tab-1", boxPart(145, -135, 710, 50, 50, 75, body));
p.part("bolt-tab-2", boxPart(-145, 135, 710, 50, 50, 75, body));
p.part("bolt-tab-3", boxPart(145, 135, 710, 50, 50, 75, body));

return p.model();
