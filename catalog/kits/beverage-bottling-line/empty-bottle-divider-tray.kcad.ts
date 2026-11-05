// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Empty bottle divider tray: washable compartment tray spaces glass bottles for returnable-container handling.
meta({
  name: "empty-bottle-divider-tray",
  license: 'CC0-1.0',
  title: "Empty bottle divider tray",
  description: "Washable compartment tray spaces glass bottles for returnable-container handling. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'item',
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

const p = assembly("empty-bottle-divider-tray");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("tray-floor", finishPart("tray-floor", boxPart(0, 0, 20, 760, 560, 40)));
p.part("rim-front", finishPart("rim-front", boxPart(0, -270, 60, 760, 35, 80)));
p.part("rim-back", finishPart("rim-back", boxPart(0, 270, 60, 760, 35, 80)));
p.part("rim-left", finishPart("rim-left", boxPart(-365, 0, 60, 35, 505, 80)));
p.part("rim-right", finishPart("rim-right", boxPart(365, 0, 60, 35, 505, 80)));
p.part("divider-x-0", finishPart("divider-x-0", boxPart(-240, 0, 60, 20, 500, 55)));
p.part("divider-x-1", finishPart("divider-x-1", boxPart(-80, 0, 60, 20, 500, 55)));
p.part("divider-x-2", finishPart("divider-x-2", boxPart(80, 0, 60, 20, 500, 55)));
p.part("divider-x-3", finishPart("divider-x-3", boxPart(240, 0, 60, 20, 500, 55)));
p.part("divider-y-0", finishPart("divider-y-0", boxPart(0, -180, 60, 730, 18, 55)));
p.part("divider-y-1", finishPart("divider-y-1", boxPart(0, -60, 60, 730, 18, 55)));
p.part("divider-y-2", finishPart("divider-y-2", boxPart(0, 60, 60, 730, 18, 55)));
p.part("foot-0", finishPart("foot-0", boxPart(-300, -200, 0, 70, 70, 25)));
p.part("foot-1", finishPart("foot-1", boxPart(300, -200, 0, 70, 70, 25)));
p.part("foot-2", finishPart("foot-2", boxPart(-300, 200, 0, 70, 70, 25)));
p.part("foot-3", finishPart("foot-3", boxPart(300, 200, 0, 70, 70, 25)));

return p.model();
