// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "wraparound-labeler",
  license: 'CC0-1.0',
  title: "Wraparound bottle labeler",
  description: "Roll-fed label station with a vacuum drum, applicator plate, bottle wrap belt, and control box. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("wraparound-labeler");
p.part("base-frame", boxPart(0, 0, 0, 1100, 700, 55, accent));
p.part("bottle-deck", boxPart(0, 0, 300, 1100, 250, 50, body));
p.part("left-column", boxPart(-440, 0, 75, 75, 75, 850, body));
p.part("right-column", boxPart(440, 0, 75, 75, 75, 850, body));
p.part("top-beam", boxPart(0, 0, 925, 1000, 90, 60, body));
p.part("label-roll", cylinderPart(-230, 210, 620, 50, 145, 12, accent));
p.part("vacuum-drum", cylinderPart(150, 0, 430, 320, 95, 12, body));
p.part("pressure-roller", xCylinderPart(340, 0, 390, 85, 62, 10, body));
p.part("control-box", boxPart(520, -200, 520, 230, 170, 390, accent));
p.part("web-guide", boxPart(-40, 190, 650, 500, 24, 38, body));

return p.model();
