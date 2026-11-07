// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "case-layer-palletizer",
  license: 'CC0-1.0',
  title: "Case layer palletizer",
  description: "Layer-forming head lifts a complete case pattern and builds a pallet stack under a safety frame. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("case-layer-palletizer");
p.part("floor-rails", boxPart(0, -500, 0, 1600, 70, 55, accent));
p.part("floor-rail-back", boxPart(0, 500, 0, 1600, 70, 55, accent));
p.part("column-left", boxPart(-620, 0, 75, 90, 90, 1900, body));
p.part("column-right", boxPart(620, 0, 75, 90, 90, 1900, body));
p.part("top-bridge", boxPart(0, 0, 1930, 1320, 100, 95, body));
p.part("lift-carriage", boxPart(0, 0, 1280, 380, 420, 500, accent));
p.part("layer-plate", boxPart(0, 0, 1215, 1180, 920, 60, body));
p.part("infeed-bed", boxPart(-870, 0, 300, 520, 900, 60, body));
p.part("pallet-deck", boxPart(870, 0, 60, 780, 1100, 80, accent));
p.part("operator-gate", boxPart(0, -575, 100, 1350, 30, 1150, body));
p.part("control-console", boxPart(780, -590, 420, 180, 95, 650, body));

return p.model();
