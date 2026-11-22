// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Filler valve head: single sanitary fill valve with spring bonnet, bottle centering bell, and product inlet port.
meta({
  name: "filler-valve-head",
  license: 'CC0-1.0',
  title: "Filler valve head",
  description: "Single sanitary fill valve with spring bonnet, bottle centering bell, and product inlet port. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("filler-valve-head");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("valve-body", finishPart("valve-body", cylinderPart(0, 0, 190, 270, 85, 12)));
p.part("bonnet", finishPart("bonnet", cylinderPart(0, 0, 460, 120, 65, 10)));
p.part("stem", finishPart("stem", cylinderPart(0, 0, 90, 110, 26, 8)));
p.part("centering-bell", finishPart("centering-bell", cylinderPart(0, 0, 0, 80, 155, 12)));
p.part("product-port", finishPart("product-port", cylinderPart(0, -95, 330, 145, 36, 10)));
p.part("mounting-tab", finishPart("mounting-tab", boxPart(0, 0, 565, 145, 145, 38)));
p.part("clamp-ear-0", finishPart("clamp-ear-0", boxPart(-92, 0, 420, 30, 45, 70)));
p.part("clamp-ear-1", finishPart("clamp-ear-1", boxPart(92, 0, 420, 30, 45, 70)));

return p.model();
