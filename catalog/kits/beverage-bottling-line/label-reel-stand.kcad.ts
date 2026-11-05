// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Label reel stand: freestanding unwind and rewind reels with a tensioning roller and web guide.
meta({
  name: "label-reel-stand",
  license: 'CC0-1.0',
  title: "Label reel stand",
  description: "Freestanding unwind and rewind reels with a tensioning roller and web guide. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("label-reel-stand");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 20, 500, 420, 50)));
p.part("upright", finishPart("upright", boxPart(0, 0, 70, 60, 60, 850)));
p.part("unwind-reel", finishPart("unwind-reel", cylinderPart(-190, 0, 520, 45, 170, 12)));
p.part("rewind-reel", finishPart("rewind-reel", cylinderPart(190, 0, 520, 45, 125, 12)));
p.part("top-web-roller", finishPart("top-web-roller", xCylinderPart(0, 0, 810, 360, 38, 10)));
p.part("lower-web-roller", finishPart("lower-web-roller", xCylinderPart(0, 0, 300, 300, 32, 10)));
p.part("tension-arm", finishPart("tension-arm", boxPart(0, 0, 425, 380, 35, 35)));
p.part("adjustment-knob", finishPart("adjustment-knob", cylinderPart(0, -60, 430, 50, 45, 10)));
p.part("foot-0", finishPart("foot-0", boxPart(-190, -150, 0, 70, 70, 65)));
p.part("foot-1", finishPart("foot-1", boxPart(190, -150, 0, 70, 70, 65)));
p.part("foot-2", finishPart("foot-2", boxPart(-190, 150, 0, 70, 70, 65)));
p.part("foot-3", finishPart("foot-3", boxPart(190, 150, 0, 70, 70, 65)));

return p.model();
