// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-unscrambler",
  license: 'CC0-1.0',
  title: "Bottle unscrambler",
  description: "Rotary bowl and discharge starwheel orient empty bottles before the line infeed. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("bottle-unscrambler");
p.part("support-base", cylinderPart(0, 0, 0, 120, 460, 12, body));
p.part("turntable", cylinderPart(0, 0, 120, 95, 420, 16, accent));
p.part("outer-rim", cylinderPart(0, 0, 195, 115, 470, 16, body));
p.part("center-column", cylinderPart(0, 0, 200, 650, 85, 10, body));
p.part("discharge-lane", boxPart(520, 0, 250, 530, 150, 55, accent));
p.part("lane-guide-a", boxPart(520, -88, 265, 530, 18, 95, body));
p.part("lane-guide-b", boxPart(520, 88, 265, 530, 18, 95, body));
p.part("drive-motor", cylinderPart(-280, 0, 35, 235, 105, 12, body));
p.part("bowl-cleat-0", boxPart(-130, 0, 220, 25, 300, 50, body));
p.part("bowl-cleat-1", boxPart(-78, 0, 220, 25, 300, 50, body));
p.part("bowl-cleat-2", boxPart(-26, 0, 220, 25, 300, 50, body));
p.part("bowl-cleat-3", boxPart(26, 0, 220, 25, 300, 50, body));
p.part("bowl-cleat-4", boxPart(78, 0, 220, 25, 300, 50, body));
p.part("bowl-cleat-5", boxPart(130, 0, 220, 25, 300, 50, body));

return p.model();
