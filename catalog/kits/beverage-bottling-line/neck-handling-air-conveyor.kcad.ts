// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle neck-handling air conveyor: raised guide track and four support columns carry bottles by their neck rings over a clear floor path.
meta({
  name: "neck-handling-air-conveyor",
  license: 'CC0-1.0',
  title: "Bottle neck-handling air conveyor",
  description: "Raised guide track and four support columns carry bottles by their neck rings over a clear floor path. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("neck-handling-air-conveyor");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("top-spine", finishPart("top-spine", boxPart(0, 0, 1230, 1700, 120, 70)));
p.part("support-column-0", finishPart("support-column-0", boxPart(-650, 0, 0, 55, 55, 1230)));
p.part("support-column-1", finishPart("support-column-1", boxPart(-220, 0, 0, 55, 55, 1230)));
p.part("support-column-2", finishPart("support-column-2", boxPart(210, 0, 0, 55, 55, 1230)));
p.part("support-column-3", finishPart("support-column-3", boxPart(640, 0, 0, 55, 55, 1230)));
p.part("neck-guide-front", finishPart("neck-guide-front", boxPart(0, -130, 1040, 1650, 25, 70)));
p.part("neck-guide-back", finishPart("neck-guide-back", boxPart(0, 130, 1040, 1650, 25, 70)));
p.part("air-rail", finishPart("air-rail", boxPart(0, 0, 990, 1650, 90, 28)));
p.part("guide-spacer-0", finishPart("guide-spacer-0", cylinderPart(-600, 0, 1010, 45, 26, 8)));
p.part("guide-spacer-1", finishPart("guide-spacer-1", cylinderPart(-360, 0, 1010, 45, 26, 8)));
p.part("guide-spacer-2", finishPart("guide-spacer-2", cylinderPart(-120, 0, 1010, 45, 26, 8)));
p.part("guide-spacer-3", finishPart("guide-spacer-3", cylinderPart(120, 0, 1010, 45, 26, 8)));
p.part("guide-spacer-4", finishPart("guide-spacer-4", cylinderPart(360, 0, 1010, 45, 26, 8)));
p.part("guide-spacer-5", finishPart("guide-spacer-5", cylinderPart(600, 0, 1010, 45, 26, 8)));

return p.model();
