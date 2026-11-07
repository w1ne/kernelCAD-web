// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Wraparound bottle labeler: roll-fed label station with a vacuum drum, applicator plate, bottle wrap belt, and control box.
meta({
  name: "wraparound-labeler",
  license: 'CC0-1.0',
  title: "Wraparound bottle labeler",
  description: "Roll-fed label station with a vacuum drum, applicator plate, bottle wrap belt, and control box. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("wraparound-labeler");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-frame", finishPart("base-frame", boxPart(0, 0, 0, 1100, 700, 55)));
p.part("bottle-deck", finishPart("bottle-deck", boxPart(0, 0, 300, 1100, 250, 50)));
p.part("left-column", finishPart("left-column", boxPart(-440, 0, 75, 75, 75, 850)));
p.part("right-column", finishPart("right-column", boxPart(440, 0, 75, 75, 75, 850)));
p.part("top-beam", finishPart("top-beam", boxPart(0, 0, 925, 1000, 90, 60)));
p.part("label-roll", finishPart("label-roll", cylinderPart(-230, 210, 620, 50, 145, 12)));
p.part("vacuum-drum", finishPart("vacuum-drum", cylinderPart(150, 0, 430, 320, 95, 12)));
p.part("pressure-roller", finishPart("pressure-roller", xCylinderPart(340, 0, 390, 85, 62, 10)));
p.part("control-box", finishPart("control-box", boxPart(520, -200, 520, 230, 170, 390)));
p.part("web-guide", finishPart("web-guide", boxPart(-40, 190, 650, 500, 24, 38)));

return p.model();
