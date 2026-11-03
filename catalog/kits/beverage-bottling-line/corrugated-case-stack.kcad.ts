// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "corrugated-case-stack",
  license: 'CC0-1.0',
  title: "Corrugated case stack",
  description: "Neat stack of knocked-down corrugated cases staged beside a case erector. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("corrugated-case-stack");
p.part("case-0-body", boxPart(0, 0, 0, 730, 520, 115, body));
p.part("case-1-body", boxPart(0, 0, 150, 730, 520, 115, body));
p.part("case-2-body", boxPart(0, 0, 300, 730, 520, 115, body));
p.part("case-3-body", boxPart(0, 0, 450, 730, 520, 115, body));
p.part("case-4-body", boxPart(0, 0, 600, 730, 520, 115, body));
p.part("case-0-flap-front", boxPart(0, -285, 0, 730, 45, 18, accent));
p.part("case-1-flap-front", boxPart(0, -285, 150, 730, 45, 18, accent));
p.part("case-2-flap-front", boxPart(0, -285, 300, 730, 45, 18, accent));
p.part("case-3-flap-front", boxPart(0, -285, 450, 730, 45, 18, accent));
p.part("case-4-flap-front", boxPart(0, -285, 600, 730, 45, 18, accent));
p.part("case-0-flap-back", boxPart(0, 285, 0, 730, 45, 18, accent));
p.part("case-1-flap-back", boxPart(0, 285, 150, 730, 45, 18, accent));
p.part("case-2-flap-back", boxPart(0, 285, 300, 730, 45, 18, accent));
p.part("case-3-flap-back", boxPart(0, 285, 450, 730, 45, 18, accent));
p.part("case-4-flap-back", boxPart(0, 285, 600, 730, 45, 18, accent));
p.part("stack-label", boxPart(250, -265, 610, 185, 25, 95, accent));
p.part("corner-protector-left", boxPart(-345, 0, 0, 25, 25, 760, body));
p.part("corner-protector-right", boxPart(345, 0, 0, 25, 25, 760, body));

return p.model();
