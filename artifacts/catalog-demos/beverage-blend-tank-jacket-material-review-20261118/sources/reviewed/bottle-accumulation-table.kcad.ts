// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle accumulation table: low-speed round accumulation table with entry rail, exit lane, and central drive.
meta({
  name: "bottle-accumulation-table",
  license: 'CC0-1.0',
  title: "Bottle accumulation table",
  description: "Low-speed round accumulation table with entry rail, exit lane, and central drive. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("bottle-accumulation-table");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("table-top", finishPart("table-top", cylinderPart(0, 0, 260, 90, 610, 16)));
p.part("central-drive", finishPart("central-drive", cylinderPart(0, 0, 75, 185, 180, 12)));
p.part("turntable-rim", finishPart("turntable-rim", cylinderPart(0, 0, 330, 45, 625, 16)));
p.part("infeed-lane", finishPart("infeed-lane", boxPart(-690, 0, 280, 390, 160, 40)));
p.part("outfeed-lane", finishPart("outfeed-lane", boxPart(690, 0, 280, 390, 160, 40)));
p.part("leg-0", finishPart("leg-0", boxPart(360.0, 0.0, 0, 58, 58, 260)));
p.part("leg-1", finishPart("leg-1", boxPart(0.0004776461628039118, 359.99999999968315, 0, 58, 58, 260)));
p.part("leg-2", finishPart("leg-2", boxPart(-359.9999999987325, 0.0009552923256069827, 0, 58, 58, 260)));
p.part("leg-3", finishPart("leg-3", boxPart(-0.0014329384885682444, -359.99999999714817, 0, 58, 58, 260)));
p.part("outer-guide-0", finishPart("outer-guide-0", boxPart(-400, 610, 350, 150, 30, 45)));
p.part("outer-guide-1", finishPart("outer-guide-1", boxPart(-240, 610, 350, 150, 30, 45)));
p.part("outer-guide-2", finishPart("outer-guide-2", boxPart(-80, 610, 350, 150, 30, 45)));
p.part("outer-guide-3", finishPart("outer-guide-3", boxPart(80, 610, 350, 150, 30, 45)));
p.part("outer-guide-4", finishPart("outer-guide-4", boxPart(240, 610, 350, 150, 30, 45)));
p.part("outer-guide-5", finishPart("outer-guide-5", boxPart(400, 610, 350, 150, 30, 45)));

return p.model();
