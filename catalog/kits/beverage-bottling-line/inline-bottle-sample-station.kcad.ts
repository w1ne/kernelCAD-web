// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "inline-bottle-sample-station",
  license: 'CC0-1.0',
  title: "In-line bottle sample station",
  description: "Small sanitary sample point with bottle shelf, rinse sink, and product line valve. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("inline-bottle-sample-station");
p.part("base", boxPart(0, 0, 0, 600, 430, 50, accent));
p.part("upright", boxPart(0, 0, 70, 55, 55, 670, body));
p.part("shelf", boxPart(0, -80, 480, 550, 240, 45, body));
p.part("sample-bottle-holder", boxPart(0, -80, 525, 130, 130, 80, accent));
p.part("rinse-cup", boxPart(210, 120, 475, 150, 150, 55, body));
p.part("sample-valve", cylinderPart(0, 170, 640, 120, 40, 10, body));
p.part("sample-spout", cylinderPart(0, 100, 565, 100, 22, 8, accent));
p.part("drain-pan", boxPart(0, 150, 410, 380, 180, 30, body));
p.part("line-guard", boxPart(0, 0, 680, 490, 30, 35, accent));
p.part("nameplate", boxPart(180, -40, 570, 120, 20, 70, body));

return p.model();
