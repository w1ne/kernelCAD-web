// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "slip-sheet-dispenser",
  license: 'CC0-1.0',
  title: "Pallet slip-sheet dispenser",
  description: "Magazine and vacuum pick head feed a separator sheet to the palletizing station. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("slip-sheet-dispenser");
p.part("base", boxPart(0, 0, 0, 720, 620, 55, accent));
p.part("sheet-stack", boxPart(0, 0, 150, 560, 460, 280, body));
p.part("magazine-post-left", boxPart(-300, 0, 75, 55, 55, 850, body));
p.part("magazine-post-right", boxPart(300, 0, 75, 55, 55, 850, body));
p.part("top-beam", boxPart(0, 0, 900, 660, 70, 60, body));
p.part("pick-head", boxPart(0, 0, 700, 400, 330, 110, accent));
p.part("vacuum-cup-0", cylinderPart(-130, -100, 630, 80, 33, 8, body));
p.part("vacuum-cup-1", cylinderPart(130, -100, 630, 80, 33, 8, body));
p.part("vacuum-cup-2", cylinderPart(-130, 100, 630, 80, 33, 8, body));
p.part("vacuum-cup-3", cylinderPart(130, 100, 630, 80, 33, 8, body));
p.part("outfeed-shelf", boxPart(0, 470, 310, 760, 240, 55, body));
p.part("vacuum-pump", cylinderPart(-260, -240, 80, 155, 70, 10, body));

return p.model();
