// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Corrugated case stack: neat stack of knocked-down corrugated cases staged beside a case erector.
meta({
  name: "corrugated-case-stack",
  license: 'CC0-1.0',
  title: "Corrugated case stack",
  description: "Neat stack of knocked-down corrugated cases staged beside a case erector. Knobs: overall scale and color controls for stainless steel and corrugated board.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'item',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const corrugatedBoard = param('corrugatedBoard', '#b18a5d', { label: 'Corrugated board' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    corrugatedBoard: '#c49b6b',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    corrugatedBoard: '#886342',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("corrugated-case-stack");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/carton|paper|sheet|stack|pallet|cardboard|corrugated|case[-_ ]?(?:blank|wall|stack|pack|lift)/i.test(component)) return shape.color(corrugatedBoard);
  return shape.color(stainlessSteel);
};
p.part("case-0-body", finishPart("case-0-body", boxPart(0, 0, 0, 730, 520, 115)));
p.part("case-1-body", finishPart("case-1-body", boxPart(0, 0, 150, 730, 520, 115)));
p.part("case-2-body", finishPart("case-2-body", boxPart(0, 0, 300, 730, 520, 115)));
p.part("case-3-body", finishPart("case-3-body", boxPart(0, 0, 450, 730, 520, 115)));
p.part("case-4-body", finishPart("case-4-body", boxPart(0, 0, 600, 730, 520, 115)));
p.part("case-0-flap-front", finishPart("case-0-flap-front", boxPart(0, -285, 0, 730, 45, 18)));
p.part("case-1-flap-front", finishPart("case-1-flap-front", boxPart(0, -285, 150, 730, 45, 18)));
p.part("case-2-flap-front", finishPart("case-2-flap-front", boxPart(0, -285, 300, 730, 45, 18)));
p.part("case-3-flap-front", finishPart("case-3-flap-front", boxPart(0, -285, 450, 730, 45, 18)));
p.part("case-4-flap-front", finishPart("case-4-flap-front", boxPart(0, -285, 600, 730, 45, 18)));
p.part("case-0-flap-back", finishPart("case-0-flap-back", boxPart(0, 285, 0, 730, 45, 18)));
p.part("case-1-flap-back", finishPart("case-1-flap-back", boxPart(0, 285, 150, 730, 45, 18)));
p.part("case-2-flap-back", finishPart("case-2-flap-back", boxPart(0, 285, 300, 730, 45, 18)));
p.part("case-3-flap-back", finishPart("case-3-flap-back", boxPart(0, 285, 450, 730, 45, 18)));
p.part("case-4-flap-back", finishPart("case-4-flap-back", boxPart(0, 285, 600, 730, 45, 18)));
p.part("stack-label", finishPart("stack-label", boxPart(250, -265, 610, 185, 25, 95)));
p.part("corner-protector-left", finishPart("corner-protector-left", boxPart(-345, 0, 0, 25, 25, 760)));
p.part("corner-protector-right", finishPart("corner-protector-right", boxPart(345, 0, 0, 25, 25, 760)));

return p.model();
