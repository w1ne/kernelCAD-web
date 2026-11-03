// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "case-checkweigher",
  license: 'CC0-1.0',
  title: "Packed-case checkweigher",
  description: "Short in-line weigh belt with isolated weigh section, reject output, and status tower. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("case-checkweigher");
p.part("left-bed", boxPart(-330, 0, 290, 580, 620, 55, body));
p.part("weigh-bed", boxPart(0, 0, 265, 440, 620, 70, accent));
p.part("right-bed", boxPart(330, 0, 290, 580, 620, 55, body));
p.part("frame-front", boxPart(0, -320, 220, 1260, 45, 75, body));
p.part("frame-back", boxPart(0, 320, 220, 1260, 45, 75, body));
p.part("load-cell-0", boxPart(-150, -230, 120, 90, 90, 150, accent));
p.part("load-cell-1", boxPart(150, -230, 120, 90, 90, 150, accent));
p.part("load-cell-2", boxPart(-150, 230, 120, 90, 90, 150, accent));
p.part("load-cell-3", boxPart(150, 230, 120, 90, 90, 150, accent));
p.part("hmi-post", boxPart(420, -390, 65, 55, 55, 620, body));
p.part("hmi", boxPart(420, -420, 595, 180, 45, 130, body));
p.part("status-lamp", cylinderPart(420, -390, 700, 80, 38, 8, accent));
p.part("leg-0", boxPart(-430, 0, 0, 55, 55, 210, body));
p.part("leg-1", boxPart(0, 0, 0, 55, 55, 210, body));
p.part("leg-2", boxPart(430, 0, 0, 55, 55, 210, body));

return p.model();
