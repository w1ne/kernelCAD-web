// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Case taper: adjustable side-belt carton taper with upper tape head and centering rails.
meta({
  name: "case-taper",
  license: 'CC0-1.0',
  title: "Case taper",
  description: "Adjustable side-belt carton taper with upper tape head and centering rails. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("case-taper");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1180, 760, 50)));
p.part("infeed-belt", finishPart("infeed-belt", boxPart(-260, 0, 310, 520, 560, 55)));
p.part("outfeed-belt", finishPart("outfeed-belt", boxPart(320, 0, 310, 520, 560, 55)));
p.part("upright-front", finishPart("upright-front", boxPart(0, -280, 80, 70, 70, 820)));
p.part("upright-back", finishPart("upright-back", boxPart(0, 280, 80, 70, 70, 820)));
p.part("bridge", finishPart("bridge", boxPart(0, 0, 900, 140, 700, 70)));
p.part("tape-head", finishPart("tape-head", boxPart(0, 0, 660, 250, 360, 210)));
p.part("tape-roll", finishPart("tape-roll", cylinderPart(0, -220, 650, 75, 110, 12)));
p.part("adjuster-front", finishPart("adjuster-front", boxPart(230, -230, 460, 360, 40, 45)));
p.part("adjuster-back", finishPart("adjuster-back", boxPart(230, 230, 460, 360, 40, 45)));
p.part("hmi-post", finishPart("hmi-post", boxPart(500, -330, 70, 55, 55, 600)));
p.part("hmi", finishPart("hmi", boxPart(500, -350, 580, 170, 35, 120)));

return p.model();
