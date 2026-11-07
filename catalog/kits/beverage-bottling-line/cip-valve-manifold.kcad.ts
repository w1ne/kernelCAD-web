// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// CIP valve manifold: sanitary valve cluster routes clean-in-place supply and return through color-coded branches.
meta({
  name: "cip-valve-manifold",
  license: 'CC0-1.0',
  title: "CIP valve manifold",
  description: "Sanitary valve cluster routes clean-in-place supply and return through color-coded branches. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("cip-valve-manifold");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("supply-header", finishPart("supply-header", cylinderPart(0, 0, 30, 850, 48, 10)));
p.part("return-header", finishPart("return-header", cylinderPart(0, 260, 30, 850, 48, 10)));
p.part("cross-header", finishPart("cross-header", cylinderPart(0, 130, 30, 850, 35, 10)));
p.part("branch-0", finishPart("branch-0", cylinderPart(-300, 130, 30, 310, 30, 8)));
p.part("branch-1", finishPart("branch-1", cylinderPart(-100, 130, 30, 310, 30, 8)));
p.part("branch-2", finishPart("branch-2", cylinderPart(100, 130, 30, 310, 30, 8)));
p.part("branch-3", finishPart("branch-3", cylinderPart(300, 130, 30, 310, 30, 8)));
p.part("valve-actuator-0", finishPart("valve-actuator-0", boxPart(-300, 130, 360, 110, 105, 95)));
p.part("valve-actuator-1", finishPart("valve-actuator-1", boxPart(-100, 130, 360, 110, 105, 95)));
p.part("valve-actuator-2", finishPart("valve-actuator-2", boxPart(100, 130, 360, 110, 105, 95)));
p.part("valve-actuator-3", finishPart("valve-actuator-3", boxPart(300, 130, 360, 110, 105, 95)));
p.part("mount-foot-0", finishPart("mount-foot-0", boxPart(-360, -90, 0, 70, 70, 30)));
p.part("mount-foot-1", finishPart("mount-foot-1", boxPart(360, -90, 0, 70, 70, 30)));
p.part("mount-foot-2", finishPart("mount-foot-2", boxPart(-360, 350, 0, 70, 70, 30)));
p.part("mount-foot-3", finishPart("mount-foot-3", boxPart(360, 350, 0, 70, 70, 30)));
p.part("drain-leg", finishPart("drain-leg", cylinderPart(0, 130, 0, 90, 42, 8)));

return p.model();
