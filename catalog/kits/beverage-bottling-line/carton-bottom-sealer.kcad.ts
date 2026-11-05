// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Carton bottom sealer: drive-belt case sealer closes erected carton flaps before bottle loading.
meta({
  name: "carton-bottom-sealer",
  license: 'CC0-1.0',
  title: "Carton bottom sealer",
  description: "Drive-belt case sealer closes erected carton flaps before bottle loading. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("carton-bottom-sealer");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-frame", finishPart("base-frame", boxPart(0, 0, 0, 1300, 750, 50)));
p.part("infeed-bed", finishPart("infeed-bed", boxPart(-360, 0, 320, 520, 520, 55)));
p.part("outfeed-bed", finishPart("outfeed-bed", boxPart(360, 0, 320, 520, 520, 55)));
p.part("top-crossbeam", finishPart("top-crossbeam", boxPart(0, 0, 930, 740, 100, 65)));
p.part("tower-left", finishPart("tower-left", boxPart(-300, 0, 80, 70, 70, 800)));
p.part("tower-right", finishPart("tower-right", boxPart(300, 0, 80, 70, 70, 800)));
p.part("tape-head", finishPart("tape-head", boxPart(0, 0, 740, 240, 320, 170)));
p.part("tape-roll", finishPart("tape-roll", cylinderPart(0, -190, 680, 65, 110, 12)));
p.part("guide-0", finishPart("guide-0", boxPart(-480, 0, 390, 40, 590, 60)));
p.part("guide-1", finishPart("guide-1", boxPart(-160, 0, 390, 40, 590, 60)));
p.part("guide-2", finishPart("guide-2", boxPart(160, 0, 390, 40, 590, 60)));
p.part("guide-3", finishPart("guide-3", boxPart(480, 0, 390, 40, 590, 60)));

return p.model();
