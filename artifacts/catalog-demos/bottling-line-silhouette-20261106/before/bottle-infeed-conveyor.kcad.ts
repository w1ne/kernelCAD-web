// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle infeed conveyor: narrow belt with adjustable guides and a dead-plate transfer into the rinser.
meta({
  name: "bottle-infeed-conveyor",
  license: 'CC0-1.0',
  title: "Bottle infeed conveyor",
  description: "Narrow belt with adjustable guides and a dead-plate transfer into the rinser. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("bottle-infeed-conveyor");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("belt", finishPart("belt", boxPart(0, 0, 700, 1500, 230, 50)));
p.part("side-frame-front", finishPart("side-frame-front", boxPart(0, -145, 660, 1500, 40, 80)));
p.part("side-frame-back", finishPart("side-frame-back", boxPart(0, 145, 660, 1500, 40, 80)));
p.part("guide-front", finishPart("guide-front", boxPart(0, -80, 760, 1500, 18, 52)));
p.part("guide-back", finishPart("guide-back", boxPart(0, 80, 760, 1500, 18, 52)));
p.part("leg-0", finishPart("leg-0", boxPart(-570, 0, 0, 55, 55, 650)));
p.part("leg-1", finishPart("leg-1", boxPart(-190, 0, 0, 55, 55, 650)));
p.part("leg-2", finishPart("leg-2", boxPart(190, 0, 0, 55, 55, 650)));
p.part("leg-3", finishPart("leg-3", boxPart(570, 0, 0, 55, 55, 650)));
p.part("drive-roller-0", finishPart("drive-roller-0", xCylinderPart(-670, 0, 700, 40, 37, 10)));
p.part("drive-roller-1", finishPart("drive-roller-1", xCylinderPart(670, 0, 700, 40, 37, 10)));
p.part("transfer-plate", finishPart("transfer-plate", boxPart(790, 0, 700, 90, 340, 35)));

return p.model();
