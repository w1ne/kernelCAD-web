// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// PET stretch blow molder: guarded stretch-blow station with preform heating bays and paired bottle mold nests.
meta({
  name: "pet-blow-molder",
  license: 'CC0-1.0',
  title: "PET stretch blow molder",
  description: "Guarded stretch-blow station with preform heating bays and paired bottle mold nests. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("pet-blow-molder");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1350, 720, 50)));
p.part("machine-body", finishPart("machine-body", boxPart(0, 0, 540, 1150, 620, 970)));
p.part("service-door-left", finishPart("service-door-left", boxPart(-370, -325, 520, 380, 28, 780)));
p.part("service-door-right", finishPart("service-door-right", boxPart(50, -325, 520, 380, 28, 780)));
p.part("heating-tunnel", finishPart("heating-tunnel", boxPart(450, 80, 610, 300, 380, 600)));
p.part("control-pedestal", finishPart("control-pedestal", boxPart(750, -250, 390, 180, 140, 680)));
p.part("mold-column-0", finishPart("mold-column-0", cylinderPart(-370, 0, 70, 800, 34, 8)));
p.part("mold-column-1", finishPart("mold-column-1", cylinderPart(-185, 0, 70, 800, 34, 8)));
p.part("mold-column-2", finishPart("mold-column-2", cylinderPart(0, 0, 70, 800, 34, 8)));
p.part("mold-column-3", finishPart("mold-column-3", cylinderPart(185, 0, 70, 800, 34, 8)));
p.part("mold-column-4", finishPart("mold-column-4", cylinderPart(370, 0, 70, 800, 34, 8)));
p.part("mold-station-0", finishPart("mold-station-0", boxPart(-370, 270, 180, 105, 125, 350)));
p.part("mold-station-1", finishPart("mold-station-1", boxPart(-185, 270, 180, 105, 125, 350)));
p.part("mold-station-2", finishPart("mold-station-2", boxPart(0, 270, 180, 105, 125, 350)));
p.part("mold-station-3", finishPart("mold-station-3", boxPart(185, 270, 180, 105, 125, 350)));
p.part("mold-station-4", finishPart("mold-station-4", boxPart(370, 270, 180, 105, 125, 350)));
p.part("top-crossbeam", finishPart("top-crossbeam", boxPart(0, 0, 1050, 1260, 80, 65)));

return p.model();
