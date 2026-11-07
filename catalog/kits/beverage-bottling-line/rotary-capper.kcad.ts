// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Rotary bottle capper: capping turret with torque-head ring, bottle table, cap-feed hood, and guarded discharge.
meta({
  name: "rotary-capper",
  license: 'CC0-1.0',
  title: "Rotary bottle capper",
  description: "Capping turret with torque-head ring, bottle table, cap-feed hood, and guarded discharge. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("rotary-capper");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-skirt", finishPart("base-skirt", cylinderPart(0, 0, 0, 160, 490, 16)));
p.part("bottle-table", finishPart("bottle-table", cylinderPart(0, 0, 160, 130, 390, 16)));
p.part("turret-column", finishPart("turret-column", cylinderPart(0, 0, 290, 710, 145, 12)));
p.part("top-plate", finishPart("top-plate", cylinderPart(0, 0, 1000, 75, 310, 12)));
p.part("cap-feed-hood", finishPart("cap-feed-hood", boxPart(0, 360, 800, 620, 240, 260)));
p.part("infeed-deck", finishPart("infeed-deck", boxPart(-510, 0, 235, 390, 210, 50)));
p.part("outfeed-deck", finishPart("outfeed-deck", boxPart(510, 0, 235, 390, 210, 50)));
p.part("front-guard", finishPart("front-guard", boxPart(0, -510, 250, 950, 32, 500)));
p.part("capper-head-0", finishPart("capper-head-0", cylinderPart(330.0, 0.0, 730, 190, 34, 8)));
p.part("capper-head-1", finishPart("capper-head-1", cylinderPart(233.34539259214466, 233.345082990874, 730, 190, 34, 8)));
p.part("capper-head-2", finishPart("capper-head-2", cylinderPart(0.0004378423159035858, 329.99999999970953, 730, 190, 34, 8)));
p.part("capper-head-3", finishPart("capper-head-3", cylinderPart(-233.3447733891925, 233.3457021930046, 730, 190, 34, 8)));
p.part("capper-head-4", finishPart("capper-head-4", cylinderPart(-329.9999999988382, 0.0008756846318064009, 730, 190, 34, 8)));
p.part("capper-head-5", finishPart("capper-head-5", cylinderPart(-233.3460117934536, -233.34446378710038, 730, 190, 34, 8)));
p.part("capper-head-6", finishPart("capper-head-6", cylinderPart(-0.0013135269478542241, -329.9999999973858, 730, 190, 34, 8)));
p.part("capper-head-7", finishPart("capper-head-7", cylinderPart(233.3441541845973, -233.34632139349205, 730, 190, 34, 8)));
p.part("leg-0", finishPart("leg-0", boxPart(-330, 0, 0, 48, 48, 230)));
p.part("leg-1", finishPart("leg-1", boxPart(-110, 0, 0, 48, 48, 230)));
p.part("leg-2", finishPart("leg-2", boxPart(110, 0, 0, 48, 48, 230)));
p.part("leg-3", finishPart("leg-3", boxPart(330, 0, 0, 48, 48, 230)));

return p.model();
