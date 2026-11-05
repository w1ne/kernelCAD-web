// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle vision inspection arch: inspection portal with overhead camera, backlights, side cameras, and a guarded conveyor gap.
meta({
  name: "vision-inspection-arch",
  license: 'CC0-1.0',
  title: "Bottle vision inspection arch",
  description: "Inspection portal with overhead camera, backlights, side cameras, and a guarded conveyor gap. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("vision-inspection-arch");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base-left", finishPart("base-left", boxPart(-420, 0, 0, 250, 600, 55)));
p.part("base-right", finishPart("base-right", boxPart(420, 0, 0, 250, 600, 55)));
p.part("column-left", finishPart("column-left", boxPart(-420, 0, 75, 60, 60, 820)));
p.part("column-right", finishPart("column-right", boxPart(420, 0, 75, 60, 60, 820)));
p.part("camera-beam", finishPart("camera-beam", boxPart(0, 0, 895, 920, 80, 70)));
p.part("top-camera", finishPart("top-camera", boxPart(0, -100, 750, 190, 170, 150)));
p.part("side-camera-0", finishPart("side-camera-0", boxPart(-390, -100, 490, 150, 140, 120)));
p.part("side-camera-1", finishPart("side-camera-1", boxPart(390, -100, 490, 150, 140, 120)));
p.part("backlight", finishPart("backlight", boxPart(0, 235, 500, 600, 40, 330)));
p.part("reject-sensor", finishPart("reject-sensor", boxPart(330, -150, 360, 85, 75, 85)));
p.part("conveyor-left", finishPart("conveyor-left", boxPart(-650, 0, 260, 400, 270, 45)));
p.part("conveyor-right", finishPart("conveyor-right", boxPart(650, 0, 260, 400, 270, 45)));

return p.model();
