// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "rinse-water-recovery-tank",
  license: 'CC0-1.0',
  title: "Rinse-water recovery tank",
  description: "Small recovery tank with screened inlet, pump stand, level column, and return nozzle. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("rinse-water-recovery-tank");
p.part("tank-shell", cylinderPart(0, 0, 30, 620, 285, 12, body));
p.part("cover", cylinderPart(0, 0, 650, 65, 310, 12, accent));
p.part("inlet-screen", cylinderPart(-330, 0, 370, 150, 70, 10, body));
p.part("return-nozzle", cylinderPart(0, 330, 520, 170, 45, 10, body));
p.part("pump", cylinderPart(250, -220, 25, 160, 92, 10, body));
p.part("pump-motor", boxPart(250, -220, 185, 190, 160, 130, body));
p.part("support-a", boxPart(-170, 0, 0, 60, 60, 30, accent));
p.part("support-b", boxPart(170, 0, 0, 60, 60, 30, accent));
p.part("level-column", boxPart(-210, -310, 130, 42, 28, 410, accent));

return p.model();
