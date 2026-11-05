// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Fill-level inspection lamp: backlit inspection panel and bottle guide rails for a manual fill-level check.
meta({
  name: "fill-level-inspection-lamp",
  license: 'CC0-1.0',
  title: "Fill-level inspection lamp",
  description: "Backlit inspection panel and bottle guide rails for a manual fill-level check. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("fill-level-inspection-lamp");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 550, 340, 45)));
p.part("light-panel", finishPart("light-panel", boxPart(0, 0, 630, 500, 110, 820)));
p.part("diffuser-face", finishPart("diffuser-face", boxPart(0, -62, 635, 430, 20, 750)));
p.part("top-hood", finishPart("top-hood", boxPart(0, 0, 1060, 590, 330, 70)));
p.part("side-support-left", finishPart("side-support-left", boxPart(-235, 0, 65, 45, 65, 500)));
p.part("side-support-right", finishPart("side-support-right", boxPart(235, 0, 65, 65, 65, 500)));
p.part("bottle-guide-front", finishPart("bottle-guide-front", boxPart(0, -160, 175, 600, 28, 45)));
p.part("bottle-guide-back", finishPart("bottle-guide-back", boxPart(0, 160, 175, 600, 28, 45)));
p.part("inspection-knob", finishPart("inspection-knob", cylinderPart(240, -145, 450, 35, 24, 8)));

return p.model();
