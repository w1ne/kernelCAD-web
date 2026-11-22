// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Rotary bottle filler: filling carousel with a covered product bowl, dosing valves, guard skirt, and discharge deck.
meta({
  name: "rotary-filler",
  license: 'CC0-1.0',
  title: "Rotary bottle filler",
  description: "Filling carousel with a covered product bowl, dosing valves, guard skirt, and discharge deck. Knobs: overall scale and color controls for stainless steel, powder-coated steel, food-grade polymer, and safety paint.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer' });
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety paint' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    foodPolymer: '#2c828c',
    safetyPaint: '#f0b336',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    foodPolymer: '#286c75',
    safetyPaint: '#bd7b24',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("rotary-filler");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/operator|stop|emergency|beacon|signal|status|warning|access/i.test(component)) return shape.color(safetyPaint);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-skirt", finishPart("base-skirt", cylinderPart(0, 0, 0, 180, 530, 16)));
p.part("filler-table", finishPart("filler-table", cylinderPart(0, 0, 180, 140, 430, 16)));
p.part("product-bowl", finishPart("product-bowl", cylinderPart(0, 0, 320, 210, 300, 14)));
p.part("top-cover", finishPart("top-cover", cylinderPart(0, 0, 530, 75, 340, 14)));
p.part("center-drive", finishPart("center-drive", cylinderPart(0, 0, 605, 410, 95, 12)));
p.part("infeed-deck", finishPart("infeed-deck", boxPart(-550, 0, 250, 380, 220, 55)));
p.part("outfeed-deck", finishPart("outfeed-deck", boxPart(550, 0, 250, 380, 220, 55)));
p.part("operator-rail", finishPart("operator-rail", boxPart(0, -580, 250, 1040, 42, 45)));
p.part("fill-valve-0", finishPart("fill-valve-0", cylinderPart(360.0, 0.0, 450, 230, 27, 8)));
p.part("fill-valve-1", finishPart("fill-valve-1", cylinderPart(311.76922497006126, 179.99986211541204, 450, 230, 27, 8)));
p.part("fill-valve-2", finishPart("fill-valve-2", cylinderPart(180.0002757690703, 311.7689861468883, 450, 230, 27, 8)));
p.part("fill-valve-3", finishPart("fill-valve-3", cylinderPart(0.0004776461628838479, 359.99999999968315, 450, 230, 27, 8)));
p.part("fill-valve-4", finishPart("fill-valve-4", cylinderPart(-179.99944846143694, 311.76946379268526, 450, 230, 27, 8)));
p.part("fill-valve-5", finishPart("fill-valve-5", cylinderPart(-311.7687473231667, 180.0006894224115, 450, 230, 27, 8)));
p.part("fill-valve-6", finishPart("fill-valve-6", cylinderPart(-359.9999999987325, 0.0009552923257668548, 450, 230, 27, 8)));
p.part("fill-valve-7", finishPart("fill-valve-7", cylinderPart(-311.7697026147605, -179.99903480714502, 450, 230, 27, 8)));
p.part("fill-valve-8", finishPart("fill-valve-8", cylinderPart(-180.00110307543616, -311.76850849889604, 450, 230, 27, 8)));
p.part("fill-valve-9", finishPart("fill-valve-9", cylinderPart(-0.0014329384882485001, -359.99999999714817, 450, 230, 27, 8)));
p.part("fill-valve-10", finishPart("fill-valve-10", cylinderPart(179.99862115253634, -311.7699414362868, 450, 230, 27, 8)));
p.part("fill-valve-11", finishPart("fill-valve-11", cylinderPart(311.76826967407675, -180.00151672814357, 450, 230, 27, 8)));
p.part("leg-0", finishPart("leg-0", boxPart(-350, 0, 0, 55, 55, 250)));
p.part("leg-1", finishPart("leg-1", boxPart(-120, 0, 0, 55, 55, 250)));
p.part("leg-2", finishPart("leg-2", boxPart(110, 0, 0, 55, 55, 250)));
p.part("leg-3", finishPart("leg-3", boxPart(340, 0, 0, 55, 55, 250)));

for (let i = 0; i < 12; i++) {
  const angle = (i * Math.PI) / 6;
  const x = 380 * Math.cos(angle);
  const y = 380 * Math.sin(angle);
  p.part(`bottle-body-${i}`, finishPart(`bottle-body-${i}`, cylinderPart(x, y, 320, 160, 27, 10)));
  p.part(`bottle-neck-${i}`, finishPart(`bottle-neck-${i}`, cylinderPart(x, y, 480, 42, 12, 10)));
  p.part(`bottle-cap-${i}`, finishPart(`bottle-cap-${i}`, cylinderPart(x, y, 522, 14, 15, 10)));
}

return p.model();
