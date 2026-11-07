// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "sleeve-shrink-tunnel",
  license: 'CC0-1.0',
  title: "Bottle sleeve shrink tunnel",
  description: "Heated tunnel with insulated hood, bottle openings, ventilation fan, and guarded conveyor. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("sleeve-shrink-tunnel");
p.part("conveyor-bed", boxPart(0, 0, 250, 1450, 300, 65, accent));
p.part("tunnel-shell", boxPart(0, 0, 430, 980, 560, 420, body));
p.part("roof", boxPart(0, 0, 850, 1020, 600, 65, body));
p.part("opening-front", boxPart(-500, 0, 460, 90, 410, 340, accent));
p.part("opening-back", boxPart(500, 0, 460, 90, 410, 340, accent));
p.part("vent-0", cylinderPart(-250, 180, 915, 105, 65, 10, body));
p.part("vent-1", cylinderPart(0, 180, 915, 105, 65, 10, body));
p.part("vent-2", cylinderPart(250, 180, 915, 105, 65, 10, body));
p.part("leg-0", boxPart(-560, 0, 0, 55, 55, 250, body));
p.part("leg-1", boxPart(-190, 0, 0, 55, 55, 250, body));
p.part("leg-2", boxPart(180, 0, 0, 55, 55, 250, body));
p.part("leg-3", boxPart(550, 0, 0, 55, 55, 250, body));
p.part("temperature-panel", boxPart(610, -240, 560, 170, 70, 250, accent));

return p.model();
