// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-reject-pusher",
  license: 'CC0-1.0',
  title: "Bottle reject pusher",
  description: "Side-mounted pneumatic pusher diverts a failed bottle into a padded reject chute. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("bottle-reject-pusher");
p.part("conveyor-bed", boxPart(0, 0, 330, 950, 280, 50, accent));
p.part("side-frame", boxPart(0, -165, 290, 950, 38, 65, body));
p.part("pneumatic-cylinder", boxPart(0, 250, 520, 340, 115, 130, body));
p.part("piston-rod", xCylinderPart(0, 145, 525, 260, 26, 8, accent));
p.part("pusher-pad", boxPart(0, 10, 505, 170, 225, 110, body));
p.part("reject-chute", boxPart(0, 520, 185, 700, 210, 45, accent));
p.part("leg-0", boxPart(-340, 0, 0, 52, 52, 285, body));
p.part("leg-1", boxPart(0, 0, 0, 52, 52, 285, body));
p.part("leg-2", boxPart(340, 0, 0, 52, 52, 285, body));
p.part("valve-block", boxPart(-230, 250, 490, 150, 120, 120, accent));

return p.model();
