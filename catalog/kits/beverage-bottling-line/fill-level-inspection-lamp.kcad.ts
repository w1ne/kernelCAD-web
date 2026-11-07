// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "fill-level-inspection-lamp",
  license: 'CC0-1.0',
  title: "Fill-level inspection lamp",
  description: "Backlit inspection panel and bottle guide rails for a manual fill-level check. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("fill-level-inspection-lamp");
p.part("base", boxPart(0, 0, 0, 550, 340, 45, accent));
p.part("light-panel", boxPart(0, 0, 630, 500, 110, 820, body));
p.part("diffuser-face", boxPart(0, -62, 635, 430, 20, 750, accent));
p.part("top-hood", boxPart(0, 0, 1060, 590, 330, 70, body));
p.part("side-support-left", boxPart(-235, 0, 65, 45, 65, 500, body));
p.part("side-support-right", boxPart(235, 0, 65, 65, 65, 500, body));
p.part("bottle-guide-front", boxPart(0, -160, 175, 600, 28, 45, accent));
p.part("bottle-guide-back", boxPart(0, 160, 175, 600, 28, 45, accent));
p.part("inspection-knob", cylinderPart(240, -145, 450, 35, 24, 8, body));

return p.model();
