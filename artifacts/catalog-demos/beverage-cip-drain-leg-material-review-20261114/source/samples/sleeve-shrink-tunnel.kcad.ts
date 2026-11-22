// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle sleeve shrink tunnel: heated tunnel with insulated hood, bottle openings, ventilation fan, and guarded conveyor.
meta({
  name: "sleeve-shrink-tunnel",
  license: 'CC0-1.0',
  title: "Bottle sleeve shrink tunnel",
  description: "Heated tunnel with insulated hood, bottle openings, ventilation fan, and guarded conveyor. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("sleeve-shrink-tunnel");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("conveyor-bed", finishPart("conveyor-bed", boxPart(0, 0, 250, 1450, 300, 65)));
p.part("tunnel-shell", finishPart("tunnel-shell", boxPart(0, 0, 430, 980, 560, 420)));
p.part("roof", finishPart("roof", boxPart(0, 0, 850, 1020, 600, 65)));
p.part("opening-front", finishPart("opening-front", boxPart(-500, 0, 460, 90, 410, 340)));
p.part("opening-back", finishPart("opening-back", boxPart(500, 0, 460, 90, 410, 340)));
p.part("vent-0", finishPart("vent-0", cylinderPart(-250, 180, 915, 105, 65, 10)));
p.part("vent-1", finishPart("vent-1", cylinderPart(0, 180, 915, 105, 65, 10)));
p.part("vent-2", finishPart("vent-2", cylinderPart(250, 180, 915, 105, 65, 10)));
p.part("leg-0", finishPart("leg-0", boxPart(-560, 0, 0, 55, 55, 250)));
p.part("leg-1", finishPart("leg-1", boxPart(-190, 0, 0, 55, 55, 250)));
p.part("leg-2", finishPart("leg-2", boxPart(180, 0, 0, 55, 55, 250)));
p.part("leg-3", finishPart("leg-3", boxPart(550, 0, 0, 55, 55, 250)));
p.part("temperature-panel", finishPart("temperature-panel", boxPart(610, -240, 560, 170, 70, 250)));

return p.model();
