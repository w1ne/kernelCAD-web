// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "case-erector",
  license: 'CC0-1.0',
  title: "Corrugated case erector",
  description: "Magazine-fed case erector with squaring frame, suction pick head, and bottom-flap folding rails. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("case-erector");
p.part("base", boxPart(0, 0, 0, 1180, 760, 50, accent));
p.part("case-magazine", boxPart(-420, 0, 420, 300, 520, 780, body));
p.part("pick-head", boxPart(-80, 0, 760, 300, 300, 120, body));
p.part("squaring-frame-front", boxPart(220, -290, 100, 80, 80, 700, body));
p.part("squaring-frame-back", boxPart(220, 290, 100, 80, 80, 700, body));
p.part("top-beam", boxPart(220, 0, 800, 620, 80, 60, accent));
p.part("case-platform", boxPart(260, 0, 220, 450, 470, 55, body));
p.part("folding-rail-0", boxPart(260, -180, 310, 480, 28, 65, accent));
p.part("folding-rail-1", boxPart(260, -60, 310, 480, 28, 65, accent));
p.part("folding-rail-2", boxPart(260, 60, 310, 480, 28, 65, accent));
p.part("folding-rail-3", boxPart(260, 180, 310, 480, 28, 65, accent));
p.part("control-post", boxPart(540, -260, 80, 60, 60, 680, body));
p.part("hmi", boxPart(540, -285, 590, 180, 45, 125, accent));

return p.model();
