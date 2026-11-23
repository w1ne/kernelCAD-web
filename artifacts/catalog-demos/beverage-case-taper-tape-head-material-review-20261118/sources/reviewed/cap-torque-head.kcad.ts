// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Cap torque head: compact capping chuck with drive housing, adjustable spindle, and closure grip ring.
meta({
  name: "cap-torque-head",
  license: 'CC0-1.0',
  title: "Cap torque head",
  description: "Compact capping chuck with drive housing, adjustable spindle, and closure grip ring. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("cap-torque-head");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("spindle", finishPart("spindle", cylinderPart(0, 0, 0, 310, 34, 10)));
p.part("chuck", finishPart("chuck", cylinderPart(0, 0, 310, 100, 90, 12)));
p.part("grip-ring", finishPart("grip-ring", cylinderPart(0, 0, 300, 35, 106, 12)));
p.part("drive-body", finishPart("drive-body", boxPart(0, 0, 480, 220, 220, 230)));
p.part("mount-plate", finishPart("mount-plate", boxPart(0, 0, 710, 330, 310, 50)));
p.part("air-port", finishPart("air-port", boxPart(160, 0, 545, 95, 75, 65)));
p.part("bolt-tab-0", finishPart("bolt-tab-0", boxPart(-145, -135, 710, 50, 50, 75)));
p.part("bolt-tab-1", finishPart("bolt-tab-1", boxPart(145, -135, 710, 50, 50, 75)));
p.part("bolt-tab-2", finishPart("bolt-tab-2", boxPart(-145, 135, 710, 50, 50, 75)));
p.part("bolt-tab-3", finishPart("bolt-tab-3", boxPart(145, 135, 710, 50, 50, 75)));

return p.model();
