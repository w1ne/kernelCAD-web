// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "entrance-feeder",
  license: 'CC0-1.0',
  title: "Hive entrance feeder",
  description: "Small front-mounted feeder tray with clear-look reservoir and landing ledge. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a48a5f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("entrance-feeder");
p.part("tray",b(0,0,0,300,180,60).color(color));
p.part("front-lip",b(0,-100,60,340,25,80).color(color));
p.part("reservoir",c(0,40,60,250,55,8).color(color));
p.part("reservoir-cap",c(0,40,310,30,65,8).color(color));
p.part("mount-left",b(-120,100,60,45,100,100).color(color));
p.part("mount-right",b(120,100,60,45,100,100).color(color));

return p.model();
