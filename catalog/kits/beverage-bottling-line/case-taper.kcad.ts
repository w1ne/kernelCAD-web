// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "case-taper",
  license: 'CC0-1.0',
  title: "Case taper",
  description: "Adjustable side-belt carton taper with upper tape head and centering rails. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("case-taper");
p.part("base", boxPart(0, 0, 0, 1180, 760, 50, accent));
p.part("infeed-belt", boxPart(-260, 0, 310, 520, 560, 55, body));
p.part("outfeed-belt", boxPart(320, 0, 310, 520, 560, 55, body));
p.part("upright-front", boxPart(0, -280, 80, 70, 70, 820, body));
p.part("upright-back", boxPart(0, 280, 80, 70, 70, 820, body));
p.part("bridge", boxPart(0, 0, 900, 140, 700, 70, accent));
p.part("tape-head", boxPart(0, 0, 660, 250, 360, 210, body));
p.part("tape-roll", cylinderPart(0, -220, 650, 75, 110, 12, accent));
p.part("adjuster-front", boxPart(230, -230, 460, 360, 40, 45, body));
p.part("adjuster-back", boxPart(230, 230, 460, 360, 40, 45, body));
p.part("hmi-post", boxPart(500, -330, 70, 55, 55, 600, body));
p.part("hmi", boxPart(500, -350, 580, 170, 35, 120, accent));

return p.model();
