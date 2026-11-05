// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Closure delivery chute: covered gravity chute with inspection lid, clear side slot, and capper handoff nose.
meta({
  name: "cap-delivery-chute",
  license: 'CC0-1.0',
  title: "Closure delivery chute",
  description: "Covered gravity chute with inspection lid, clear side slot, and capper handoff nose. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'prop',
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

const p = assembly("cap-delivery-chute");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("chute-floor", finishPart("chute-floor", boxPart(0, 0, 160, 760, 250, 50)));
p.part("side-left", finishPart("side-left", boxPart(0, -128, 210, 760, 24, 150)));
p.part("side-right", finishPart("side-right", boxPart(0, 128, 210, 760, 24, 150)));
p.part("cover", finishPart("cover", boxPart(0, 0, 365, 760, 245, 35)));
p.part("inlet-funnel", finishPart("inlet-funnel", boxPart(-390, 0, 170, 180, 320, 230)));
p.part("handoff-nose", finishPart("handoff-nose", boxPart(405, 0, 125, 115, 190, 95)));
p.part("mount-tab-0", finishPart("mount-tab-0", boxPart(-250, 0, 0, 80, 90, 160)));
p.part("mount-tab-1", finishPart("mount-tab-1", boxPart(0, 0, 0, 80, 90, 160)));
p.part("mount-tab-2", finishPart("mount-tab-2", boxPart(250, 0, 0, 80, 90, 160)));

return p.model();
