// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Shrink-sleeve applicator: sleeve web former and cutting head positioned over a centered bottle conveyor.
meta({
  name: "sleeve-label-applicator",
  license: 'CC0-1.0',
  title: "Shrink-sleeve applicator",
  description: "Sleeve web former and cutting head positioned over a centered bottle conveyor. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("sleeve-label-applicator");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1050, 650, 50)));
p.part("conveyor", finishPart("conveyor", boxPart(0, 0, 250, 1050, 200, 50)));
p.part("portal-left", finishPart("portal-left", boxPart(-360, 0, 70, 65, 65, 850)));
p.part("portal-right", finishPart("portal-right", boxPart(360, 0, 70, 65, 65, 850)));
p.part("portal-top", finishPart("portal-top", boxPart(0, 0, 920, 800, 70, 55)));
p.part("film-roll", finishPart("film-roll", cylinderPart(-180, 220, 660, 50, 125, 12)));
p.part("forming-shoulder", finishPart("forming-shoulder", boxPart(70, 0, 460, 220, 250, 110)));
p.part("cutting-collar", finishPart("cutting-collar", cylinderPart(0, 0, 790, 80, 150, 12)));
p.part("control-pod", finishPart("control-pod", boxPart(500, -200, 500, 190, 160, 300)));
p.part("feed-roller-0", finishPart("feed-roller-0", xCylinderPart(0, -170, 520, 140, 45, 10)));
p.part("feed-roller-1", finishPart("feed-roller-1", xCylinderPart(0, -60, 610, 140, 45, 10)));
p.part("feed-roller-2", finishPart("feed-roller-2", xCylinderPart(0, 50, 700, 140, 45, 10)));
p.part("feed-roller-3", finishPart("feed-roller-3", xCylinderPart(0, 160, 790, 140, 45, 10)));

return p.model();
