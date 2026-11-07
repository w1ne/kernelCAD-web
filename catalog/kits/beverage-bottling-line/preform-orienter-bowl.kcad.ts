// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Preform orienter bowl: vibratory bowl with a spiral rim track, central cone, and single-file discharge rail.
meta({
  name: "preform-orienter-bowl",
  license: 'CC0-1.0',
  title: "Preform orienter bowl",
  description: "Vibratory bowl with a spiral rim track, central cone, and single-file discharge rail. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("preform-orienter-bowl");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("bowl-skirt", finishPart("bowl-skirt", cylinderPart(0, 0, 0, 170, 390, 14)));
p.part("bowl-rim", finishPart("bowl-rim", cylinderPart(0, 0, 145, 70, 420, 14)));
p.part("central-cone", finishPart("central-cone", cylinderPart(0, 0, 165, 220, 210, 10)));
p.part("vibrator-base", finishPart("vibrator-base", cylinderPart(0, 0, 0, 70, 260, 12)));
p.part("discharge-track", finishPart("discharge-track", boxPart(470, 0, 175, 440, 110, 55)));
p.part("track-side-a", finishPart("track-side-a", boxPart(470, -65, 205, 440, 18, 75)));
p.part("track-side-b", finishPart("track-side-b", boxPart(470, 65, 205, 440, 18, 75)));
p.part("motor-box", finishPart("motor-box", boxPart(-210, 0, 60, 190, 180, 170)));

return p.model();
