// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cap-delivery-chute",
  license: 'CC0-1.0',
  title: "Closure delivery chute",
  description: "Covered gravity chute with inspection lid, clear side slot, and capper handoff nose. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cap-delivery-chute");
p.part("chute-floor", boxPart(0, 0, 160, 760, 250, 50, accent));
p.part("side-left", boxPart(0, -128, 210, 760, 24, 150, body));
p.part("side-right", boxPart(0, 128, 210, 760, 24, 150, body));
p.part("cover", boxPart(0, 0, 365, 760, 245, 35, body));
p.part("inlet-funnel", boxPart(-390, 0, 170, 180, 320, 230, body));
p.part("handoff-nose", boxPart(405, 0, 125, 115, 190, 95, accent));
p.part("mount-tab-0", boxPart(-250, 0, 0, 80, 90, 160, body));
p.part("mount-tab-1", boxPart(0, 0, 0, 80, 90, 160, body));
p.part("mount-tab-2", boxPart(250, 0, 0, 80, 90, 160, body));

return p.model();
