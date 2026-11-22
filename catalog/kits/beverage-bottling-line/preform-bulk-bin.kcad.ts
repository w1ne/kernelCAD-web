// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// PET preform bulk bin: ventilated bulk hopper for empty PET preforms with a steep throat and inspection lid.
meta({
  name: "preform-bulk-bin",
  license: 'CC0-1.0',
  title: "PET preform bulk bin",
  description: "Ventilated bulk hopper for empty PET preforms with a steep throat and inspection lid. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("preform-bulk-bin");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("foot-left", finishPart("foot-left", boxPart(-300, -250, 0, 90, 90, 100)));
p.part("foot-right", finishPart("foot-right", boxPart(300, -250, 0, 90, 90, 100)));
p.part("foot-back-left", finishPart("foot-back-left", boxPart(-300, 250, 0, 90, 90, 100)));
p.part("foot-back-right", finishPart("foot-back-right", boxPart(300, 250, 0, 90, 90, 100)));
p.part("hopper-body", finishPart("hopper-body", boxPart(0, 0, 100, 720, 620, 500)));
p.part("sloped-throat", finishPart("sloped-throat", boxPart(0, 0, 0, 390, 330, 100)));
p.part("inspection-lid", finishPart("inspection-lid", boxPart(0, 0, 610, 760, 660, 55)));
p.part("outlet-collar", finishPart("outlet-collar", boxPart(0, 0, 0, 170, 150, 150)));

return p.model();
