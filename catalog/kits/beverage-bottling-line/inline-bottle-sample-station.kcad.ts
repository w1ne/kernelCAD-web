// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// In-line bottle sample station: small sanitary sample point with bottle shelf, rinse sink, and product line valve.
meta({
  name: "inline-bottle-sample-station",
  license: 'CC0-1.0',
  title: "In-line bottle sample station",
  description: "Small sanitary sample point with bottle shelf, rinse sink, and product line valve. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("inline-bottle-sample-station");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 600, 430, 50)));
p.part("upright", finishPart("upright", boxPart(0, 0, 70, 55, 55, 670)));
p.part("shelf", finishPart("shelf", boxPart(0, -80, 480, 550, 240, 45)));
p.part("sample-bottle-holder", finishPart("sample-bottle-holder", boxPart(0, -80, 525, 130, 130, 80)));
p.part("rinse-cup", finishPart("rinse-cup", boxPart(210, 120, 475, 150, 150, 55)));
p.part("sample-valve", finishPart("sample-valve", cylinderPart(0, 170, 640, 120, 40, 10)));
p.part("sample-spout", finishPart("sample-spout", cylinderPart(0, 100, 565, 100, 22, 8)));
p.part("drain-pan", finishPart("drain-pan", boxPart(0, 150, 410, 380, 180, 30)));
p.part("line-guard", finishPart("line-guard", boxPart(0, 0, 680, 490, 30, 35)));
p.part("nameplate", finishPart("nameplate", boxPart(180, -40, 570, 120, 20, 70)));

return p.model();
