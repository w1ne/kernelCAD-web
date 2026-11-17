// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Empty bottle divider tray: washable compartment tray spaces glass bottles for returnable-container handling.
// The floor, rim and feet are one injection-moulded polymer shell; the divider grid is a separate
// polymer insert that lifts out for washing. Nothing on it is steel.
meta({
  name: "empty-bottle-divider-tray",
  license: 'CC0-1.0',
  title: "Empty bottle divider tray",
  description: "Washable compartment tray spaces glass bottles for returnable-container handling. Knobs: overall scale and color controls for the food-grade polymer tray shell and the divider insert polymer.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'item',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer' });
const dividerPolymer = param('dividerPolymer', '#e6e1d3', { label: 'Divider insert polymer' });

presets({
  sanitaryLine: {
    foodPolymer: '#2c828c',
    dividerPolymer: '#f1ede2',
  },
  legacyPlant: {
    foodPolymer: '#286c75',
    dividerPolymer: '#b9b2a0',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("empty-bottle-divider-tray");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  if (/divider/i.test(name)) return shape.color(dividerPolymer);
  return shape.color(foodPolymer);
};
p.part("tray-floor", finishPart("tray-floor", boxPart(0, 0, 20, 760, 560, 40)));
p.part("rim-front", finishPart("rim-front", boxPart(0, -270, 60, 760, 35, 80)));
p.part("rim-back", finishPart("rim-back", boxPart(0, 270, 60, 760, 35, 80)));
p.part("rim-left", finishPart("rim-left", boxPart(-365, 0, 60, 35, 505, 80)));
p.part("rim-right", finishPart("rim-right", boxPart(365, 0, 60, 35, 505, 80)));
p.part("divider-x-0", finishPart("divider-x-0", boxPart(-240, 0, 60, 20, 500, 55)));
p.part("divider-x-1", finishPart("divider-x-1", boxPart(-80, 0, 60, 20, 500, 55)));
p.part("divider-x-2", finishPart("divider-x-2", boxPart(80, 0, 60, 20, 500, 55)));
p.part("divider-x-3", finishPart("divider-x-3", boxPart(240, 0, 60, 20, 500, 55)));
p.part("divider-y-0", finishPart("divider-y-0", boxPart(0, -180, 60, 730, 18, 55)));
p.part("divider-y-1", finishPart("divider-y-1", boxPart(0, -60, 60, 730, 18, 55)));
p.part("divider-y-2", finishPart("divider-y-2", boxPart(0, 60, 60, 730, 18, 55)));
p.part("foot-0", finishPart("foot-0", boxPart(-300, -200, 0, 70, 70, 25)));
p.part("foot-1", finishPart("foot-1", boxPart(300, -200, 0, 70, 70, 25)));
p.part("foot-2", finishPart("foot-2", boxPart(-300, 200, 0, 70, 70, 25)));
p.part("foot-3", finishPart("foot-3", boxPart(300, 200, 0, 70, 70, 25)));

return p.model();
