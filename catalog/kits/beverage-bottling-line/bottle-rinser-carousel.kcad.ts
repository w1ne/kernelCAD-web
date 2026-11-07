// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle rinser carousel: rotary bottle rinser with an infeed starwheel, spray turret, and catch basin.
meta({
  name: "bottle-rinser-carousel",
  license: 'CC0-1.0',
  title: "Bottle rinser carousel",
  description: "Rotary bottle rinser with an infeed starwheel, spray turret, and catch basin. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("bottle-rinser-carousel");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("catch-basin", finishPart("catch-basin", cylinderPart(0, 0, 0, 130, 480, 14)));
p.part("rotary-table", finishPart("rotary-table", cylinderPart(0, 0, 130, 90, 370, 16)));
p.part("rinse-turret", finishPart("rinse-turret", cylinderPart(0, 0, 220, 690, 130, 12)));
p.part("top-drive", finishPart("top-drive", cylinderPart(0, 0, 910, 140, 180, 12)));
p.part("infeed-lane", finishPart("infeed-lane", boxPart(-500, 0, 255, 420, 150, 45)));
p.part("outfeed-lane", finishPart("outfeed-lane", boxPart(500, 0, 255, 420, 150, 45)));
p.part("rinse-nozzle-0", finishPart("rinse-nozzle-0", cylinderPart(-330, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-1", finishPart("rinse-nozzle-1", cylinderPart(-220, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-2", finishPart("rinse-nozzle-2", cylinderPart(-110, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-3", finishPart("rinse-nozzle-3", cylinderPart(0, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-4", finishPart("rinse-nozzle-4", cylinderPart(110, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-5", finishPart("rinse-nozzle-5", cylinderPart(220, -220, 570, 135, 22, 8)));
p.part("rinse-nozzle-6", finishPart("rinse-nozzle-6", cylinderPart(330, -220, 570, 135, 22, 8)));
p.part("support-0", finishPart("support-0", boxPart(-300, 0, 0, 55, 55, 430)));
p.part("support-1", finishPart("support-1", boxPart(-100, 0, 0, 55, 55, 430)));
p.part("support-2", finishPart("support-2", boxPart(100, 0, 0, 55, 55, 430)));
p.part("support-3", finishPart("support-3", boxPart(300, 0, 0, 55, 55, 430)));
p.part("spray-guard", finishPart("spray-guard", boxPart(0, 0, 580, 900, 640, 48)));

return p.model();
