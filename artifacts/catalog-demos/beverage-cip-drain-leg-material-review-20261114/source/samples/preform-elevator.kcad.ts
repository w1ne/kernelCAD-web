// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Preform elevator: enclosed cleated elevator that lifts preforms to an overhead unscrambler feed.
meta({
  name: "preform-elevator",
  license: 'CC0-1.0',
  title: "Preform elevator",
  description: "Enclosed cleated elevator that lifts preforms to an overhead unscrambler feed. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("preform-elevator");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-frame", finishPart("base-frame", boxPart(0, 0, 0, 500, 620, 45)));
p.part("lower-guard", finishPart("lower-guard", boxPart(0, 0, 65, 310, 440, 500)));
p.part("inclined-elevator-cover", finishPart("inclined-elevator-cover", boxPart(70, 0, 420, 330, 400, 850)));
p.part("upper-discharge", finishPart("upper-discharge", boxPart(70, 0, 1070, 370, 440, 180)));
p.part("side-rail-a", finishPart("side-rail-a", boxPart(-125, 0, 80, 55, 520, 950)));
p.part("side-rail-b", finishPart("side-rail-b", boxPart(265, 0, 80, 55, 520, 950)));
p.part("drive-motor", finishPart("drive-motor", cylinderPart(-200, 0, 80, 180, 105, 12)));
p.part("upper-pulley", finishPart("upper-pulley", cylinderPart(70, 0, 970, 100, 88, 12)));
p.part("cleat-0", finishPart("cleat-0", boxPart(70, -170, 130, 255, 48, 40)));
p.part("cleat-1", finishPart("cleat-1", boxPart(70, -85, 280, 255, 48, 40)));
p.part("cleat-2", finishPart("cleat-2", boxPart(70, 0, 430, 255, 48, 40)));
p.part("cleat-3", finishPart("cleat-3", boxPart(70, 85, 580, 255, 48, 40)));
p.part("cleat-4", finishPart("cleat-4", boxPart(70, 170, 730, 255, 48, 40)));

return p.model();
