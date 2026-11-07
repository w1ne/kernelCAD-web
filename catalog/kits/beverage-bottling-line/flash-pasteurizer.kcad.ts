// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "flash-pasteurizer",
  license: 'CC0-1.0',
  title: "Flash pasteurizer skid",
  description: "Plate heat exchanger and balance tank on a sanitary skid with return and product pumps. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("flash-pasteurizer");
p.part("skid-base", boxPart(0, 0, 0, 1450, 780, 55, accent));
p.part("exchanger-pack", boxPart(-250, 0, 130, 300, 540, 780, body));
p.part("plate-0", boxPart(-250, 0, 150, 16, 500, 700, accent));
p.part("plate-1", boxPart(-224, 0, 150, 16, 500, 700, accent));
p.part("plate-2", boxPart(-198, 0, 150, 16, 500, 700, accent));
p.part("plate-3", boxPart(-172, 0, 150, 16, 500, 700, accent));
p.part("plate-4", boxPart(-146, 0, 150, 16, 500, 700, accent));
p.part("plate-5", boxPart(-120, 0, 150, 16, 500, 700, accent));
p.part("plate-6", boxPart(-94, 0, 150, 16, 500, 700, accent));
p.part("plate-7", boxPart(-68, 0, 150, 16, 500, 700, accent));
p.part("balance-tank", cylinderPart(350, 0, 75, 580, 205, 12, body));
p.part("tank-lid", cylinderPart(350, 0, 655, 55, 220, 12, accent));
p.part("product-pump", cylinderPart(680, -220, 35, 170, 90, 10, body));
p.part("pump-motor", boxPart(680, -220, 210, 230, 180, 150, body));
p.part("control-panel", boxPart(650, 240, 380, 250, 170, 440, accent));
p.part("process-pipe-0", cylinderPart(-250, 360, 300, 220, 35, 10, body));
p.part("process-pipe-1", cylinderPart(-70, 360, 490, 220, 35, 10, body));
p.part("process-pipe-2", cylinderPart(110, 360, 300, 220, 35, 10, body));
p.part("process-pipe-3", cylinderPart(290, 360, 490, 220, 35, 10, body));
p.part("process-pipe-4", cylinderPart(470, 360, 300, 220, 35, 10, body));
p.part("upper-header", boxPart(100, 330, 780, 820, 55, 55, body));

return p.model();
