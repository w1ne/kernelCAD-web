// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "preform-bulk-bin",
  license: 'CC0-1.0',
  title: "PET preform bulk bin",
  description: "Ventilated bulk hopper for empty PET preforms with a steep throat and inspection lid. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("preform-bulk-bin");
p.part("foot-left", boxPart(-300, -250, 0, 90, 90, 100, accent));
p.part("foot-right", boxPart(300, -250, 0, 90, 90, 100, accent));
p.part("foot-back-left", boxPart(-300, 250, 0, 90, 90, 100, accent));
p.part("foot-back-right", boxPart(300, 250, 0, 90, 90, 100, accent));
p.part("hopper-body", boxPart(0, 0, 100, 720, 620, 500, body));
p.part("sloped-throat", boxPart(0, 0, 0, 390, 330, 100, body));
p.part("inspection-lid", boxPart(0, 0, 610, 760, 660, 55, accent));
p.part("outlet-collar", boxPart(0, 0, 0, 170, 150, 150, body));

return p.model();
