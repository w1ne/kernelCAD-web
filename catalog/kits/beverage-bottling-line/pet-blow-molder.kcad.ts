// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "pet-blow-molder",
  license: 'CC0-1.0',
  title: "PET stretch blow molder",
  description: "Guarded stretch-blow station with preform heating bays and paired bottle mold nests. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("pet-blow-molder");
p.part("base", boxPart(0, 0, 0, 1350, 720, 50, accent));
p.part("machine-body", boxPart(0, 0, 540, 1150, 620, 970, body));
p.part("service-door-left", boxPart(-370, -325, 520, 380, 28, 780, accent));
p.part("service-door-right", boxPart(50, -325, 520, 380, 28, 780, accent));
p.part("heating-tunnel", boxPart(450, 80, 610, 300, 380, 600, body));
p.part("control-pedestal", boxPart(750, -250, 390, 180, 140, 680, accent));
p.part("mold-column-0", cylinderPart(-370, 0, 70, 800, 34, 8, accent));
p.part("mold-column-1", cylinderPart(-185, 0, 70, 800, 34, 8, accent));
p.part("mold-column-2", cylinderPart(0, 0, 70, 800, 34, 8, accent));
p.part("mold-column-3", cylinderPart(185, 0, 70, 800, 34, 8, accent));
p.part("mold-column-4", cylinderPart(370, 0, 70, 800, 34, 8, accent));
p.part("mold-station-0", boxPart(-370, 270, 180, 105, 125, 350, body));
p.part("mold-station-1", boxPart(-185, 270, 180, 105, 125, 350, body));
p.part("mold-station-2", boxPart(0, 270, 180, 105, 125, 350, body));
p.part("mold-station-3", boxPart(185, 270, 180, 105, 125, 350, body));
p.part("mold-station-4", boxPart(370, 270, 180, 105, 125, 350, body));
p.part("top-crossbeam", boxPart(0, 0, 1050, 1260, 80, 65, accent));

return p.model();
