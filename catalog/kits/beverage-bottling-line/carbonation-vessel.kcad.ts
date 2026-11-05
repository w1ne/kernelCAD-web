// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Beverage carbonation vessel: insulated pressure vessel with manway, sample valve, pressure gauge, and base ring.
meta({
  name: "carbonation-vessel",
  license: 'CC0-1.0',
  title: "Beverage carbonation vessel",
  description: "Insulated pressure vessel with manway, sample valve, pressure gauge, and base ring. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and food-grade polymer.",
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

const p = assembly("carbonation-vessel");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("shell", finishPart("shell", cylinderPart(0, 0, 70, 1260, 360, 14)));
p.part("top-cap", finishPart("top-cap", cylinderPart(0, 0, 1330, 100, 330, 14)));
p.part("bottom-cap", finishPart("bottom-cap", cylinderPart(0, 0, 0, 80, 330, 14)));
p.part("insulation-jacket", finishPart("insulation-jacket", cylinderPart(0, 0, 500, 480, 378, 14)));
p.part("top-nozzle", finishPart("top-nozzle", cylinderPart(0, 0, 1430, 120, 58, 10)));
p.part("carbon-dioxide-port", finishPart("carbon-dioxide-port", cylinderPart(0, -380, 1130, 140, 42, 10)));
p.part("sample-valve", finishPart("sample-valve", cylinderPart(0, 380, 370, 140, 35, 10)));
p.part("pressure-gauge", finishPart("pressure-gauge", cylinderPart(130, -400, 1220, 50, 55, 10)));
p.part("leg-0", finishPart("leg-0", boxPart(-210, -210, 0, 80, 80, 250)));
p.part("leg-1", finishPart("leg-1", boxPart(210, -210, 0, 80, 80, 250)));
p.part("leg-2", finishPart("leg-2", boxPart(-210, 210, 0, 80, 80, 250)));
p.part("leg-3", finishPart("leg-3", boxPart(210, 210, 0, 80, 80, 250)));
p.part("nameplate", finishPart("nameplate", boxPart(0, -382, 770, 190, 22, 120)));

return p.model();
