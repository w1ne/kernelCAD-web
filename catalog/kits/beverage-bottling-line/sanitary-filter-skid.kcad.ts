// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "sanitary-filter-skid",
  license: 'CC0-1.0',
  title: "Sanitary cartridge filter skid",
  description: "Twin stainless cartridge housings with vent, drain, and sanitary pipe headers. Knobs: overall scale, equipment color, and safety accent.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const body = param('body', '#a6b3b4', { label: 'Equipment color' });
const accent = param('accent', '#e3a23d', { label: 'Safety accent' });
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);

const p = assembly("sanitary-filter-skid");
p.part("skid", boxPart(0, 0, 20, 1050, 650, 50, accent));
p.part("filter-housing-0", cylinderPart(-250, 0, 200, 720, 170, 12, body));
p.part("filter-housing-1", cylinderPart(250, 0, 200, 720, 170, 12, body));
p.part("filter-lid-0", cylinderPart(-250, 0, 920, 55, 188, 12, accent));
p.part("filter-lid-1", cylinderPart(250, 0, 920, 55, 188, 12, accent));
p.part("inlet-header", cylinderPart(0, -260, 300, 1020, 40, 10, body));
p.part("outlet-header", cylinderPart(0, 260, 700, 1020, 40, 10, body));
p.part("branch-0", boxPart(-250, 0, 320, 42, 300, 400, body));
p.part("branch-1", boxPart(250, 0, 320, 42, 300, 400, body));
p.part("skid-foot-0", boxPart(-400, -250, 0, 65, 65, 210, body));
p.part("skid-foot-1", boxPart(400, -250, 0, 65, 65, 210, body));
p.part("skid-foot-2", boxPart(-400, 250, 0, 65, 65, 210, body));
p.part("skid-foot-3", boxPart(400, 250, 0, 65, 65, 210, body));
p.part("vent-manifold", boxPart(0, 0, 990, 800, 45, 42, accent));

return p.model();
