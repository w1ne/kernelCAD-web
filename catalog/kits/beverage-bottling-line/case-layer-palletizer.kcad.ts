// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Case layer palletizer: layer-forming head lifts a complete case pattern and builds a pallet stack under a safety frame.
meta({
  name: "case-layer-palletizer",
  license: 'CC0-1.0',
  title: "Case layer palletizer",
  description: "Layer-forming head lifts a complete case pattern and builds a pallet stack under a safety frame. Knobs: overall scale and color controls for stainless steel, powder-coated steel, safety paint, and pallet timber.",
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
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety paint' });
const palletTimber = param('palletTimber', '#95683f', { label: 'Pallet timber' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    safetyPaint: '#f0b336',
    palletTimber: '#a9794c',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    safetyPaint: '#bd7b24',
    palletTimber: '#704d31',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("case-layer-palletizer");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/pallet/i.test(component)) return shape.color(palletTimber);
  if (/operator|stop|emergency|beacon|signal|status|warning|access/i.test(component)) return shape.color(safetyPaint);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("floor-rails", finishPart("floor-rails", boxPart(0, -500, 0, 1600, 70, 55)));
p.part("floor-rail-back", finishPart("floor-rail-back", boxPart(0, 500, 0, 1600, 70, 55)));
p.part("column-left", finishPart("column-left", boxPart(-620, 0, 75, 90, 90, 1900)));
p.part("column-right", finishPart("column-right", boxPart(620, 0, 75, 90, 90, 1900)));
p.part("top-bridge", finishPart("top-bridge", boxPart(0, 0, 1930, 1320, 100, 95)));
p.part("lift-carriage", finishPart("lift-carriage", boxPart(0, 0, 1280, 380, 420, 500)));
p.part("layer-plate", finishPart("layer-plate", boxPart(0, 0, 1215, 1180, 920, 60)));
p.part("infeed-bed", finishPart("infeed-bed", boxPart(-870, 0, 300, 520, 900, 60)));
p.part("pallet-deck", finishPart("pallet-deck", boxPart(870, 0, 60, 780, 1100, 80)));
p.part("operator-gate", finishPart("operator-gate", boxPart(0, -575, 100, 1350, 30, 1150)));
p.part("control-console", finishPart("control-console", boxPart(780, -590, 420, 180, 95, 650)));

return p.model();
