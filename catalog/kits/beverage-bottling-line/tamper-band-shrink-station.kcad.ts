// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Tamper-band shrink station: bottle neck band station with a compact heat ring, guide rails, and exhaust hood.
meta({
  name: "tamper-band-shrink-station",
  license: 'CC0-1.0',
  title: "Tamper-band shrink station",
  description: "Bottle neck band station with a compact heat ring, guide rails, and exhaust hood. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("tamper-band-shrink-station");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 820, 720, 50)));
p.part("heat-ring", finishPart("heat-ring", boxPart(0, 0, 520, 250, 230, 280)));
p.part("opening-frame", finishPart("opening-frame", boxPart(0, 0, 730, 480, 320, 45)));
p.part("side-panel-left", finishPart("side-panel-left", boxPart(-310, 0, 65, 75, 520, 650)));
p.part("side-panel-right", finishPart("side-panel-right", boxPart(310, 0, 65, 75, 520, 650)));
p.part("top-hood", finishPart("top-hood", boxPart(0, 0, 780, 700, 610, 80)));
p.part("exhaust-fan", finishPart("exhaust-fan", cylinderPart(0, 230, 860, 170, 92, 10)));
p.part("infeed-guide", finishPart("infeed-guide", boxPart(-420, 0, 250, 300, 210, 45)));
p.part("outfeed-guide", finishPart("outfeed-guide", boxPart(420, 0, 250, 300, 210, 45)));

return p.model();
