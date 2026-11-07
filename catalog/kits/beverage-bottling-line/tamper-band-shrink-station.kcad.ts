// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "tamper-band-shrink-station",
  license: 'CC0-1.0',
  title: "Tamper-band shrink station",
  description: "Bottle neck band station with a compact heat ring, guide rails, and exhaust hood. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("tamper-band-shrink-station");
p.part("base", boxPart(0, 0, 0, 820, 720, 50, accent));
p.part("heat-ring", boxPart(0, 0, 520, 250, 230, 280, body));
p.part("opening-frame", boxPart(0, 0, 730, 480, 320, 45, accent));
p.part("side-panel-left", boxPart(-310, 0, 65, 75, 520, 650, body));
p.part("side-panel-right", boxPart(310, 0, 65, 75, 520, 650, body));
p.part("top-hood", boxPart(0, 0, 780, 700, 610, 80, body));
p.part("exhaust-fan", cylinderPart(0, 230, 860, 170, 92, 10, body));
p.part("infeed-guide", boxPart(-420, 0, 250, 300, 210, 45, body));
p.part("outfeed-guide", boxPart(420, 0, 250, 300, 210, 45, body));

return p.model();
