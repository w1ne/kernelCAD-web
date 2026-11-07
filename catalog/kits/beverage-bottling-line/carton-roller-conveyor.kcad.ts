// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Carton roller conveyor: wide gravity roller conveyor transfers sealed cartons between packing stations.
meta({
  name: "carton-roller-conveyor",
  license: 'CC0-1.0',
  title: "Carton roller conveyor",
  description: "Wide gravity roller conveyor transfers sealed cartons between packing stations. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and safety paint.",
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
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety paint' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    safetyPaint: '#f0b336',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    safetyPaint: '#bd7b24',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("carton-roller-conveyor");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/operator|stop|emergency|beacon|signal|status|warning|access/i.test(component)) return shape.color(safetyPaint);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("side-frame-front", finishPart("side-frame-front", boxPart(0, -270, 360, 1650, 45, 80)));
p.part("side-frame-back", finishPart("side-frame-back", boxPart(0, 270, 360, 1650, 45, 80)));
p.part("roller-0", finishPart("roller-0", xCylinderPart(-720, 0, 420, 520, 30, 8)));
p.part("roller-1", finishPart("roller-1", xCylinderPart(-600, 0, 420, 520, 30, 8)));
p.part("roller-2", finishPart("roller-2", xCylinderPart(-480, 0, 420, 520, 30, 8)));
p.part("roller-3", finishPart("roller-3", xCylinderPart(-360, 0, 420, 520, 30, 8)));
p.part("roller-4", finishPart("roller-4", xCylinderPart(-240, 0, 420, 520, 30, 8)));
p.part("roller-5", finishPart("roller-5", xCylinderPart(-120, 0, 420, 520, 30, 8)));
p.part("roller-6", finishPart("roller-6", xCylinderPart(0, 0, 420, 520, 30, 8)));
p.part("roller-7", finishPart("roller-7", xCylinderPart(120, 0, 420, 520, 30, 8)));
p.part("roller-8", finishPart("roller-8", xCylinderPart(240, 0, 420, 520, 30, 8)));
p.part("roller-9", finishPart("roller-9", xCylinderPart(360, 0, 420, 520, 30, 8)));
p.part("roller-10", finishPart("roller-10", xCylinderPart(480, 0, 420, 520, 30, 8)));
p.part("roller-11", finishPart("roller-11", xCylinderPart(600, 0, 420, 520, 30, 8)));
p.part("roller-12", finishPart("roller-12", xCylinderPart(720, 0, 420, 520, 30, 8)));
p.part("leg-0", finishPart("leg-0", boxPart(-600, 0, 0, 65, 65, 340)));
p.part("leg-1", finishPart("leg-1", boxPart(-200, 0, 0, 65, 65, 340)));
p.part("leg-2", finishPart("leg-2", boxPart(200, 0, 0, 65, 65, 340)));
p.part("leg-3", finishPart("leg-3", boxPart(600, 0, 0, 65, 65, 340)));
p.part("crossbar-0", finishPart("crossbar-0", boxPart(-600, 0, 300, 560, 45, 38)));
p.part("crossbar-1", finishPart("crossbar-1", boxPart(-200, 0, 300, 560, 45, 38)));
p.part("crossbar-2", finishPart("crossbar-2", boxPart(200, 0, 300, 560, 45, 38)));
p.part("crossbar-3", finishPart("crossbar-3", boxPart(600, 0, 300, 560, 45, 38)));
p.part("end-stop", finishPart("end-stop", boxPart(830, 0, 390, 50, 520, 105)));

return p.model();
