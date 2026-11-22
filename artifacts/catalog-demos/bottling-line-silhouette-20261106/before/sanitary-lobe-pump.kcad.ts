// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Sanitary rotary-lobe pump: low-shear lobe pump with polished casing, motor, coupling guard, and cleanable feet.
meta({
  name: "sanitary-lobe-pump",
  license: 'CC0-1.0',
  title: "Sanitary rotary-lobe pump",
  description: "Low-shear lobe pump with polished casing, motor, coupling guard, and cleanable feet. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("sanitary-lobe-pump");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 660, 430, 50)));
p.part("pump-casing", finishPart("pump-casing", cylinderPart(-130, 0, 80, 255, 160, 12)));
p.part("front-cover", finishPart("front-cover", cylinderPart(-130, -185, 215, 50, 155, 12)));
p.part("inlet", finishPart("inlet", cylinderPart(-130, 0, 330, 115, 62, 10)));
p.part("outlet", finishPart("outlet", cylinderPart(-130, 190, 205, 115, 62, 10)));
p.part("gearbox", finishPart("gearbox", boxPart(120, 0, 95, 240, 250, 200)));
p.part("motor", finishPart("motor", boxPart(350, 0, 110, 320, 280, 230)));
p.part("coupling-guard", finishPart("coupling-guard", xCylinderPart(65, 0, 200, 185, 72, 10)));
p.part("foot-0", finishPart("foot-0", boxPart(-260, -145, 0, 75, 75, 95)));
p.part("foot-1", finishPart("foot-1", boxPart(260, -145, 0, 75, 75, 95)));
p.part("foot-2", finishPart("foot-2", boxPart(-260, 145, 0, 75, 75, 95)));
p.part("foot-3", finishPart("foot-3", boxPart(260, 145, 0, 75, 75, 95)));

return p.model();
