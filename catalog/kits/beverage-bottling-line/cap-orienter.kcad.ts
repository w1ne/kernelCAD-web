// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle-cap orienter: vibratory cap bowl with a guarded spiral track and single-file cap exit.
meta({
  name: "cap-orienter",
  license: 'CC0-1.0',
  title: "Bottle-cap orienter",
  description: "Vibratory cap bowl with a guarded spiral track and single-file cap exit. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("cap-orienter");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("bowl-base", finishPart("bowl-base", cylinderPart(0, 0, 0, 90, 360, 14)));
p.part("bowl-body", finishPart("bowl-body", cylinderPart(0, 0, 90, 170, 390, 14)));
p.part("center-hub", finishPart("center-hub", cylinderPart(0, 0, 260, 230, 95, 10)));
p.part("upper-ring", finishPart("upper-ring", cylinderPart(0, 0, 245, 60, 330, 14)));
p.part("exit-track", finishPart("exit-track", boxPart(435, 0, 240, 410, 105, 52)));
p.part("guide-front", finishPart("guide-front", boxPart(435, -58, 270, 410, 18, 78)));
p.part("guide-back", finishPart("guide-back", boxPart(435, 58, 270, 410, 18, 78)));
p.part("drive-box", finishPart("drive-box", boxPart(-230, 0, 30, 220, 180, 180)));
p.part("track-tab-0", finishPart("track-tab-0", boxPart(-110, -250, 210, 65, 35, 18)));
p.part("track-tab-1", finishPart("track-tab-1", boxPart(-40, -250, 228, 65, 35, 18)));
p.part("track-tab-2", finishPart("track-tab-2", boxPart(30, -250, 246, 65, 35, 18)));
p.part("track-tab-3", finishPart("track-tab-3", boxPart(100, -250, 264, 65, 35, 18)));
p.part("track-tab-4", finishPart("track-tab-4", boxPart(170, -250, 282, 65, 35, 18)));

return p.model();
