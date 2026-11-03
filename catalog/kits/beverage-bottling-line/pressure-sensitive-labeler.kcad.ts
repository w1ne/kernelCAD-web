// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "pressure-sensitive-labeler",
  license: 'CC0-1.0',
  title: "Pressure-sensitive labeler",
  description: "Front-and-back label applicators with tamp pads, web rolls, bottle guides, and HMI stand. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("pressure-sensitive-labeler");
p.part("base", boxPart(0, 0, 0, 1160, 680, 55, accent));
p.part("conveyor", boxPart(0, 0, 280, 1160, 190, 48, body));
p.part("mast-front", boxPart(0, -260, 75, 70, 70, 900, body));
p.part("mast-back", boxPart(0, 260, 75, 70, 70, 900, body));
p.part("front-roll", cylinderPart(-220, -260, 610, 50, 135, 12, accent));
p.part("back-roll", cylinderPart(-220, 260, 610, 50, 135, 12, accent));
p.part("front-tamp-pad", boxPart(150, -210, 470, 250, 120, 150, body));
p.part("back-tamp-pad", boxPart(150, 210, 470, 250, 120, 150, body));
p.part("hmi-post", boxPart(470, -330, 70, 60, 60, 690, accent));
p.part("hmi-screen", boxPart(470, -345, 690, 180, 40, 135, body));
p.part("guide-0", boxPart(-400, 0, 330, 35, 240, 45, body));
p.part("guide-1", boxPart(-140, 0, 330, 35, 240, 45, body));
p.part("guide-2", boxPart(120, 0, 330, 35, 240, 45, body));
p.part("guide-3", boxPart(380, 0, 330, 35, 240, 45, body));

return p.model();
