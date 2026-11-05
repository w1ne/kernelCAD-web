// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle unscrambler: rotary bowl and discharge starwheel orient empty bottles before the line infeed.
meta({
  name: "bottle-unscrambler",
  license: 'CC0-1.0',
  title: "Bottle unscrambler",
  description: "Rotary bowl and discharge starwheel orient empty bottles before the line infeed. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("bottle-unscrambler");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("support-base", finishPart("support-base", cylinderPart(0, 0, 0, 120, 460, 12)));
p.part("turntable", finishPart("turntable", cylinderPart(0, 0, 120, 95, 420, 16)));
p.part("outer-rim", finishPart("outer-rim", cylinderPart(0, 0, 195, 115, 470, 16)));
p.part("center-column", finishPart("center-column", cylinderPart(0, 0, 200, 650, 85, 10)));
p.part("discharge-lane", finishPart("discharge-lane", boxPart(520, 0, 250, 530, 150, 55)));
p.part("lane-guide-a", finishPart("lane-guide-a", boxPart(520, -88, 265, 530, 18, 95)));
p.part("lane-guide-b", finishPart("lane-guide-b", boxPart(520, 88, 265, 530, 18, 95)));
p.part("drive-motor", finishPart("drive-motor", cylinderPart(-280, 0, 35, 235, 105, 12)));
p.part("bowl-cleat-0", finishPart("bowl-cleat-0", boxPart(-130, 0, 220, 25, 300, 50)));
p.part("bowl-cleat-1", finishPart("bowl-cleat-1", boxPart(-78, 0, 220, 25, 300, 50)));
p.part("bowl-cleat-2", finishPart("bowl-cleat-2", boxPart(-26, 0, 220, 25, 300, 50)));
p.part("bowl-cleat-3", finishPart("bowl-cleat-3", boxPart(26, 0, 220, 25, 300, 50)));
p.part("bowl-cleat-4", finishPart("bowl-cleat-4", boxPart(78, 0, 220, 25, 300, 50)));
p.part("bowl-cleat-5", finishPart("bowl-cleat-5", boxPart(130, 0, 220, 25, 300, 50)));

return p.model();
