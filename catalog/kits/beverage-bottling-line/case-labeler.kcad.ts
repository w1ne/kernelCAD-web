// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "case-labeler",
  license: 'CC0-1.0',
  title: "Case label applicator",
  description: "Print-and-apply head places a shipping label on the face of a moving carton. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("case-labeler");
p.part("floor-base", boxPart(0, 0, 0, 600, 470, 55, accent));
p.part("mast", boxPart(0, 0, 75, 75, 75, 920, body));
p.part("printer-body", boxPart(160, 0, 600, 320, 220, 290, body));
p.part("display", boxPart(190, -120, 760, 190, 25, 105, accent));
p.part("label-roll", cylinderPart(100, 155, 800, 55, 120, 12, body));
p.part("peel-roller", xCylinderPart(330, 0, 520, 120, 38, 10, accent));
p.part("apply-pad", boxPart(390, 0, 410, 150, 260, 90, body));
p.part("air-regulator", boxPart(-150, -100, 250, 120, 90, 120, accent));
p.part("mounting-arm", boxPart(210, 0, 500, 300, 45, 45, body));

return p.model();
