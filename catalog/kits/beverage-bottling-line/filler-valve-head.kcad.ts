// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "filler-valve-head",
  license: 'CC0-1.0',
  title: "Filler valve head",
  description: "Single sanitary fill valve with spring bonnet, bottle centering bell, and product inlet port. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("filler-valve-head");
p.part("valve-body", cylinderPart(0, 0, 190, 270, 85, 12, body));
p.part("bonnet", cylinderPart(0, 0, 460, 120, 65, 10, accent));
p.part("stem", cylinderPart(0, 0, 90, 110, 26, 8, body));
p.part("centering-bell", cylinderPart(0, 0, 0, 80, 155, 12, body));
p.part("product-port", cylinderPart(0, -95, 330, 145, 36, 10, body));
p.part("mounting-tab", boxPart(0, 0, 565, 145, 145, 38, accent));
p.part("clamp-ear-0", boxPart(-92, 0, 420, 30, 45, 70, body));
p.part("clamp-ear-1", boxPart(92, 0, 420, 30, 45, 70, body));

return p.model();
