// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cap-feed-hopper",
  license: 'CC0-1.0',
  title: "Bottle-cap feed hopper",
  description: "Covered hopper and metering throat that supplies plastic closures to an orienter. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cap-feed-hopper");
p.part("stand", boxPart(0, 0, 20, 600, 470, 50, accent));
p.part("hopper", boxPart(0, 0, 250, 520, 440, 410, body));
p.part("throat", boxPart(0, 0, 90, 260, 260, 160, body));
p.part("lid", boxPart(0, 0, 470, 560, 480, 50, accent));
p.part("inspection-door", boxPart(0, -225, 300, 240, 24, 190, body));
p.part("vibrator-motor", cylinderPart(0, 0, 45, 85, 95, 10, body));
p.part("leg-0", boxPart(-240, -175, 0, 55, 55, 220, body));
p.part("leg-1", boxPart(240, -175, 0, 55, 55, 220, body));
p.part("leg-2", boxPart(-240, 175, 0, 55, 55, 220, body));
p.part("leg-3", boxPart(240, 175, 0, 55, 55, 220, body));

return p.model();
