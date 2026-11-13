// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Packed-case checkweigher: short in-line weigh belt with isolated weigh section, reject output, and status tower.
meta({
  name: "case-checkweigher",
  license: 'CC0-1.0',
  title: "Packed-case checkweigher",
  description: "Short in-line weigh belt with isolated weigh section, reject output, and status tower. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and safety paint.",
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
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("case-checkweigher");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/operator|stop|emergency|beacon|signal|status|warning|access/i.test(component)) return shape.color(safetyPaint);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("left-bed", finishPart("left-bed", boxPart(-330, 0, 290, 580, 620, 55)));
p.part("weigh-bed", finishPart("weigh-bed", boxPart(0, 0, 265, 440, 620, 70)));
p.part("right-bed", finishPart("right-bed", boxPart(330, 0, 290, 580, 620, 55)));
p.part("frame-front", finishPart("frame-front", boxPart(0, -320, 220, 1260, 45, 75)));
p.part("frame-back", finishPart("frame-back", boxPart(0, 320, 220, 1260, 45, 75)));
p.part("load-cell-0", finishPart("load-cell-0", boxPart(-150, -230, 120, 90, 90, 150)));
p.part("load-cell-1", finishPart("load-cell-1", boxPart(150, -230, 120, 90, 90, 150)));
p.part("load-cell-2", finishPart("load-cell-2", boxPart(-150, 230, 120, 90, 90, 150)));
p.part("load-cell-3", finishPart("load-cell-3", boxPart(150, 230, 120, 90, 90, 150)));
p.part("hmi-post", finishPart("hmi-post", boxPart(420, -390, 65, 55, 55, 620)));
p.part("hmi", finishPart("hmi", boxPart(420, -420, 595, 180, 45, 130)));
p.part("status-lamp", finishPart("status-lamp", cylinderPart(420, -390, 700, 80, 38, 8)));
p.part("leg-0", finishPart("leg-0", boxPart(-430, 0, 0, 55, 55, 210)));
p.part("leg-1", finishPart("leg-1", boxPart(0, 0, 0, 55, 55, 210)));
p.part("leg-2", finishPart("leg-2", boxPart(430, 0, 0, 55, 55, 210)));

return p.model();
