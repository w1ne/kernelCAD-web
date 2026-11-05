// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Air rinse enclosure: compact enclosure around an ionized-air bottle rinse with access doors and extraction hood.
meta({
  name: "air-rinse-enclosure",
  license: 'CC0-1.0',
  title: "Air rinse enclosure",
  description: "Compact enclosure around an ionized-air bottle rinse with access doors and extraction hood. Knobs: overall scale and color controls for stainless steel, powder-coated steel, food-grade polymer, and corrugated board.",
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
const corrugatedBoard = param('corrugatedBoard', '#b18a5d', { label: 'Corrugated board' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    foodPolymer: '#2c828c',
    corrugatedBoard: '#c49b6b',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    foodPolymer: '#286c75',
    corrugatedBoard: '#886342',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("air-rinse-enclosure");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/carton|paper|sheet|stack|pallet|cardboard|corrugated|case[-_ ]?(?:blank|wall|stack|pack|lift)/i.test(component)) return shape.color(corrugatedBoard);
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-tray", finishPart("base-tray", boxPart(0, 0, 0, 1250, 780, 60)));
p.part("left-panel", finishPart("left-panel", boxPart(-540, 0, 60, 90, 720, 760)));
p.part("right-panel", finishPart("right-panel", boxPart(540, 0, 60, 90, 720, 760)));
p.part("rear-panel", finishPart("rear-panel", boxPart(0, 330, 60, 1020, 80, 760)));
p.part("roof", finishPart("roof", boxPart(0, 0, 820, 1180, 780, 70)));
p.part("front-door-left", finishPart("front-door-left", boxPart(-280, -350, 80, 450, 35, 680)));
p.part("front-door-right", finishPart("front-door-right", boxPart(280, -350, 80, 450, 35, 680)));
p.part("air-jet-0", finishPart("air-jet-0", cylinderPart(-390, 0, 500, 180, 28, 8)));
p.part("air-jet-1", finishPart("air-jet-1", cylinderPart(-260, 0, 500, 180, 28, 8)));
p.part("air-jet-2", finishPart("air-jet-2", cylinderPart(-130, 0, 500, 180, 28, 8)));
p.part("air-jet-3", finishPart("air-jet-3", cylinderPart(0, 0, 500, 180, 28, 8)));
p.part("air-jet-4", finishPart("air-jet-4", cylinderPart(130, 0, 500, 180, 28, 8)));
p.part("air-jet-5", finishPart("air-jet-5", cylinderPart(260, 0, 500, 180, 28, 8)));
p.part("air-jet-6", finishPart("air-jet-6", cylinderPart(390, 0, 500, 180, 28, 8)));
p.part("exhaust-stack", finishPart("exhaust-stack", cylinderPart(0, 260, 870, 210, 110, 10)));

return p.model();
