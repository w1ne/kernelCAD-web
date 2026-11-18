// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// CIP supply and return skid: compact cleaning-in-place skid with two solution tanks, pump, heat exchanger, and pipe loop.
meta({
  name: "cip-supply-return-skid",
  license: 'CC0-1.0',
  title: "CIP supply and return skid",
  description: "Compact cleaning-in-place skid with two solution tanks, pump, heat exchanger, and pipe loop. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("cip-supply-return-skid");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("skid", finishPart("skid", boxPart(0, 0, 0, 1470, 780, 55)));
p.part("cip-tank-0", finishPart("cip-tank-0", cylinderPart(-450, 170, 80, 610, 210, 12)));
p.part("cip-tank-1", finishPart("cip-tank-1", cylinderPart(250, 170, 80, 610, 210, 12)));
p.part("cip-lid-0", finishPart("cip-lid-0", cylinderPart(-450, 170, 690, 55, 225, 12)));
p.part("cip-lid-1", finishPart("cip-lid-1", cylinderPart(250, 170, 690, 55, 225, 12)));
p.part("return-pump", finishPart("return-pump", cylinderPart(-10, -230, 50, 180, 96, 10)));
p.part("pump-motor", finishPart("pump-motor", boxPart(-10, -230, 230, 220, 190, 150)));
p.part("plate-exchanger", finishPart("plate-exchanger", boxPart(590, -120, 120, 250, 360, 500)));
p.part("exchanger-plate-0", finishPart("exchanger-plate-0", boxPart(500, -120, 135, 14, 320, 465)));
p.part("exchanger-plate-1", finishPart("exchanger-plate-1", boxPart(525, -120, 135, 14, 320, 465)));
p.part("exchanger-plate-2", finishPart("exchanger-plate-2", boxPart(550, -120, 135, 14, 320, 465)));
p.part("exchanger-plate-3", finishPart("exchanger-plate-3", boxPart(575, -120, 135, 14, 320, 465)));
p.part("exchanger-plate-4", finishPart("exchanger-plate-4", boxPart(600, -120, 135, 14, 320, 465)));
p.part("exchanger-plate-5", finishPart("exchanger-plate-5", boxPart(625, -120, 135, 14, 320, 465)));
p.part("supply-header", finishPart("supply-header", cylinderPart(0, -330, 560, 1100, 42, 10)));
p.part("return-header", finishPart("return-header", cylinderPart(0, -400, 310, 1100, 42, 10)));
p.part("control-cabinet", finishPart("control-cabinet", boxPart(585, 260, 360, 210, 180, 430)));
p.part("valve-0", finishPart("valve-0", cylinderPart(-390, -330, 600, 90, 40, 10)));
p.part("valve-1", finishPart("valve-1", cylinderPart(-180, -330, 600, 90, 40, 10)));
p.part("valve-2", finishPart("valve-2", cylinderPart(30, -330, 600, 90, 40, 10)));
p.part("valve-3", finishPart("valve-3", cylinderPart(240, -330, 600, 90, 40, 10)));
p.part("valve-4", finishPart("valve-4", cylinderPart(450, -330, 600, 90, 40, 10)));

return p.model();
