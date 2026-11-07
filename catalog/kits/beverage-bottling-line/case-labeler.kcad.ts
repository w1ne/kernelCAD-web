// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Case label applicator: print-and-apply head places a shipping label on the face of a moving carton.
meta({
  name: "case-labeler",
  license: 'CC0-1.0',
  title: "Case label applicator",
  description: "Print-and-apply head places a shipping label on the face of a moving carton. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("case-labeler");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("floor-base", finishPart("floor-base", boxPart(0, 0, 0, 600, 470, 55)));
p.part("mast", finishPart("mast", boxPart(0, 0, 75, 75, 75, 920)));
p.part("printer-body", finishPart("printer-body", boxPart(160, 0, 600, 320, 220, 290)));
p.part("display", finishPart("display", boxPart(190, -120, 760, 190, 25, 105)));
p.part("label-roll", finishPart("label-roll", cylinderPart(100, 155, 800, 55, 120, 12)));
p.part("peel-roller", finishPart("peel-roller", xCylinderPart(330, 0, 520, 120, 38, 10)));
p.part("apply-pad", finishPart("apply-pad", boxPart(390, 0, 410, 150, 260, 90)));
p.part("air-regulator", finishPart("air-regulator", boxPart(-150, -100, 250, 120, 90, 120)));
p.part("mounting-arm", finishPart("mounting-arm", boxPart(210, 0, 500, 300, 45, 45)));

return p.model();
