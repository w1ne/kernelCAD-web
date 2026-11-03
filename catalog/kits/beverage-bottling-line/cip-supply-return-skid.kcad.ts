// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cip-supply-return-skid",
  license: 'CC0-1.0',
  title: "CIP supply and return skid",
  description: "Compact cleaning-in-place skid with two solution tanks, pump, heat exchanger, and pipe loop. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cip-supply-return-skid");
p.part("skid", boxPart(0, 0, 0, 1470, 780, 55, accent));
p.part("cip-tank-0", cylinderPart(-450, 170, 80, 610, 210, 12, body));
p.part("cip-tank-1", cylinderPart(250, 170, 80, 610, 210, 12, body));
p.part("cip-lid-0", cylinderPart(-450, 170, 690, 55, 225, 12, accent));
p.part("cip-lid-1", cylinderPart(250, 170, 690, 55, 225, 12, accent));
p.part("return-pump", cylinderPart(-10, -230, 50, 180, 96, 10, body));
p.part("pump-motor", boxPart(-10, -230, 230, 220, 190, 150, body));
p.part("plate-exchanger", boxPart(590, -120, 120, 250, 360, 500, body));
p.part("exchanger-plate-0", boxPart(500, -120, 135, 14, 320, 465, accent));
p.part("exchanger-plate-1", boxPart(525, -120, 135, 14, 320, 465, accent));
p.part("exchanger-plate-2", boxPart(550, -120, 135, 14, 320, 465, accent));
p.part("exchanger-plate-3", boxPart(575, -120, 135, 14, 320, 465, accent));
p.part("exchanger-plate-4", boxPart(600, -120, 135, 14, 320, 465, accent));
p.part("exchanger-plate-5", boxPart(625, -120, 135, 14, 320, 465, accent));
p.part("supply-header", cylinderPart(0, -330, 560, 1100, 42, 10, body));
p.part("return-header", cylinderPart(0, -400, 310, 1100, 42, 10, body));
p.part("control-cabinet", boxPart(585, 260, 360, 210, 180, 430, accent));
p.part("valve-0", cylinderPart(-390, -330, 600, 90, 40, 10, body));
p.part("valve-1", cylinderPart(-180, -330, 600, 90, 40, 10, body));
p.part("valve-2", cylinderPart(30, -330, 600, 90, 40, 10, body));
p.part("valve-3", cylinderPart(240, -330, 600, 90, 40, 10, body));
p.part("valve-4", cylinderPart(450, -330, 600, 90, 40, 10, body));

return p.model();
