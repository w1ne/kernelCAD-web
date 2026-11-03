// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-accumulation-table",
  license: 'CC0-1.0',
  title: "Bottle accumulation table",
  description: "Low-speed round accumulation table with entry rail, exit lane, and central drive. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("bottle-accumulation-table");
p.part("table-top", cylinderPart(0, 0, 260, 90, 610, 16, accent));
p.part("central-drive", cylinderPart(0, 0, 75, 185, 180, 12, body));
p.part("turntable-rim", cylinderPart(0, 0, 330, 45, 625, 16, body));
p.part("infeed-lane", boxPart(-690, 0, 280, 390, 160, 40, body));
p.part("outfeed-lane", boxPart(690, 0, 280, 390, 160, 40, accent));
p.part("leg-0", boxPart(360.0, 0.0, 0, 58, 58, 260, body));
p.part("leg-1", boxPart(0.0004776461628039118, 359.99999999968315, 0, 58, 58, 260, body));
p.part("leg-2", boxPart(-359.9999999987325, 0.0009552923256069827, 0, 58, 58, 260, body));
p.part("leg-3", boxPart(-0.0014329384885682444, -359.99999999714817, 0, 58, 58, 260, body));
p.part("outer-guide-0", boxPart(-400, 610, 350, 150, 30, 45, accent));
p.part("outer-guide-1", boxPart(-240, 610, 350, 150, 30, 45, accent));
p.part("outer-guide-2", boxPart(-80, 610, 350, 150, 30, 45, accent));
p.part("outer-guide-3", boxPart(80, 610, 350, 150, 30, 45, accent));
p.part("outer-guide-4", boxPart(240, 610, 350, 150, 30, 45, accent));
p.part("outer-guide-5", boxPart(400, 610, 350, 150, 30, 45, accent));

return p.model();
