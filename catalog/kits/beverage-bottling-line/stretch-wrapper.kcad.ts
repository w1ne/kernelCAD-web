// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "stretch-wrapper",
  license: 'CC0-1.0',
  title: "Pallet stretch wrapper",
  description: "Turntable wrapper with film carriage, mast rollers, and adjustable load-height sensor. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("stretch-wrapper");
p.part("turntable", cylinderPart(0, 0, 0, 95, 650, 16, accent));
p.part("turntable-hub", cylinderPart(0, 0, 95, 85, 170, 12, body));
p.part("mast-base", boxPart(650, 0, 20, 240, 250, 50, accent));
p.part("mast", boxPart(650, 0, 70, 85, 85, 1730, body));
p.part("film-carriage", boxPart(560, 0, 600, 250, 250, 420, body));
p.part("film-roll", cylinderPart(470, -155, 710, 80, 140, 12, accent));
p.part("film-roller-0", xCylinderPart(600, -100, 680, 120, 35, 10, body));
p.part("film-roller-1", xCylinderPart(600, -100, 790, 120, 35, 10, body));
p.part("film-roller-2", xCylinderPart(600, -100, 900, 120, 35, 10, body));
p.part("control-box", boxPart(760, -190, 450, 180, 150, 340, accent));
p.part("photoeye", cylinderPart(600, 100, 1570, 70, 38, 8, body));

return p.model();
