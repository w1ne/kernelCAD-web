// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Rinse-water recovery tank: small recovery tank with screened inlet, pump stand, level column, and return nozzle.
meta({
  name: "rinse-water-recovery-tank",
  license: 'CC0-1.0',
  title: "Rinse-water recovery tank",
  description: "Small recovery tank with screened inlet, pump stand, level column, and return nozzle. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("rinse-water-recovery-tank");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("tank-shell", finishPart("tank-shell", cylinderPart(0, 0, 30, 620, 285, 12)));
p.part("cover", finishPart("cover", cylinderPart(0, 0, 650, 65, 310, 12)));
p.part("inlet-screen", finishPart("inlet-screen", cylinderPart(-330, 0, 370, 150, 70, 10)));
p.part("return-nozzle", finishPart("return-nozzle", cylinderPart(0, 330, 520, 170, 45, 10)));
p.part("pump", finishPart("pump", cylinderPart(250, -220, 25, 160, 92, 10)));
p.part("pump-motor", finishPart("pump-motor", boxPart(250, -220, 185, 190, 160, 130)));
p.part("support-a", finishPart("support-a", boxPart(-170, 0, 0, 60, 60, 30)));
p.part("support-b", finishPart("support-b", boxPart(170, 0, 0, 60, 60, 30)));
p.part("level-column", finishPart("level-column", boxPart(-210, -310, 130, 42, 28, 410)));

return p.model();
