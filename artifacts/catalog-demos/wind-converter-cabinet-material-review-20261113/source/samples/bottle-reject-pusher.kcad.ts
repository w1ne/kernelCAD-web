// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle reject pusher: side-mounted pneumatic pusher diverts a failed bottle into a padded reject chute.
meta({
  name: "bottle-reject-pusher",
  license: 'CC0-1.0',
  title: "Bottle reject pusher",
  description: "Side-mounted pneumatic pusher diverts a failed bottle into a padded reject chute. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("bottle-reject-pusher");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("conveyor-bed", finishPart("conveyor-bed", boxPart(0, 0, 330, 950, 280, 50)));
p.part("side-frame", finishPart("side-frame", boxPart(0, -165, 290, 950, 38, 65)));
p.part("pneumatic-cylinder", finishPart("pneumatic-cylinder", boxPart(0, 250, 520, 340, 115, 130)));
p.part("piston-rod", finishPart("piston-rod", xCylinderPart(0, 145, 525, 260, 26, 8)));
p.part("pusher-pad", finishPart("pusher-pad", boxPart(0, 10, 505, 170, 225, 110)));
p.part("reject-chute", finishPart("reject-chute", boxPart(0, 520, 185, 700, 210, 45)));
p.part("leg-0", finishPart("leg-0", boxPart(-340, 0, 0, 52, 52, 285)));
p.part("leg-1", finishPart("leg-1", boxPart(0, 0, 0, 52, 52, 285)));
p.part("leg-2", finishPart("leg-2", boxPart(340, 0, 0, 52, 52, 285)));
p.part("valve-block", finishPart("valve-block", boxPart(-230, 250, 490, 150, 120, 120)));

return p.model();
