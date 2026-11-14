// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Flash pasteurizer skid: plate heat exchanger and balance tank on a sanitary skid with return and product pumps.
meta({
  name: "flash-pasteurizer",
  license: 'CC0-1.0',
  title: "Flash pasteurizer skid",
  description: "Plate heat exchanger and balance tank on a sanitary skid with return and product pumps. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("flash-pasteurizer");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("skid-base", finishPart("skid-base", boxPart(0, 0, 0, 1450, 780, 55)));
p.part("exchanger-pack", finishPart("exchanger-pack", boxPart(-250, 0, 130, 300, 540, 780)));
p.part("plate-0", finishPart("plate-0", boxPart(-250, 0, 150, 16, 500, 700)));
p.part("plate-1", finishPart("plate-1", boxPart(-224, 0, 150, 16, 500, 700)));
p.part("plate-2", finishPart("plate-2", boxPart(-198, 0, 150, 16, 500, 700)));
p.part("plate-3", finishPart("plate-3", boxPart(-172, 0, 150, 16, 500, 700)));
p.part("plate-4", finishPart("plate-4", boxPart(-146, 0, 150, 16, 500, 700)));
p.part("plate-5", finishPart("plate-5", boxPart(-120, 0, 150, 16, 500, 700)));
p.part("plate-6", finishPart("plate-6", boxPart(-94, 0, 150, 16, 500, 700)));
p.part("plate-7", finishPart("plate-7", boxPart(-68, 0, 150, 16, 500, 700)));
p.part("balance-tank", finishPart("balance-tank", cylinderPart(350, 0, 75, 580, 205, 12)));
p.part("tank-lid", finishPart("tank-lid", cylinderPart(350, 0, 655, 55, 220, 12)));
p.part("product-pump", finishPart("product-pump", cylinderPart(680, -220, 35, 170, 90, 10)));
p.part("pump-motor", finishPart("pump-motor", boxPart(680, -220, 210, 230, 180, 150)));
p.part("control-panel", finishPart("control-panel", boxPart(650, 240, 380, 250, 170, 440)));
p.part("process-pipe-0", finishPart("process-pipe-0", cylinderPart(-250, 360, 300, 220, 35, 10)));
p.part("process-pipe-1", finishPart("process-pipe-1", cylinderPart(-70, 360, 490, 220, 35, 10)));
p.part("process-pipe-2", finishPart("process-pipe-2", cylinderPart(110, 360, 300, 220, 35, 10)));
p.part("process-pipe-3", finishPart("process-pipe-3", cylinderPart(290, 360, 490, 220, 35, 10)));
p.part("process-pipe-4", finishPart("process-pipe-4", cylinderPart(470, 360, 300, 220, 35, 10)));
p.part("upper-header", finishPart("upper-header", boxPart(100, 330, 780, 820, 55, 55)));

return p.model();
