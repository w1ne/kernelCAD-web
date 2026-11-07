// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cap-elevator",
  license: 'CC0-1.0',
  title: "Bottle-cap elevator",
  description: "Enclosed cleated elevator lifts closures from the hopper to an overhead cap sorter. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cap-elevator");
p.part("base", boxPart(0, 0, 0, 420, 560, 45, accent));
p.part("lower-guard", boxPart(0, 0, 65, 300, 450, 400, body));
p.part("elevator-shroud", boxPart(70, 0, 300, 320, 360, 850, body));
p.part("top-discharge", boxPart(70, 0, 1000, 390, 410, 220, body));
p.part("side-rail-a", boxPart(-120, 0, 55, 48, 500, 1100, accent));
p.part("side-rail-b", boxPart(260, 0, 55, 48, 500, 1100, accent));
p.part("drive", cylinderPart(-190, 0, 30, 155, 98, 10, body));
p.part("cleat-0", boxPart(70, -145, 100, 245, 42, 38, accent));
p.part("cleat-1", boxPart(70, -73, 255, 245, 42, 38, accent));
p.part("cleat-2", boxPart(70, -1, 410, 245, 42, 38, accent));
p.part("cleat-3", boxPart(70, 71, 565, 245, 42, 38, accent));
p.part("cleat-4", boxPart(70, 143, 720, 245, 42, 38, accent));
p.part("cleat-5", boxPart(70, 215, 875, 245, 42, 38, accent));

return p.model();
