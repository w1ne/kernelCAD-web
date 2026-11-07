// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Pressure-sensitive labeler: front-and-back label applicators with tamp pads, web rolls, bottle guides, and HMI stand.
meta({
  name: "pressure-sensitive-labeler",
  license: 'CC0-1.0',
  title: "Pressure-sensitive labeler",
  description: "Front-and-back label applicators with tamp pads, web rolls, bottle guides, and HMI stand. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("pressure-sensitive-labeler");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1160, 680, 55)));
p.part("conveyor", finishPart("conveyor", boxPart(0, 0, 280, 1160, 190, 48)));
p.part("mast-front", finishPart("mast-front", boxPart(0, -260, 75, 70, 70, 900)));
p.part("mast-back", finishPart("mast-back", boxPart(0, 260, 75, 70, 70, 900)));
p.part("front-roll", finishPart("front-roll", cylinderPart(-220, -260, 610, 50, 135, 12)));
p.part("back-roll", finishPart("back-roll", cylinderPart(-220, 260, 610, 50, 135, 12)));
p.part("front-tamp-pad", finishPart("front-tamp-pad", boxPart(150, -210, 470, 250, 120, 150)));
p.part("back-tamp-pad", finishPart("back-tamp-pad", boxPart(150, 210, 470, 250, 120, 150)));
p.part("hmi-post", finishPart("hmi-post", boxPart(470, -330, 70, 60, 60, 690)));
p.part("hmi-screen", finishPart("hmi-screen", boxPart(470, -345, 690, 180, 40, 135)));
p.part("guide-0", finishPart("guide-0", boxPart(-400, 0, 330, 35, 240, 45)));
p.part("guide-1", finishPart("guide-1", boxPart(-140, 0, 330, 35, 240, 45)));
p.part("guide-2", finishPart("guide-2", boxPart(120, 0, 330, 35, 240, 45)));
p.part("guide-3", finishPart("guide-3", boxPart(380, 0, 330, 35, 240, 45)));

return p.model();
