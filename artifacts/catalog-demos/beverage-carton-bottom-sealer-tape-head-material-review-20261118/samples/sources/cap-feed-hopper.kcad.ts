// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle-cap feed hopper: covered hopper and metering throat that supplies plastic closures to an orienter.
meta({
  name: "cap-feed-hopper",
  license: 'CC0-1.0',
  title: "Bottle-cap feed hopper",
  description: "Covered hopper and metering throat that supplies plastic closures to an orienter. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("cap-feed-hopper");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("stand", finishPart("stand", boxPart(0, 0, 20, 600, 470, 50)));
p.part("hopper", finishPart("hopper", boxPart(0, 0, 250, 520, 440, 410)));
p.part("throat", finishPart("throat", boxPart(0, 0, 90, 260, 260, 160)));
p.part("lid", finishPart("lid", boxPart(0, 0, 470, 560, 480, 50)));
p.part("inspection-door", finishPart("inspection-door", boxPart(0, -225, 300, 240, 24, 190)));
p.part("vibrator-motor", finishPart("vibrator-motor", cylinderPart(0, 0, 45, 85, 95, 10)));
p.part("leg-0", finishPart("leg-0", boxPart(-240, -175, 0, 55, 55, 220)));
p.part("leg-1", finishPart("leg-1", boxPart(240, -175, 0, 55, 55, 220)));
p.part("leg-2", finishPart("leg-2", boxPart(-240, 175, 0, 55, 55, 220)));
p.part("leg-3", finishPart("leg-3", boxPart(240, 175, 0, 55, 55, 220)));

return p.model();
