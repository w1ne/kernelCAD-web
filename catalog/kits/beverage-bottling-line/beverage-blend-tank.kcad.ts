// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Beverage blend tank: agitated blend tank with jacket band, manway, sight glass, and sanitary outlet.
meta({
  name: "beverage-blend-tank",
  license: 'CC0-1.0',
  title: "Beverage blend tank",
  description: "Agitated blend tank with jacket band, manway, sight glass, and sanitary outlet. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and glass tint.",
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
const glass = param('glass', '#58acc1', { label: 'Glass tint' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    glass: '#7ac4d2',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    glass: '#4a8795',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);
const paddlePart = (z:number,w:number,d:number,h:number,angle:number) => box(w,d,h,true).rotateZ(angle).translate(0,0,z+h/2).scale(scale);

const p = assembly("beverage-blend-tank");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/sight-glass|glass|viewport|window|lens/i.test(component)) return shape.color(glass);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("vessel-shell", finishPart("vessel-shell", cylinderPart(0, 0, 280, 1050, 390, 14)));
p.part("top-head", finishPart("top-head", cylinderPart(0, 0, 1330, 110, 360, 14)));
p.part("bottom-head", finishPart("bottom-head", cylinderPart(0, 0, 200, 80, 350, 14)));
p.part("jacket-band", finishPart("jacket-band", cylinderPart(0, 0, 650, 430, 415, 14)));
p.part("manway", finishPart("manway", cylinderPart(0, -410, 1200, 70, 145, 12)));
p.part("agitator-drive", finishPart("agitator-drive", cylinderPart(0, 0, 1440, 250, 145, 12)));
p.part("shaft", finishPart("shaft", cylinderPart(0, 0, 500, 810, 32, 8)));
p.part("impeller-a", finishPart("impeller-a", paddlePart(740, 430, 35, 28, 28)));
p.part("impeller-b", finishPart("impeller-b", paddlePart(1020, 330, 35, 28, -28)));
p.part("outlet", finishPart("outlet", cylinderPart(0, -425, 285, 150, 50, 10)));
p.part("leg-0", finishPart("leg-0", boxPart(230.0, 0.0, 0, 75, 75, 280)));
p.part("leg-1", finishPart("leg-1", boxPart(0.00030516282623583256, 229.99999999979755, 0, 75, 75, 280)));
p.part("leg-2", finishPart("leg-2", boxPart(-229.99999999919024, 0.0006103256524711279, 0, 75, 75, 280)));
p.part("leg-3", finishPart("leg-3", boxPart(-0.0009154884788074894, -229.999999998178, 0, 75, 75, 280)));
p.part("sight-glass", finishPart("sight-glass", cylinderPart(0, -425, 570, 430, 32, 10)));
p.part("sight-clamp-lower", finishPart("sight-clamp-lower", boxPart(-45, -445, 625, 90, 20, 28)));
p.part("sight-clamp-upper", finishPart("sight-clamp-upper", boxPart(-45, -445, 915, 90, 20, 28)));

return p.model();
