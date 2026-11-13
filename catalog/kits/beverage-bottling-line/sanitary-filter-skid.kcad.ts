// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Sanitary cartridge filter skid: twin stainless cartridge housings with vent, drain, and sanitary pipe headers.
meta({
  name: "sanitary-filter-skid",
  license: 'CC0-1.0',
  title: "Sanitary cartridge filter skid",
  description: "Twin stainless cartridge housings with vent, drain, and sanitary pipe headers. Knobs: overall scale and color controls for stainless steel and powder-coated steel.",
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

const p = assembly("sanitary-filter-skid");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  // Cartridge housings are sanitary stainless pressure parts; only the skid frame is powder coated.
  if (/base|leg|foot|frame|support|stand|control|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("skid", finishPart("skid", boxPart(0, 0, 20, 1050, 650, 50)));
p.part("filter-housing-0", finishPart("filter-housing-0", cylinderPart(-250, 0, 200, 720, 170, 12)));
p.part("filter-housing-1", finishPart("filter-housing-1", cylinderPart(250, 0, 200, 720, 170, 12)));
p.part("filter-lid-0", finishPart("filter-lid-0", cylinderPart(-250, 0, 920, 55, 188, 12)));
p.part("filter-lid-1", finishPart("filter-lid-1", cylinderPart(250, 0, 920, 55, 188, 12)));
p.part("inlet-header", finishPart("inlet-header", cylinderPart(0, -260, 300, 1020, 40, 10)));
p.part("outlet-header", finishPart("outlet-header", cylinderPart(0, 260, 700, 1020, 40, 10)));
p.part("branch-0", finishPart("branch-0", boxPart(-250, 0, 320, 42, 300, 400)));
p.part("branch-1", finishPart("branch-1", boxPart(250, 0, 320, 42, 300, 400)));
p.part("skid-foot-0", finishPart("skid-foot-0", boxPart(-400, -250, 0, 65, 65, 210)));
p.part("skid-foot-1", finishPart("skid-foot-1", boxPart(400, -250, 0, 65, 65, 210)));
p.part("skid-foot-2", finishPart("skid-foot-2", boxPart(-400, 250, 0, 65, 65, 210)));
p.part("skid-foot-3", finishPart("skid-foot-3", boxPart(400, 250, 0, 65, 65, 210)));
p.part("vent-manifold", finishPart("vent-manifold", boxPart(0, 0, 990, 800, 45, 42)));

return p.model();
