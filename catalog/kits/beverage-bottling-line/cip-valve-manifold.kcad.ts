// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cip-valve-manifold",
  license: 'CC0-1.0',
  title: "CIP valve manifold",
  description: "Sanitary valve cluster routes clean-in-place supply and return through color-coded branches. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cip-valve-manifold");
p.part("supply-header", cylinderPart(0, 0, 30, 850, 48, 10, body));
p.part("return-header", cylinderPart(0, 260, 30, 850, 48, 10, body));
p.part("cross-header", cylinderPart(0, 130, 30, 850, 35, 10, accent));
p.part("branch-0", cylinderPart(-300, 130, 30, 310, 30, 8, body));
p.part("branch-1", cylinderPart(-100, 130, 30, 310, 30, 8, body));
p.part("branch-2", cylinderPart(100, 130, 30, 310, 30, 8, body));
p.part("branch-3", cylinderPart(300, 130, 30, 310, 30, 8, body));
p.part("valve-actuator-0", boxPart(-300, 130, 360, 110, 105, 95, accent));
p.part("valve-actuator-1", boxPart(-100, 130, 360, 110, 105, 95, accent));
p.part("valve-actuator-2", boxPart(100, 130, 360, 110, 105, 95, accent));
p.part("valve-actuator-3", boxPart(300, 130, 360, 110, 105, 95, accent));
p.part("mount-foot-0", boxPart(-360, -90, 0, 70, 70, 30, body));
p.part("mount-foot-1", boxPart(360, -90, 0, 70, 70, 30, body));
p.part("mount-foot-2", boxPart(-360, 350, 0, 70, 70, 30, body));
p.part("mount-foot-3", boxPart(360, 350, 0, 70, 70, 30, body));
p.part("drain-leg", cylinderPart(0, 130, 0, 90, 42, 8, body));

return p.model();
