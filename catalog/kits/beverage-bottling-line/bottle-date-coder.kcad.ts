// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle date coder: compact inkjet coding head and touchscreen stand beside a moving-bottle guide.
meta({
  name: "bottle-date-coder",
  license: 'CC0-1.0',
  title: "Bottle date coder",
  description: "Compact inkjet coding head and touchscreen stand beside a moving-bottle guide. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    foodPolymer: '#2c828c',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    foodPolymer: '#286c75',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("bottle-date-coder");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 500, 340, 50)));
p.part("pedestal", finishPart("pedestal", boxPart(0, 0, 70, 75, 75, 540)));
p.part("controller", finishPart("controller", boxPart(0, -60, 610, 260, 120, 220)));
p.part("screen", finishPart("screen", boxPart(0, -130, 690, 190, 25, 100)));
p.part("print-arm", finishPart("print-arm", boxPart(170, 0, 450, 340, 45, 45)));
p.part("print-head", finishPart("print-head", boxPart(330, 0, 410, 120, 100, 180)));
p.part("adjustment-wheel", finishPart("adjustment-wheel", cylinderPart(170, -55, 370, 45, 42, 10)));
p.part("photoeye", finishPart("photoeye", boxPart(360, 0, 220, 90, 85, 70)));
p.part("cable-cover", finishPart("cable-cover", boxPart(-180, 0, 70, 35, 50, 550)));

return p.model();
