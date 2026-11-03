// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "sleeve-label-applicator",
  license: 'CC0-1.0',
  title: "Shrink-sleeve applicator",
  description: "Sleeve web former and cutting head positioned over a centered bottle conveyor. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("sleeve-label-applicator");
p.part("base", boxPart(0, 0, 0, 1050, 650, 50, accent));
p.part("conveyor", boxPart(0, 0, 250, 1050, 200, 50, body));
p.part("portal-left", boxPart(-360, 0, 70, 65, 65, 850, body));
p.part("portal-right", boxPart(360, 0, 70, 65, 65, 850, body));
p.part("portal-top", boxPart(0, 0, 920, 800, 70, 55, body));
p.part("film-roll", cylinderPart(-180, 220, 660, 50, 125, 12, accent));
p.part("forming-shoulder", boxPart(70, 0, 460, 220, 250, 110, body));
p.part("cutting-collar", cylinderPart(0, 0, 790, 80, 150, 12, body));
p.part("control-pod", boxPart(500, -200, 500, 190, 160, 300, accent));
p.part("feed-roller-0", xCylinderPart(0, -170, 520, 140, 45, 10, body));
p.part("feed-roller-1", xCylinderPart(0, -60, 610, 140, 45, 10, body));
p.part("feed-roller-2", xCylinderPart(0, 50, 700, 140, 45, 10, body));
p.part("feed-roller-3", xCylinderPart(0, 160, 790, 140, 45, 10, body));

return p.model();
