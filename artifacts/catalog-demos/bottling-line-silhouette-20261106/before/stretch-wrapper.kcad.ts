// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Pallet stretch wrapper: turntable wrapper with film carriage, mast rollers, and adjustable load-height sensor.
meta({
  name: "stretch-wrapper",
  license: 'CC0-1.0',
  title: "Pallet stretch wrapper",
  description: "Turntable wrapper with film carriage, mast rollers, and adjustable load-height sensor. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("stretch-wrapper");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("turntable", finishPart("turntable", cylinderPart(0, 0, 0, 95, 650, 16)));
p.part("turntable-hub", finishPart("turntable-hub", cylinderPart(0, 0, 95, 85, 170, 12)));
p.part("mast-base", finishPart("mast-base", boxPart(650, 0, 20, 240, 250, 50)));
p.part("mast", finishPart("mast", boxPart(650, 0, 70, 85, 85, 1730)));
p.part("film-carriage", finishPart("film-carriage", boxPart(560, 0, 600, 250, 250, 420)));
p.part("film-roll", finishPart("film-roll", cylinderPart(470, -155, 710, 80, 140, 12)));
p.part("film-roller-0", finishPart("film-roller-0", xCylinderPart(600, -100, 680, 120, 35, 10)));
p.part("film-roller-1", finishPart("film-roller-1", xCylinderPart(600, -100, 790, 120, 35, 10)));
p.part("film-roller-2", finishPart("film-roller-2", xCylinderPart(600, -100, 900, 120, 35, 10)));
p.part("control-box", finishPart("control-box", boxPart(760, -190, 450, 180, 150, 340)));
p.part("photoeye", finishPart("photoeye", cylinderPart(600, 100, 1570, 70, 38, 8)));

return p.model();
