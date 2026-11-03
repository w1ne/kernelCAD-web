// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "preform-elevator",
  license: 'CC0-1.0',
  title: "Preform elevator",
  description: "Enclosed cleated elevator that lifts preforms to an overhead unscrambler feed. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("preform-elevator");
p.part("base-frame", boxPart(0, 0, 0, 500, 620, 45, accent));
p.part("lower-guard", boxPart(0, 0, 65, 310, 440, 500, body));
p.part("inclined-elevator-cover", boxPart(70, 0, 420, 330, 400, 850, body));
p.part("upper-discharge", boxPart(70, 0, 1070, 370, 440, 180, body));
p.part("side-rail-a", boxPart(-125, 0, 80, 55, 520, 950, accent));
p.part("side-rail-b", boxPart(265, 0, 80, 55, 520, 950, accent));
p.part("drive-motor", cylinderPart(-200, 0, 80, 180, 105, 12, body));
p.part("upper-pulley", cylinderPart(70, 0, 970, 100, 88, 12, accent));
p.part("cleat-0", boxPart(70, -170, 130, 255, 48, 40, accent));
p.part("cleat-1", boxPart(70, -85, 280, 255, 48, 40, accent));
p.part("cleat-2", boxPart(70, 0, 430, 255, 48, 40, accent));
p.part("cleat-3", boxPart(70, 85, 580, 255, 48, 40, accent));
p.part("cleat-4", boxPart(70, 170, 730, 255, 48, 40, accent));

return p.model();
