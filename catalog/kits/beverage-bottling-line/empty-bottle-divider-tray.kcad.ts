// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "empty-bottle-divider-tray",
  license: 'CC0-1.0',
  title: "Empty bottle divider tray",
  description: "Washable compartment tray spaces glass bottles for returnable-container handling. Knobs: overall scale, equipment color, and safety accent.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'item',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const body = param('body', '#a6b3b4', { label: 'Equipment color' });
const accent = param('accent', '#e3a23d', { label: 'Safety accent' });
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);

const p = assembly("empty-bottle-divider-tray");
p.part("tray-floor", boxPart(0, 0, 20, 760, 560, 40, accent));
p.part("rim-front", boxPart(0, -270, 60, 760, 35, 80, body));
p.part("rim-back", boxPart(0, 270, 60, 760, 35, 80, body));
p.part("rim-left", boxPart(-365, 0, 60, 35, 505, 80, body));
p.part("rim-right", boxPart(365, 0, 60, 35, 505, 80, body));
p.part("divider-x-0", boxPart(-240, 0, 60, 20, 500, 55, body));
p.part("divider-x-1", boxPart(-80, 0, 60, 20, 500, 55, body));
p.part("divider-x-2", boxPart(80, 0, 60, 20, 500, 55, body));
p.part("divider-x-3", boxPart(240, 0, 60, 20, 500, 55, body));
p.part("divider-y-0", boxPart(0, -180, 60, 730, 18, 55, body));
p.part("divider-y-1", boxPart(0, -60, 60, 730, 18, 55, body));
p.part("divider-y-2", boxPart(0, 60, 60, 730, 18, 55, body));
p.part("foot-0", boxPart(-300, -200, 0, 70, 70, 25, accent));
p.part("foot-1", boxPart(300, -200, 0, 70, 70, 25, accent));
p.part("foot-2", boxPart(-300, 200, 0, 70, 70, 25, accent));
p.part("foot-3", boxPart(300, 200, 0, 70, 70, 25, accent));

return p.model();
