// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "vertical-turbine-pump",
  license: 'CC0-1.0',
  title: "Vertical turbine pump head",
  description: "Vertical turbine pump head with discharge elbow, column pipe, motor pedestal and support plate. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#606d68", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("vertical-turbine-pump");
p.part("base-plate",b(0,0,0,650,650,50).color(color));
p.part("column",c(0,0,50,740,100,10).color(color));
p.part("discharge-elbow",c(0,0,790,180,130,10).color(color));
p.part("outlet",b(0,-160,855,290,120,120).color(color));
p.part("motor-pedestal",b(0,0,895,270,270,120).color(color));
p.part("motor",c(0,0,1015,320,115,10).color(color));
p.part("coupling-cover",b(0,0,1325,190,185,75).color(color));

return p.model();
