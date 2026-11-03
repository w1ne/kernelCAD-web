// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "beverage-blend-tank",
  license: 'CC0-1.0',
  title: "Beverage blend tank",
  description: "Agitated blend tank with jacket band, manway, sight glass, and sanitary outlet. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("beverage-blend-tank");
p.part("vessel-shell", cylinderPart(0, 0, 70, 1050, 390, 14, body));
p.part("top-head", cylinderPart(0, 0, 1120, 110, 360, 14, body));
p.part("bottom-head", cylinderPart(0, 0, 0, 80, 350, 14, body));
p.part("jacket-band", cylinderPart(0, 0, 360, 430, 415, 14, accent));
p.part("manway", cylinderPart(0, -410, 990, 70, 145, 12, body));
p.part("agitator-drive", cylinderPart(0, 0, 1230, 250, 145, 12, accent));
p.part("shaft", cylinderPart(0, 0, 300, 810, 32, 8, body));
p.part("impeller-a", boxPart(0, 0, 540, 430, 35, 28, accent));
p.part("impeller-b", boxPart(0, 0, 820, 330, 35, 28, accent));
p.part("outlet", cylinderPart(0, -425, 95, 150, 50, 10, body));
p.part("leg-0", boxPart(230.0, 0.0, 0, 75, 75, 280, body));
p.part("leg-1", boxPart(0.00030516282623583256, 229.99999999979755, 0, 75, 75, 280, body));
p.part("leg-2", boxPart(-229.99999999919024, 0.0006103256524711279, 0, 75, 75, 280, body));
p.part("leg-3", boxPart(-0.0009154884788074894, -229.999999998178, 0, 75, 75, 280, body));

return p.model();
