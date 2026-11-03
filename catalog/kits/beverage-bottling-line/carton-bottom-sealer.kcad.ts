// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "carton-bottom-sealer",
  license: 'CC0-1.0',
  title: "Carton bottom sealer",
  description: "Drive-belt case sealer closes erected carton flaps before bottle loading. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("carton-bottom-sealer");
p.part("base-frame", boxPart(0, 0, 0, 1300, 750, 50, accent));
p.part("infeed-bed", boxPart(-360, 0, 320, 520, 520, 55, body));
p.part("outfeed-bed", boxPart(360, 0, 320, 520, 520, 55, body));
p.part("top-crossbeam", boxPart(0, 0, 930, 740, 100, 65, accent));
p.part("tower-left", boxPart(-300, 0, 80, 70, 70, 800, body));
p.part("tower-right", boxPart(300, 0, 80, 70, 70, 800, body));
p.part("tape-head", boxPart(0, 0, 740, 240, 320, 170, body));
p.part("tape-roll", cylinderPart(0, -190, 680, 65, 110, 12, accent));
p.part("guide-0", boxPart(-480, 0, 390, 40, 590, 60, body));
p.part("guide-1", boxPart(-160, 0, 390, 40, 590, 60, body));
p.part("guide-2", boxPart(160, 0, 390, 40, 590, 60, body));
p.part("guide-3", boxPart(480, 0, 390, 40, 590, 60, body));

return p.model();
