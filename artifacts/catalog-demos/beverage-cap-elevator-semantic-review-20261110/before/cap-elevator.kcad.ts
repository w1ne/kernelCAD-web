// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle-cap elevator: enclosed cleated elevator lifts closures from the hopper to an overhead cap sorter.
meta({
  name: "cap-elevator",
  license: 'CC0-1.0',
  title: "Bottle-cap elevator",
  description: "Enclosed cleated elevator lifts closures from the hopper to an overhead cap sorter. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("cap-elevator");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 420, 560, 45)));
p.part("lower-guard", finishPart("lower-guard", boxPart(0, 0, 65, 300, 450, 400)));
p.part("elevator-shroud", finishPart("elevator-shroud", boxPart(70, 0, 300, 320, 360, 850)));
p.part("top-discharge", finishPart("top-discharge", boxPart(70, 0, 1000, 390, 410, 220)));
p.part("side-rail-a", finishPart("side-rail-a", boxPart(-120, 0, 55, 48, 500, 1100)));
p.part("side-rail-b", finishPart("side-rail-b", boxPart(260, 0, 55, 48, 500, 1100)));
p.part("drive", finishPart("drive", cylinderPart(-190, 0, 30, 155, 98, 10)));
p.part("cleat-0", finishPart("cleat-0", boxPart(70, -145, 100, 245, 42, 38)));
p.part("cleat-1", finishPart("cleat-1", boxPart(70, -73, 255, 245, 42, 38)));
p.part("cleat-2", finishPart("cleat-2", boxPart(70, -1, 410, 245, 42, 38)));
p.part("cleat-3", finishPart("cleat-3", boxPart(70, 71, 565, 245, 42, 38)));
p.part("cleat-4", finishPart("cleat-4", boxPart(70, 143, 720, 245, 42, 38)));
p.part("cleat-5", finishPart("cleat-5", boxPart(70, 215, 875, 245, 42, 38)));

return p.model();
