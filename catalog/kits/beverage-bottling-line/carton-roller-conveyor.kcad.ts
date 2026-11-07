// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "carton-roller-conveyor",
  license: 'CC0-1.0',
  title: "Carton roller conveyor",
  description: "Wide gravity roller conveyor transfers sealed cartons between packing stations. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("carton-roller-conveyor");
p.part("side-frame-front", boxPart(0, -270, 360, 1650, 45, 80, accent));
p.part("side-frame-back", boxPart(0, 270, 360, 1650, 45, 80, accent));
p.part("roller-0", xCylinderPart(-720, 0, 420, 520, 30, 8, body));
p.part("roller-1", xCylinderPart(-600, 0, 420, 520, 30, 8, body));
p.part("roller-2", xCylinderPart(-480, 0, 420, 520, 30, 8, body));
p.part("roller-3", xCylinderPart(-360, 0, 420, 520, 30, 8, body));
p.part("roller-4", xCylinderPart(-240, 0, 420, 520, 30, 8, body));
p.part("roller-5", xCylinderPart(-120, 0, 420, 520, 30, 8, body));
p.part("roller-6", xCylinderPart(0, 0, 420, 520, 30, 8, body));
p.part("roller-7", xCylinderPart(120, 0, 420, 520, 30, 8, body));
p.part("roller-8", xCylinderPart(240, 0, 420, 520, 30, 8, body));
p.part("roller-9", xCylinderPart(360, 0, 420, 520, 30, 8, body));
p.part("roller-10", xCylinderPart(480, 0, 420, 520, 30, 8, body));
p.part("roller-11", xCylinderPart(600, 0, 420, 520, 30, 8, body));
p.part("roller-12", xCylinderPart(720, 0, 420, 520, 30, 8, body));
p.part("leg-0", boxPart(-600, 0, 0, 65, 65, 340, body));
p.part("leg-1", boxPart(-200, 0, 0, 65, 65, 340, body));
p.part("leg-2", boxPart(200, 0, 0, 65, 65, 340, body));
p.part("leg-3", boxPart(600, 0, 0, 65, 65, 340, body));
p.part("crossbar-0", boxPart(-600, 0, 300, 560, 45, 38, body));
p.part("crossbar-1", boxPart(-200, 0, 300, 560, 45, 38, body));
p.part("crossbar-2", boxPart(200, 0, 300, 560, 45, 38, body));
p.part("crossbar-3", boxPart(600, 0, 300, 560, 45, 38, body));
p.part("end-stop", boxPart(830, 0, 390, 50, 520, 105, body));

return p.model();
