// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-infeed-conveyor",
  license: 'CC0-1.0',
  title: "Bottle infeed conveyor",
  description: "Narrow belt with adjustable guides and a dead-plate transfer into the rinser. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("bottle-infeed-conveyor");
p.part("belt", boxPart(0, 0, 700, 1500, 230, 50, accent));
p.part("side-frame-front", boxPart(0, -145, 660, 1500, 40, 80, body));
p.part("side-frame-back", boxPart(0, 145, 660, 1500, 40, 80, body));
p.part("guide-front", boxPart(0, -80, 760, 1500, 18, 52, body));
p.part("guide-back", boxPart(0, 80, 760, 1500, 18, 52, body));
p.part("leg-0", boxPart(-570, 0, 0, 55, 55, 650, body));
p.part("leg-1", boxPart(-190, 0, 0, 55, 55, 650, body));
p.part("leg-2", boxPart(190, 0, 0, 55, 55, 650, body));
p.part("leg-3", boxPart(570, 0, 0, 55, 55, 650, body));
p.part("drive-roller-0", xCylinderPart(-670, 0, 700, 40, 37, 10, accent));
p.part("drive-roller-1", xCylinderPart(670, 0, 700, 40, 37, 10, accent));
p.part("transfer-plate", boxPart(790, 0, 700, 90, 340, 35, body));

return p.model();
