// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle bundle shrink wrapper: film-feed frame gathers multipacks and wraps them before the shrink tunnel.
meta({
  name: "shrink-bundle-wrapper",
  license: 'CC0-1.0',
  title: "Bottle bundle shrink wrapper",
  description: "Film-feed frame gathers multipacks and wraps them before the shrink tunnel. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateY(90).translate(x-length/2,y,z).scale(scale);

const p = assembly("shrink-bundle-wrapper");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1330, 780, 55)));
p.part("product-bed", finishPart("product-bed", boxPart(0, 0, 300, 1300, 390, 50)));
p.part("portal-left", finishPart("portal-left", boxPart(-450, 0, 70, 60, 60, 760)));
p.part("portal-right", finishPart("portal-right", boxPart(450, 0, 70, 60, 60, 760)));
p.part("portal-top", finishPart("portal-top", boxPart(0, 0, 830, 960, 70, 55)));
p.part("film-reel", finishPart("film-reel", cylinderPart(-250, 220, 580, 55, 145, 12)));
p.part("film-roller-a", finishPart("film-roller-a", xCylinderPart(-50, 190, 570, 360, 38, 10)));
p.part("film-roller-b", finishPart("film-roller-b", xCylinderPart(230, 190, 390, 360, 38, 10)));
p.part("film-cut-bar", finishPart("film-cut-bar", boxPart(160, 0, 510, 55, 540, 45)));
p.part("control-pod", finishPart("control-pod", boxPart(560, -250, 460, 180, 150, 280)));
p.part("leg-0", finishPart("leg-0", boxPart(-390, 0, 0, 52, 52, 290)));
p.part("leg-1", finishPart("leg-1", boxPart(-130, 0, 0, 52, 52, 290)));
p.part("leg-2", finishPart("leg-2", boxPart(130, 0, 0, 52, 52, 290)));
p.part("leg-3", finishPart("leg-3", boxPart(390, 0, 0, 52, 52, 290)));

return p.model();
