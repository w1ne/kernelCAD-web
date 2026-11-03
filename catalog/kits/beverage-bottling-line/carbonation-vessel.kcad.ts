// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "carbonation-vessel",
  license: 'CC0-1.0',
  title: "Beverage carbonation vessel",
  description: "Insulated pressure vessel with manway, sample valve, pressure gauge, and base ring. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("carbonation-vessel");
p.part("shell", cylinderPart(0, 0, 70, 1260, 360, 14, body));
p.part("top-cap", cylinderPart(0, 0, 1330, 100, 330, 14, body));
p.part("bottom-cap", cylinderPart(0, 0, 0, 80, 330, 14, body));
p.part("insulation-jacket", cylinderPart(0, 0, 500, 480, 378, 14, accent));
p.part("top-nozzle", cylinderPart(0, 0, 1430, 120, 58, 10, body));
p.part("carbon-dioxide-port", cylinderPart(0, -380, 1130, 140, 42, 10, body));
p.part("sample-valve", cylinderPart(0, 380, 370, 140, 35, 10, body));
p.part("pressure-gauge", cylinderPart(130, -400, 1220, 50, 55, 10, accent));
p.part("leg-0", boxPart(-210, -210, 0, 80, 80, 250, body));
p.part("leg-1", boxPart(210, -210, 0, 80, 80, 250, body));
p.part("leg-2", boxPart(-210, 210, 0, 80, 80, 250, body));
p.part("leg-3", boxPart(210, 210, 0, 80, 80, 250, body));
p.part("nameplate", boxPart(0, -382, 770, 190, 22, 120, accent));

return p.model();
