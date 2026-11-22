// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Corrugated case erector: magazine-fed case erector with squaring frame, suction pick head, and bottom-flap folding rails.
meta({
  name: "case-erector",
  license: 'CC0-1.0',
  title: "Corrugated case erector",
  description: "Magazine-fed case erector with squaring frame, suction pick head, and bottom-flap folding rails. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("case-erector");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1180, 760, 50)));
p.part("case-magazine", finishPart("case-magazine", boxPart(-420, 0, 420, 300, 520, 780)));
p.part("pick-head", finishPart("pick-head", boxPart(-80, 0, 760, 300, 300, 120)));
p.part("squaring-frame-front", finishPart("squaring-frame-front", boxPart(220, -290, 100, 80, 80, 700)));
p.part("squaring-frame-back", finishPart("squaring-frame-back", boxPart(220, 290, 100, 80, 80, 700)));
p.part("top-beam", finishPart("top-beam", boxPart(220, 0, 800, 620, 80, 60)));
p.part("case-platform", finishPart("case-platform", boxPart(260, 0, 220, 450, 470, 55)));
p.part("folding-rail-0", finishPart("folding-rail-0", boxPart(260, -180, 310, 480, 28, 65)));
p.part("folding-rail-1", finishPart("folding-rail-1", boxPart(260, -60, 310, 480, 28, 65)));
p.part("folding-rail-2", finishPart("folding-rail-2", boxPart(260, 60, 310, 480, 28, 65)));
p.part("folding-rail-3", finishPart("folding-rail-3", boxPart(260, 180, 310, 480, 28, 65)));
p.part("control-post", finishPart("control-post", boxPart(540, -260, 80, 60, 60, 680)));
p.part("hmi", finishPart("hmi", boxPart(540, -285, 590, 180, 45, 125)));

return p.model();
